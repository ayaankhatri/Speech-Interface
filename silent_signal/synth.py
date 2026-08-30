"""synthetic captures — fake data/<word>/*.csv in the collect.py format

    python -m silent_signal.synth --reps 40                    # from scratch
    python -m silent_signal.synth --from data --reps 5         # augment real reps
    python -m silent_signal.train --data-dir data_synth        # train on it

Two jobs, one signal contract. `synthesize` invents a capture for a word out of
nothing, so the dataset -> features -> train -> live path can be exercised while
the electrodes are still on the bench. `augment` jitters a capture that was
really recorded, which is the one that raises real accuracy: 30 reps of a word
is a thin training set, and the variation a session cannot cover -- contact
resistance, speaking rate, noise floor -- can be added afterwards.

Both write raw ADC counts, not features. Everything downstream (notch, envelope,
align_window, the 28-dim vector) has to run on synthetic data exactly as it runs
on recorded data, or the fake set stops testing the real front end.

WHAT SYNTHETIC ACCURACY MEANS: nothing about the hardware. `synthesize` draws
each word a burst pattern from a hash of its own name, so the classes are
separable by construction and the score only reports how far this file's own
jitter was turned up -- around 0.74 cross-validated on the eleven core words at
the current settings, with pairs whose hashed patterns happen to land close
(are/how) confusing each other. Only a confusion matrix over recorded captures
says whether the electrodes and the vocabulary work. Synthetic captures are kept
in their own directory for that reason -- out of data/, so the real matrix stays
honest.

SIGNAL MODEL: surface EMG during articulation is broadband noise amplitude-
modulated by muscle activation, so a capture is built as white noise times an
activation envelope, plus a resting noise floor, mains hum at config.MAINS_HZ,
slow baseline wander, and the amplifier's mid-rail DC offset. That is what the
envelope front end expects to find; a smooth analytic bump would sail through
features.py while looking nothing like a signal that filters.notch has to clean.

SESSIONS: electrodes are re-placed between recording sessions and the per-
channel gain moves with them, so reps are generated in session blocks that share
a gain and a hum level. Reps drawn independently would make every class look
gain-stable and teach a classifier to trust absolute amplitude -- the exact
assumption that breaks when the demo is set up on a fresh pair of electrodes.
"""
from __future__ import annotations

import argparse
import hashlib
import sys
from pathlib import Path

import numpy as np

from . import config as cfg
from .collect import save_capture
from .dataset import read_capture

# Amplitude scale, in ADC counts on a 12-bit converter biased to mid-rail.
BASELINE = cfg.ADC_MAX / 2
REST_NOISE = 9.0        # resting sEMG + converter noise, standard deviation
BURST_SD = 300.0        # noise SD at full contraction; peaks run ~3x that
                        # -- high enough to dominate the rest floor, low
                        # enough that a loud rep on a hot channel only
                        # occasionally clips the rail, as a sane gain would
DRIFT_COUNTS = 26.0     # slow electrode/sweat wander over the window
HUM_COUNTS = 14.0       # mains pickup surviving the front end


# Per-word Shape
def word_profile(word: str) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Burst times (s), widths (s) and per-channel gains for one word.

    Seeded from the word itself, so a word means the same articulation in every
    run and on every machine -- augmenting a set later must not redefine what
    "water" looks like. blake2b rather than hash(), which is salted per process.
    """
    seed = int.from_bytes(hashlib.blake2b(word.encode(), digest_size=8).digest(), "big")
    rng = np.random.default_rng(seed)
    n_bursts = int(rng.integers(1, 4))                       # syllable-ish
    starts = np.sort(rng.uniform(0.0, 0.40, n_bursts))       # after articulation onset
    widths = rng.uniform(0.05, 0.16, n_bursts)
    gains = rng.uniform(0.35, 1.0, (n_bursts, cfg.N_CHANNELS))
    gains[rng.integers(0, n_bursts), rng.integers(0, cfg.N_CHANNELS)] = 1.0
    return starts, widths, gains


def _burst(t: np.ndarray, centre: float, width: float) -> np.ndarray:
    """Fast rise, slower relaxation -- muscle does not switch off symmetrically."""
    sigma = np.where(t < centre, width * 0.55, width)
    return np.exp(-0.5 * ((t - centre) / sigma) ** 2)


def activation(word: str, rng: np.random.Generator, n: int) -> np.ndarray:
    """(n, N_CHANNELS) activation envelope in 0..1-ish, one mouthed word."""
    t = np.arange(n) / cfg.SAMPLE_HZ
    starts, widths, gains = word_profile(word)
    onset = rng.uniform(0.25, 0.55)          # where in the window the word lands
    rate = rng.uniform(0.82, 1.25)           # this rep's speaking rate
    env = np.zeros((n, cfg.N_CHANNELS))
    for start, width, gain in zip(starts, widths, gains):
        shape = _burst(t, onset + start * rate, width * rate)
        env += shape[:, None] * gain * rng.uniform(0.85, 1.15, cfg.N_CHANNELS)
    return env


# Interference
def _mains(n: int, rng: np.random.Generator, level: float) -> np.ndarray:
    t = np.arange(n) / cfg.SAMPLE_HZ
    hum = np.zeros((n, cfg.N_CHANNELS))
    for ch in range(cfg.N_CHANNELS):
        phase = rng.uniform(0, 2 * np.pi)
        hum[:, ch] = level * (
            np.sin(2 * np.pi * cfg.MAINS_HZ * t + phase)
            + 0.35 * np.sin(2 * np.pi * 2 * cfg.MAINS_HZ * t + phase)
        )
    return hum


def _drift(n: int, rng: np.random.Generator, counts: float) -> np.ndarray:
    """Sub-hertz wander, as a couple of very slow sinusoids per channel."""
    t = np.arange(n) / cfg.SAMPLE_HZ
    out = np.zeros((n, cfg.N_CHANNELS))
    for ch in range(cfg.N_CHANNELS):
        for f in rng.uniform(0.1, 0.8, 2):
            out[:, ch] += counts * 0.5 * np.sin(2 * np.pi * f * t + rng.uniform(0, 2 * np.pi))
    return out


def quantise(x: np.ndarray) -> np.ndarray:
    """To integer ADC counts, clipped at the rails like the real converter."""
    return np.clip(np.rint(x), 0, cfg.ADC_MAX).astype(np.int64)


# Session
def session_gain(rng: np.random.Generator) -> np.ndarray:
    """Per-channel amplitude multiplier for one electrode placement."""
    return rng.uniform(0.55, 1.5, cfg.N_CHANNELS)


# Generation
def synthesize(
    word: str,
    rng: np.random.Generator,
    gain: np.ndarray | None = None,
    hum: float = HUM_COUNTS,
    n: int = cfg.WINDOW_SAMPLES,
) -> np.ndarray:
    """One invented capture, (n, N_CHANNELS) integer ADC counts."""
    gain = np.ones(cfg.N_CHANNELS) if gain is None else gain
    env = activation(word, rng, n) * gain * BURST_SD * rng.uniform(0.75, 1.3)
    noise_sd = REST_NOISE * rng.uniform(0.7, 1.6)
    signal = (env + noise_sd) * rng.standard_normal((n, cfg.N_CHANNELS))
    signal += _mains(n, rng, hum * rng.uniform(0.4, 1.8))
    signal += _drift(n, rng, DRIFT_COUNTS * rng.uniform(0.3, 1.5))
    return quantise(BASELINE + signal)


# Augmentation
def time_warp(raw: np.ndarray, factor: float) -> np.ndarray:
    """Resample by `factor` and refit to the original length.

    A slower rep stretches the burst past the window edge rather than squeezing
    the whole recording, which is what a slower speaker actually produces.
    """
    n = raw.shape[0]
    src = np.arange(n)
    dst = np.arange(n) / factor
    out = np.empty_like(raw, dtype=np.float64)
    for ch in range(raw.shape[1]):
        out[:, ch] = np.interp(dst, src, raw[:, ch], left=raw[0, ch], right=raw[-1, ch])
    return out


def augment(raw: np.ndarray, rng: np.random.Generator) -> np.ndarray:
    """Jitter a recorded capture into a plausible different rep of the same word.

    Only perturbations the front end cannot already absorb are worth applying.
    align_window re-finds the onset, so a pure time shift is close to a no-op and
    is left out; amplitude, rate, noise floor and drift all move the 28-dim
    vector, because every feature in it is built from the envelope's size and
    shape.
    """
    x = np.asarray(raw, dtype=np.float64)
    centred = x - x.mean(axis=0, keepdims=True)
    n = x.shape[0]

    centred = time_warp(centred, rng.uniform(0.85, 1.18))
    centred *= rng.uniform(0.65, 1.45, cfg.N_CHANNELS)          # contact / gain
    centred += REST_NOISE * rng.uniform(0.2, 0.9) * rng.standard_normal((n, cfg.N_CHANNELS))
    centred += _mains(n, rng, HUM_COUNTS * rng.uniform(0.0, 1.2))
    centred += _drift(n, rng, DRIFT_COUNTS * rng.uniform(0.2, 1.2))
    return quantise(x.mean(axis=0, keepdims=True) + centred)


# Writing
def write_word(
    out_dir: Path,
    word: str,
    reps: int,
    sessions: int,
    rng: np.random.Generator,
    source: list[np.ndarray] | None,
    prefix: str,
) -> int:
    word_dir = out_dir / word
    word_dir.mkdir(parents=True, exist_ok=True)
    written = 0
    for i in range(reps):
        if i % max(1, reps // max(1, sessions)) == 0:
            gain, hum = session_gain(rng), HUM_COUNTS * rng.uniform(0.3, 1.6)
        if source is None:
            capture = synthesize(word, rng, gain=gain, hum=hum)
        else:
            capture = augment(source[i % len(source)], rng)
        save_capture(word_dir, capture, prefix=prefix)
        written += 1
    return written


def load_real(data_dir: Path, word: str) -> list[np.ndarray]:
    caps = [read_capture(p) for p in sorted((data_dir / word).glob("*.csv"))]
    return [c for c in caps if len(c) >= cfg.SAMPLE_HZ // 2]


# CLI
def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--word", nargs="+", default=cfg.WORDS, help="words to generate")
    ap.add_argument("--reps", type=int, default=40, help="captures per word")
    ap.add_argument(
        "--sessions", type=int, default=4,
        help="electrode placements to simulate; reps are split evenly across them",
    )
    ap.add_argument(
        "--out", type=Path, default=cfg.ROOT / "data_synth",
        help="output directory (default data_synth/ -- keep synthetic captures out of data/)",
    )
    ap.add_argument(
        "--from", dest="source", type=Path, default=None,
        help="augment the real captures under this directory instead of inventing them",
    )
    ap.add_argument("--seed", type=int, default=cfg.RANDOM_STATE)
    args = ap.parse_args(argv)

    unknown = [w for w in args.word if w not in cfg.FULL_WORDS]
    if unknown:
        print(f"not in the vocabulary: {unknown}\nknown: {cfg.FULL_WORDS}")
        return 2

    if args.out.resolve() == cfg.DATA_DIR.resolve():
        print(
            "refusing to write into data/. Recorded and generated captures would be "
            "indistinguishable there and the confusion matrix would stop meaning "
            "anything. Use --out data_synth (the default)."
        )
        return 2

    rng = np.random.default_rng(args.seed)
    prefix = "aug" if args.source else "syn"
    total = 0

    for word in args.word:
        source = None
        if args.source:
            source = load_real(args.source, word)
            if not source:
                print(f"skip {word} — no usable captures under {args.source / word}")
                continue
        n = write_word(args.out, word, args.reps, args.sessions, rng, source, prefix)
        print(f"  {word:<10} {n} {'augmented' if source else 'synthetic'} captures")
        total += n

    if not total:
        print(f"nothing written. With --from, record real captures first.")
        return 1

    rel = args.out.relative_to(cfg.ROOT) if args.out.is_relative_to(cfg.ROOT) else args.out
    print(f"\nwrote {total} captures to {rel}")
    print(f"train on them with: python -m silent_signal.train --data-dir {rel}")
    if not args.source:
        print(
            "these classes are separable by construction — a high score here "
            "proves the pipeline runs, not that the interface works."
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())

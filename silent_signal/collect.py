"""collect CLI — prompted fixed-window recordings to data/<word>/NNN.csv

    python -m silent_signal.collect --word water --reps 30 --duration 1.2
    python -m silent_signal.collect --word yes no help --reps 30   # interleaved

Pass several words to interleave them: drift and jaw fatigue then spread evenly
across classes instead of pooling in whichever word was recorded last.
"""
from __future__ import annotations

import argparse
import csv
import random
import sys
import time
from pathlib import Path

from . import config as cfg
from .serial_reader import SerialReader


def next_index(word_dir: Path, prefix: str = "") -> int:
    """Next free number among files named <prefix>NNN.csv.

    Numbered per prefix so generated captures (synth.py writes "syn"/"aug") get
    their own run of indices and can never overwrite, or renumber, a recording.
    """
    existing = [
        int(p.stem[len(prefix) :])
        for p in word_dir.glob(f"{prefix}*.csv")
        if p.stem[: len(prefix)] == prefix and p.stem[len(prefix) :].isdigit()
    ]
    return max(existing, default=0) + 1


def save_capture(word_dir: Path, samples, prefix: str = "") -> Path:
    path = word_dir / f"{prefix}{next_index(word_dir, prefix):03d}.csv"
    with path.open("w", newline="") as fh:
        writer = csv.writer(fh)
        writer.writerow(["sample"] + [f"adc{c + 1}" for c in range(cfg.N_CHANNELS)])
        writer.writerows([i, *row] for i, row in enumerate(samples))
    return path


def countdown(word: str, seconds: int = 3) -> None:
    for n in range(seconds, 0, -1):
        print(f"\r  {word.upper()}  in {n}... ", end="", flush=True)
        time.sleep(1.0)
    print(f"\r  {word.upper()}  -- MOUTH IT NOW --   ", end="", flush=True)


def build_plan(words: list[str], reps: int, shuffle: bool) -> list[str]:
    plan = [w for w in words for _ in range(reps)]
    if shuffle:
        random.shuffle(plan)
    return plan


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--word", nargs="+", required=True, help="word(s) to record")
    ap.add_argument("--reps", type=int, default=30, help="captures per word")
    ap.add_argument(
        "--duration",
        type=float,
        default=cfg.WINDOW_S,
        help=f"capture window in seconds (default {cfg.WINDOW_S}, from config.WINDOW_S)",
    )
    ap.add_argument("--port", required=True, help="e.g. /dev/tty.usbserial-XXXX")
    ap.add_argument("--rest", type=float, default=1.5, help="pause between captures")
    ap.add_argument("--no-shuffle", action="store_true", help="record word by word")
    args = ap.parse_args(argv)

    unknown = [w for w in args.word if w not in cfg.FULL_WORDS]
    if unknown:
        print(f"not in the vocabulary: {unknown}\nknown: {cfg.FULL_WORDS}")
        return 2

    if abs(args.duration - cfg.WINDOW_S) > 1e-9:
        print(
            f"WARNING: --duration {args.duration}s != config.WINDOW_S {cfg.WINDOW_S}s. "
            "Change WINDOW_S in config.py instead, or live inference will not match."
        )

    samples_wanted = int(args.duration * cfg.SAMPLE_HZ)
    plan = build_plan(args.word, args.reps, not args.no_shuffle)

    print(f"port {args.port} @ {cfg.BAUD}  |  {len(plan)} captures  |  {args.duration}s each")
    print("Keep the electrode where it is for the whole session. Ctrl-C to stop.\n")

    reader = SerialReader(args.port).start()
    try:
        if not reader.wait_for_samples(1, timeout_s=10.0):
            print(f"no data on {args.port}: {reader.last_error or 'silent port'}")
            return 1

        for i, word in enumerate(plan, start=1):
            word_dir = cfg.DATA_DIR / word
            word_dir.mkdir(parents=True, exist_ok=True)

            print(f"[{i}/{len(plan)}]", end=" ")
            countdown(word)
            reader.clear()
            time.sleep(args.duration)
            window = reader.snapshot(samples_wanted)

            if len(window) < samples_wanted:
                print(f"\r  dropped — got {len(window)}/{samples_wanted} samples" + " " * 12)
                continue

            path = save_capture(word_dir, window)
            peaks = " ".join(f"{p:.0f}" for p in window.max(axis=0))
            print(f"\r  saved {path.relative_to(cfg.ROOT)}  peaks={peaks}" + " " * 8)
            time.sleep(args.rest)
    except KeyboardInterrupt:
        print("\nstopped")
    finally:
        reader.stop()

    for word in sorted(set(args.word)):
        n = len(list((cfg.DATA_DIR / word).glob("*.csv")))
        print(f"  {word:<10} {n} captures total")
    return 0

if __name__ == "__main__":
    sys.exit(main())

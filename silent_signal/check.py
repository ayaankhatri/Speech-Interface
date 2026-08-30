"""sensor check — verify wiring, sample rate, hum and signal-to-rest ratio

    python -m silent_signal.check --port /dev/cu.usbserial-XXXX

Run after attaching electrodes, before collect.py. Answers the four questions
that decide whether a recording session is worth starting:

  1. is the stream arriving at SAMPLE_HZ
  2. is the raw ADC range sane (not railed, not buried at zero)
  3. how much of the signal is mains hum
  4. does mouthing a word rise clearly above resting noise

A bench instrument only: nothing here is imported by training or inference, so
it cannot change what a model sees.
"""
from __future__ import annotations

import argparse
import sys
import time

import numpy as np

from . import config as cfg
from .features import envelope
from .filters import hum_fraction, notch
from .serial_reader import SerialReader

BAR_W = 40
REST_S = 2.0            # bounded by cfg.RING_S -- the ring holds no more
DEAD_RANGE = 5          # counts; below this a channel is grounded or unwired
CLIP_COUNTS = 4090
HUM_WARN = 0.30


def bar(value: float, ceiling: float, width: int = BAR_W) -> str:
    n = 0 if ceiling <= 0 else int(min(1.0, value / ceiling) * width)
    return "#" * n + "." * (width - n)


def grab(reader: SerialReader, seconds: float) -> tuple[np.ndarray, float]:
    """Collect `seconds` of stream. Returns (raw window, achieved sample rate)."""
    reader.clear()
    before = reader.total_samples
    t0 = time.monotonic()
    time.sleep(seconds)
    elapsed = time.monotonic() - t0
    raw = reader.snapshot(int(seconds * cfg.SAMPLE_HZ))
    hz = (reader.total_samples - before) / elapsed if elapsed > 0 else 0.0
    return raw, hz


def channel_report(raw: np.ndarray) -> list[dict]:
    """Per-channel raw range, hum share and resting envelope level."""
    out = []
    for c in range(raw.shape[1]):
        col = raw[:, c]
        lo, hi = float(col.min()), float(col.max())
        clean = notch(col)
        env = envelope(clean)[:, 0]
        out.append(
            {
                "min": lo,
                "max": hi,
                "range": hi - lo,
                "hum": hum_fraction(col),
                "rest": float(env.mean()),
                "dead": (hi - lo) < DEAD_RANGE,
            }
        )
    return out


def print_baseline(hz: float, chans: list[dict]) -> None:
    drift = abs(hz - cfg.SAMPLE_HZ) / cfg.SAMPLE_HZ
    mark = "ok" if drift < 0.05 else "SLOW"
    print(f"\nsample rate   {hz:6.1f} Hz   (want {cfg.SAMPLE_HZ})   [{mark}]")

    for i, ch in enumerate(chans, start=1):
        print(f"\nchannel {i}")
        print(f"  raw range   {ch['min']:.0f} .. {ch['max']:.0f}   ({ch['range']:.0f} counts)")
        if ch["dead"]:
            print("              flat -- grounded pin or nothing connected")
            continue
        print(f"  mains hum   {ch['hum'] * 100:.0f}% of spectral energy at {cfg.MAINS_HZ} Hz")
        print(f"  rest level  {ch['rest']:.1f} (post-notch envelope)")
        if ch["max"] >= CLIP_COUNTS:
            print("              CLIPPING at rest -- turn the gain pot down")
        if ch["hum"] > HUM_WARN:
            print("              heavy hum -- reseat REF, unplug the laptop charger")


def live_loop(reader: SerialReader, chans: list[dict], live: list[int]) -> None:
    ceiling = max(20.0, max(chans[c]["rest"] for c in live) * 12)
    print("\nMouth a word. Ctrl-C to stop.\n")
    peak_seen = {c: 0.0 for c in live}
    try:
        while True:
            raw = reader.snapshot(int(0.4 * cfg.SAMPLE_HZ))
            if raw.shape[0] < 2:
                time.sleep(0.1)
                continue
            cells = []
            for c in live:
                env = envelope(notch(raw[:, c]))[:, 0]
                level = float(env.max())
                peak_seen[c] = max(peak_seen[c], level)
                ratio = level / chans[c]["rest"] if chans[c]["rest"] > 0 else 0.0
                cells.append(f"ch{c + 1} [{bar(level, ceiling)}] x{ratio:5.1f}")
            print("\r" + "  ".join(cells), end="", flush=True)
            time.sleep(0.1)
    except KeyboardInterrupt:
        print("\n")
        for c in live:
            rest = chans[c]["rest"]
            ratio = peak_seen[c] / rest if rest > 0 else 0.0
            verdict = "good" if ratio >= 4 else "weak -- raise gain or reseat electrodes"
            print(f"channel {c + 1}: best peak was {ratio:.1f}x rest   [{verdict}]")


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--port", required=True, help="e.g. /dev/cu.usbserial-XXXX")
    args = ap.parse_args(argv)

    reader = SerialReader(args.port).start()
    try:
        if not reader.wait_for_samples(1, timeout_s=10.0):
            print(f"no data on {args.port}: {reader.last_error or 'silent port'}")
            return 1

        print("Hold still and stay relaxed -- measuring rest baseline...")
        raw, hz = grab(reader, REST_S)
        if raw.shape[0] < int(REST_S * cfg.SAMPLE_HZ) // 2:
            print(f"only {raw.shape[0]} samples arrived -- check the firmware is streaming")
            return 1

        chans = channel_report(raw)
        print_baseline(hz, chans)

        live = [i for i, ch in enumerate(chans) if not ch["dead"]]
        if not live:
            print("\nno live channel -- SIG is not reaching the ADC pin")
            return 1
        if reader.malformed:
            print(f"\n{reader.malformed} malformed lines -- check baud is {cfg.BAUD}")

        live_loop(reader, chans, live)
    finally:
        reader.stop()
    return 0


if __name__ == "__main__":
    sys.exit(main())

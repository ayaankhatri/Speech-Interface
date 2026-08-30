"""live loop — sample source to onset to features to predict to speech + dashboard

    python -m silent_signal.live --port /dev/tty.usbserial-XXXX   # hardware
    python -m silent_signal.live --replay data_synth              # no hardware

Rendering is not this module's job: it emits events and ui.py draws them. The
default sink prints one line per event so the loop is usable before the
dashboard exists.

Captures are addressed by absolute stream position, never by index into the
ring buffer, because the buffer only holds the last RING_S seconds and slides
out from under any index taken against it. The reader hands back its samples
and its counter together, and the onset offset is added to the start of the
chunk it was found in.

`run` takes a reader rather than a port so the same loop drives the ESP32 and
the file replay. Anything with SerialReader's surface will do; when the reader
knows what it is playing, that label rides along as `truth` and the caller can
score the prediction against it.

Predictions go through features_from_raw, the same entry point training uses.
Feeding a raw window to `features` instead would produce statistics of ADC
counts against a model fitted on envelope statistics, which predicts confidently
and wrongly rather than failing.
"""
from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path
from typing import Callable

import joblib
import numpy as np

from . import config as cfg
from .action import Speaker
from .features import combine, envelope, features_from_raw
from .onset import OnsetDetector

Event = dict
Sink = Callable[[Event], None]


# Output
def print_sink(event: Event) -> None:
    kind = event["kind"]
    if kind == "prediction":
        truth = event.get("truth")
        mark = "" if truth is None else ("  ok" if truth == event["word"] else f"  != {truth}")
        print(f"  {event['word']:<10} p={event['confidence']:.2f}{mark}")
    elif kind == "rejected":
        print(f"  (unsure: {event['word']} p={event['confidence']:.2f} < {cfg.CONF_THRESHOLD})")
    elif kind == "status":
        print(f"  {event['message']}")


# Model
def load_model(path=cfg.MODEL_PATH):
    if not path.exists():
        raise FileNotFoundError(f"{path} missing — run: python -m silent_signal.train")
    bundle = joblib.load(path)
    if bundle["n_features"] != cfg.N_FEATURES:
        raise ValueError(
            f"model has {bundle['n_features']} features, config says {cfg.N_FEATURES}. Retrain."
        )
    if abs(bundle["classify_s"] - cfg.CLASSIFY_S) > 1e-9:
        raise ValueError(
            f"model trained at CLASSIFY_S={bundle['classify_s']}s, "
            f"config says {cfg.CLASSIFY_S}s. Retrain."
        )
    return bundle


# Capture
def slice_absolute(buf: np.ndarray, end_total: int, start: int, length: int) -> np.ndarray | None:
    offset = len(buf) - (end_total - start)
    if offset < 0 or offset + length > len(buf):
        return None
    return buf[offset : offset + length]


def run(reader, sink: Sink = print_sink, speak: bool = True, model_path=cfg.MODEL_PATH) -> int:
    bundle = load_model(model_path)
    clf, labels = bundle["clf"], bundle["labels"]

    detector = OnsetDetector()
    reader.start()
    speaker = Speaker(enabled=speak).start()

    pending: int | None = None
    last_total = 0

    sink({"kind": "status", "message": f"listening on {reader.source} — Ctrl-C to stop"})
    try:
        if not reader.wait_for_samples(cfg.BASELINE_SAMPLES, timeout_s=10.0):
            sink({"kind": "status", "message": f"no data: {reader.last_error or 'silent port'}"})
            return 1

        while True:
            time.sleep(0.05)
            buf, end_total = reader.read()
            if len(buf) == 0:
                continue

            mono = combine(envelope(buf))
            n_new = min(end_total - last_total, len(mono))
            last_total = end_total

            if pending is None and n_new > 0:
                chunk_start = end_total - n_new
                offset = detector.feed(mono[len(mono) - n_new :])
                if offset is not None:
                    trigger = chunk_start + offset
                    pending = max(0, trigger - cfg.PRE_ROLL_SAMPLES - detector.min_samples)

            if pending is None or end_total < pending + cfg.WINDOW_SAMPLES:
                continue

            window = slice_absolute(buf, end_total, pending, cfg.WINDOW_SAMPLES)
            pending = None
            truth = getattr(reader, "now_playing", None)
            if window is None:
                sink({"kind": "status", "message": "capture missed — ring overran"})
                continue

            proba = clf.predict_proba(features_from_raw(window).reshape(1, -1))[0]
            i = int(np.argmax(proba))
            word, confidence = labels[i], float(proba[i])

            if confidence < cfg.CONF_THRESHOLD:
                sink(
                    {
                        "kind": "rejected",
                        "word": word,
                        "confidence": confidence,
                        "truth": truth,
                    }
                )
                continue
            sink(
                {
                    "kind": "prediction",
                    "word": word,
                    "confidence": confidence,
                    "truth": truth,
                }
            )
            speaker.say(word)
    except KeyboardInterrupt:
        sink({"kind": "status", "message": "stopped"})
    finally:
        reader.stop()
        speaker.stop()
    return 0


def build_reader(args):
    """Serial port or capture directory, whichever the caller asked for."""
    if args.replay is not None:
        from .replay import ReplayReader

        return ReplayReader(args.replay, gap_s=args.gap, speed=args.speed)
    from .serial_reader import SerialReader

    return SerialReader(args.port)


def add_source_args(ap: argparse.ArgumentParser) -> argparse.ArgumentParser:
    source = ap.add_mutually_exclusive_group(required=True)
    source.add_argument("--port", help="serial port, e.g. /dev/tty.usbserial-XXXX")
    source.add_argument(
        "--replay",
        type=Path,
        help="capture directory to replay instead of a port, e.g. data_synth",
    )
    ap.add_argument("--gap", type=float, default=2.0, help="replay: rest seconds between words")
    ap.add_argument("--speed", type=float, default=1.0, help="replay: playback rate multiplier")
    return ap


def main(argv: list[str] | None = None) -> int:
    ap = add_source_args(argparse.ArgumentParser(description=__doc__))
    ap.add_argument("--no-speak", action="store_true", help="predict without TTS")
    args = ap.parse_args(argv)
    try:
        return run(build_reader(args), speak=not args.no_speak)
    except (FileNotFoundError, ValueError) as exc:
        print(exc)
        return 1


if __name__ == "__main__":
    sys.exit(main())

"""live loop — serial to onset to features to predict to speech + dashboard

    python -m silent_signal.live --port /dev/tty.usbserial-XXXX

Rendering is not this module's job: it emits events and ui.py draws them. The
default sink prints one line per event so the loop is usable before the
dashboard exists.
"""
from __future__ import annotations

import argparse
import sys
import time
from typing import Callable

import joblib
import numpy as np

from . import config as cfg
from .action import Speaker
from .features import envelope, features
from .onset import OnsetDetector
from .serial_reader import SerialReader

Event = dict
Sink = Callable[[Event], None]


def print_sink(event: Event) -> None:
    kind = event["kind"]
    if kind == "prediction":
        print(f"  {event['word']:<10} p={event['confidence']:.2f}  -> {event['spoke']}")
    elif kind == "rejected":
        print(f"  (unsure: {event['word']} p={event['confidence']:.2f} < {cfg.CONF_THRESHOLD})")
    elif kind == "status":
        print(f"  {event['message']}")


def load_model(path=cfg.MODEL_PATH):
    if not path.exists():
        raise FileNotFoundError(f"{path} missing — run: python -m silent_signal.train")
    bundle = joblib.load(path)
    if bundle["n_features"] != cfg.N_FEATURES:
        raise ValueError(
            f"model has {bundle['n_features']} features, config says {cfg.N_FEATURES}. Retrain."
        )
    if abs(bundle["window_s"] - cfg.WINDOW_S) > 1e-9:
        raise ValueError(
            f"model trained at WINDOW_S={bundle['window_s']}s, config says {cfg.WINDOW_S}s. Retrain."
        )
    return bundle


def slice_absolute(buf: np.ndarray, end_total: int, start: int, length: int) -> np.ndarray | None:
    offset = len(buf) - (end_total - start)
    if offset < 0 or offset + length > len(buf):
        return None
    return buf[offset : offset + length]


def run(port: str, sink: Sink = print_sink, speak: bool = True, model_path=cfg.MODEL_PATH) -> int:
    bundle = load_model(model_path)
    clf, labels = bundle["clf"], bundle["labels"]

    detector = OnsetDetector()
    reader = SerialReader(port).start()
    speaker = Speaker(enabled=speak).start()

    pending: int | None = None
    last_total = 0

    sink({"kind": "status", "message": f"listening on {port} — Ctrl-C to stop"})
    try:
        if not reader.wait_for_samples(cfg.BASELINE_SAMPLES, timeout_s=10.0):
            sink({"kind": "status", "message": f"no data: {reader.last_error or 'silent port'}"})
            return 1

        while True:
            time.sleep(0.05)
            buf = reader.snapshot()
            end_total = reader.total_samples
            if buf.size == 0:
                continue

            env = envelope(buf)
            n_new = min(end_total - last_total, env.size)
            last_total = end_total

            if pending is None and n_new > 0:
                trigger = detector.feed(env[env.size - n_new :])
                if trigger is not None:
                    pending = max(0, trigger - cfg.PRE_ROLL_SAMPLES - detector.min_samples)

            if pending is None:
                continue
            if end_total < pending + cfg.WINDOW_SAMPLES:
                continue

            window = slice_absolute(buf, end_total, pending, cfg.WINDOW_SAMPLES)
            pending = None
            if window is None:
                sink({"kind": "status", "message": "capture missed — ring overran"})
                continue

            proba = clf.predict_proba(features(window).reshape(1, -1))[0]
            i = int(np.argmax(proba))
            word, confidence = labels[i], float(proba[i])

            if confidence < cfg.CONF_THRESHOLD:
                sink({"kind": "rejected", "word": word, "confidence": confidence})
                continue
            sink(
                {
                    "kind": "prediction",
                    "word": word,
                    "confidence": confidence,
                    "spoke": speaker.say(word),
                }
            )
    except KeyboardInterrupt:
        sink({"kind": "status", "message": "stopped"})
    finally:
        reader.stop()
        speaker.stop()
    return 0


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--port", required=True, help="e.g. /dev/tty.usbserial-XXXX")
    ap.add_argument("--no-speak", action="store_true", help="predict without TTS")
    args = ap.parse_args(argv)
    try:
        return run(args.port, speak=not args.no_speak)
    except (FileNotFoundError, ValueError) as exc:
        print(exc)
        return 1

if __name__ == "__main__":
    sys.exit(main())

"""replay reader — a recorded/synthetic capture directory in place of the ESP32

    python -m silent_signal.live --replay data_synth

Stands in for SerialReader while there is no firmware on the bench: same
`start / read / wait_for_samples / stop` surface, same (samples, channels)
snapshots, so live.py cannot tell the two apart and the demo exercises the real
onset detector, the real feature front end and the real model rather than a
shortcut around them.

Captures are played at SAMPLE_HZ in wall-clock time and separated by `gap_s` of
resting signal. The gap is not padding: OnsetDetector needs quiet samples to
build the baseline it thresholds against, and its refractory period
(config.REFRACTORY_S) has to expire before the next word can trigger. A gap
shorter than that silently swallows words.

`now_playing` is the label of the capture currently being fed, which live.py
attaches to its events as ground truth. It is set when a capture starts and held
through the gap that follows it, so a prediction made one window later still
reads the word that produced it.
"""
from __future__ import annotations

import random
import threading
import time
from pathlib import Path

import numpy as np

from . import config as cfg
from .dataset import read_capture
from .ring import SampleRing
from .synth import REST_NOISE, quantise

CHUNK_MS = 20


class ReplayReader:
    def __init__(
        self,
        data_dir: Path,
        words: list[str] | None = None,
        gap_s: float = 2.0,
        speed: float = 1.0,
        loop: bool = True,
        seed: int | None = None,
        ring_samples: int = cfg.RING_SAMPLES,
        channels: int = cfg.N_CHANNELS,
    ) -> None:
        self.data_dir = Path(data_dir)
        self.words = list(words or cfg.WORDS)
        self.gap_s = max(gap_s, cfg.REFRACTORY_S)
        self.speed = max(speed, 0.05)
        self.loop = loop
        self.channels = channels
        self._rng = random.Random(seed)
        self._ring = SampleRing(ring_samples, channels)
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None
        self.connected = False
        self.last_error: str | None = None
        self.now_playing: str | None = None
        self.played = 0
        self.playlist = self._build_playlist()

    @property
    def source(self) -> str:
        return f"{self.data_dir} (replay, {len(self.playlist)} captures)"

    @property
    def total_samples(self) -> int:
        return self._ring.total

    # Playlist
    def _build_playlist(self) -> list[tuple[str, Path]]:
        items = [
            (word, path)
            for word in self.words
            for path in sorted((self.data_dir / word).glob("*.csv"))
        ]
        self._rng.shuffle(items)
        return items

    # Lifecycle
    def start(self) -> "ReplayReader":
        if self._thread is not None:
            return self
        if not self.playlist:
            self.last_error = f"no captures under {self.data_dir} for words={self.words}"
            return self
        self._thread = threading.Thread(target=self._run, name="replay-reader", daemon=True)
        self._thread.start()
        return self

    def stop(self) -> None:
        self._stop.set()
        if self._thread is not None:
            self._thread.join(timeout=2.0)
            self._thread = None
        self.connected = False

    def __enter__(self) -> "ReplayReader":
        return self.start()

    def __exit__(self, *exc) -> None:
        self.stop()

    # Buffer access
    def read(self, n: int | None = None) -> tuple[np.ndarray, int]:
        return self._ring.read(n)

    def snapshot(self, n: int | None = None) -> np.ndarray:
        return self.read(n)[0]

    def clear(self) -> None:
        self._ring.clear()

    def wait_for_samples(self, n: int, timeout_s: float = 5.0) -> bool:
        return self._ring.wait_for(n, timeout_s)

    # Stream
    def _run(self) -> None:
        self.connected = True
        order = list(self.playlist)
        while not self._stop.is_set():
            for word, path in order:
                if self._stop.is_set():
                    return
                capture = read_capture(path)
                if len(capture) < cfg.SAMPLE_HZ // 2:
                    continue
                self.now_playing = word
                self._feed(capture)
                self.played += 1
                self._feed(self._rest(capture))
            if not self.loop:
                break
            self._rng.shuffle(order)
        self.connected = False

    def _rest(self, capture: np.ndarray) -> np.ndarray:
        """Quiet signal at the capture's own DC level, for the gap after it."""
        n = int(self.gap_s * cfg.SAMPLE_HZ)
        base = capture.mean(axis=0)
        noise = REST_NOISE * np.random.default_rng(self._rng.randrange(2**32)).standard_normal(
            (n, self.channels)
        )
        return quantise(base + noise)

    def _feed(self, samples: np.ndarray) -> None:
        """Push `samples` into the ring at SAMPLE_HZ, paced against a monotonic clock."""
        step = max(1, int(cfg.SAMPLE_HZ * CHUNK_MS / 1000))
        period = step / (cfg.SAMPLE_HZ * self.speed)
        due = time.monotonic()
        for start in range(0, len(samples), step):
            if self._stop.is_set():
                return
            self._ring.extend(samples[start : start + step])
            due += period
            time.sleep(max(0.0, due - time.monotonic()))

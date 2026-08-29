"""onset detection — trigger a capture when the envelope rises above baseline

Timing is counted in samples, not wall clock: the stream arrives in bursts, so
sample counts stay stable where time.time() deltas would not.

`feed` returns a position inside the chunk it was handed, not a position in the
stream. The detector only ever sees the samples a caller chooses to give it, so
any counter it kept of its own would fall behind the reader's the first time
samples arrived faster than the ring buffer held them, and every capture cut
from that counter would land late with nothing raising an error. The caller
knows where its chunk starts and adds that offset itself.

The baseline keeps a running sum and sum of squares rather than re-reducing the
whole window per sample, which is the difference between constant work per
sample and a quarter-million float operations a second inside the live loop.
"""
from __future__ import annotations

from collections import deque

import numpy as np

from . import config as cfg


class OnsetDetector:
    def __init__(
        self,
        k: float = cfg.ONSET_K,
        min_ms: int = cfg.ONSET_MIN_MS,
        refractory_s: float = cfg.REFRACTORY_S,
        baseline_samples: int = cfg.BASELINE_SAMPLES,
    ) -> None:
        self.k = k
        self.min_samples = max(1, int(min_ms * cfg.SAMPLE_HZ / 1000))
        self.refractory_samples = int(refractory_s * cfg.SAMPLE_HZ)
        self.baseline_samples = baseline_samples
        self._baseline: deque[float] = deque()
        self._sum = 0.0
        self._sumsq = 0.0
        self._above = 0
        self._since_trigger = self.refractory_samples
        self.total_seen = 0
        self.threshold = float("inf")

    @property
    def ready(self) -> bool:
        return len(self._baseline) >= self.baseline_samples // 2

    def feed(self, samples: np.ndarray) -> int | None:
        trigger = None
        for i, value in enumerate(np.asarray(samples, dtype=np.float64).ravel()):
            self.total_seen += 1
            self._since_trigger += 1

            if value > self.threshold:
                self._above += 1
                if (
                    trigger is None
                    and self._above >= self.min_samples
                    and self._since_trigger >= self.refractory_samples
                ):
                    trigger = i
                    self._since_trigger = 0
            else:
                self._above = 0
                self._push_baseline(value)

        return trigger

    def _push_baseline(self, value: float) -> None:
        if len(self._baseline) == self.baseline_samples:
            old = self._baseline.popleft()
            self._sum -= old
            self._sumsq -= old * old
        self._baseline.append(value)
        self._sum += value
        self._sumsq += value * value

        if not self.ready:
            self.threshold = float("inf")
            return
        n = len(self._baseline)
        mean = self._sum / n
        var = max(self._sumsq / n - mean * mean, 0.0)
        self.threshold = mean + self.k * var**0.5

    def reset(self) -> None:
        self._baseline.clear()
        self._sum = 0.0
        self._sumsq = 0.0
        self._above = 0
        self._since_trigger = self.refractory_samples
        self.threshold = float("inf")

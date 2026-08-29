"""onset detection — trigger a capture when the envelope rises above baseline

Timing is counted in samples, not wall clock: the stream arrives in bursts, so
sample counts stay stable where time.time() deltas would not.
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
        self._baseline: deque[float] = deque(maxlen=baseline_samples)
        self._above = 0
        self._since_trigger = self.refractory_samples
        self.total_seen = 0
        self.threshold = float("inf")

    @property
    def ready(self) -> bool:
        return len(self._baseline) >= self._baseline.maxlen // 2

    def feed(self, samples: np.ndarray) -> int | None:
        trigger = None
        for value in np.asarray(samples, dtype=np.float64).ravel():
            self.total_seen += 1
            self._since_trigger += 1

            if self.ready:
                base = np.fromiter(self._baseline, dtype=np.float64, count=len(self._baseline))
                self.threshold = float(base.mean() + self.k * base.std())
            else:
                self.threshold = float("inf")

            if value > self.threshold:
                self._above += 1
                if (
                    trigger is None
                    and self._above >= self.min_samples
                    and self._since_trigger >= self.refractory_samples
                ):
                    trigger = self.total_seen - 1
                    self._since_trigger = 0
            else:
                self._above = 0
                self._baseline.append(value)

        return trigger

    def reset(self) -> None:
        self._baseline.clear()
        self._above = 0
        self._since_trigger = self.refractory_samples

"""sample ring — the fixed-size buffer both readers fill

One place owns the buffer invariants so the serial path and the replay path
cannot drift apart.

`total` counts every sample ever appended, including ones already pushed out of
the ring, so it is an absolute position in the stream rather than an index into
the buffer. Callers that need both must use `read`, which takes them under one
lock: fetching the buffer and the counter separately lets the writer thread
append in between, and every index derived from the pair is then off by however
many samples landed in the gap.

Snapshots are always 2-D, shape (samples, channels), even for one channel.
"""
from __future__ import annotations

import threading
from collections import deque
from typing import Iterable, Sequence

import numpy as np


class SampleRing:
    def __init__(self, maxlen: int, channels: int) -> None:
        self.channels = channels
        self._ring: deque[tuple[float, ...]] = deque(maxlen=maxlen)
        self._cond = threading.Condition()
        self._total = 0

    def __len__(self) -> int:
        with self._cond:
            return len(self._ring)

    @property
    def total(self) -> int:
        with self._cond:
            return self._total

    # Writing
    def append(self, row: Sequence[float]) -> None:
        with self._cond:
            self._ring.append(tuple(row))
            self._total += 1
            self._cond.notify_all()

    def extend(self, rows: Iterable[Sequence[float]]) -> None:
        with self._cond:
            for row in rows:
                self._ring.append(tuple(row))
                self._total += 1
            self._cond.notify_all()

    # Reading
    def read(self, n: int | None = None) -> tuple[np.ndarray, int]:
        with self._cond:
            rows = list(self._ring)
            total = self._total
        if not rows:
            return np.empty((0, self.channels), dtype=np.float64), total
        buf = np.asarray(rows, dtype=np.float64)
        return (buf if n is None else buf[-n:]), total

    def clear(self) -> None:
        with self._cond:
            self._ring.clear()

    def wait_for(self, n: int, timeout_s: float = 5.0) -> bool:
        with self._cond:
            return self._cond.wait_for(lambda: len(self._ring) >= n, timeout=timeout_s)

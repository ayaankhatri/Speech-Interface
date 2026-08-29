"""serial reader — background thread, ESP32 stream to a ring buffer

The ESP32 prints one whitespace-separated line per sample at SAMPLE_HZ, one
column per EMG channel ("adc1<TAB>adc2"). That format is also what the Arduino
Serial Plotter expects, so the same firmware output can be eyeballed live and
parsed here. Reading it inline would stall whatever loop owns the foreground, so
a daemon thread drains the port into a fixed-size ring and callers take
snapshots of it.

Snapshots are always 2-D, shape (samples, channels), even for one channel.
"""
from __future__ import annotations

import re
import threading
from collections import deque

import numpy as np
import serial

from . import config as cfg

# Accept tab, space, or comma between columns so a firmware tweak to the
# separator does not silently drop every sample.
_SPLIT = re.compile(r"[,\s]+")


class SerialReader:
    def __init__(
        self,
        port: str,
        baud: int = cfg.BAUD,
        ring_samples: int = cfg.RING_SAMPLES,
        reconnect_s: float = 1.0,
        channels: int = cfg.N_CHANNELS,
    ) -> None:
        self.port = port
        self.baud = baud
        self.channels = channels
        self.reconnect_s = reconnect_s
        self._ring: deque[tuple[float, ...]] = deque(maxlen=ring_samples)
        self._lock = threading.Lock()
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None
        self.connected = False
        self.last_error: str | None = None
        self.total_samples = 0
        self.malformed = 0

    def start(self) -> "SerialReader":
        if self._thread is not None:
            return self
        self._thread = threading.Thread(target=self._run, name="serial-reader", daemon=True)
        self._thread.start()
        return self

    def stop(self) -> None:
        self._stop.set()
        if self._thread is not None:
            self._thread.join(timeout=2.0)
            self._thread = None

    def __enter__(self) -> "SerialReader":
        return self.start()

    def __exit__(self, *exc) -> None:
        self.stop()

    def snapshot(self, n: int | None = None) -> np.ndarray:
        """Most recent samples as (samples, channels)."""
        with self._lock:
            rows = list(self._ring)
        if not rows:
            return np.empty((0, self.channels), dtype=np.float64)
        buf = np.asarray(rows, dtype=np.float64)
        return buf if n is None else buf[-n:]

    def clear(self) -> None:
        with self._lock:
            self._ring.clear()

    def wait_for_samples(self, n: int, timeout_s: float = 5.0) -> bool:
        deadline = threading.Event()
        waited = 0.0
        step = 0.02
        while waited < timeout_s:
            with self._lock:
                if len(self._ring) >= n:
                    return True
            deadline.wait(step)
            waited += step
        return False

    def _run(self) -> None:
        while not self._stop.is_set():
            try:
                with serial.Serial(self.port, self.baud, timeout=1.0) as port:
                    self.connected = True
                    self.last_error = None
                    port.reset_input_buffer()
                    while not self._stop.is_set():
                        line = port.readline()
                        if not line:
                            continue
                        self._ingest(line)
            except (serial.SerialException, OSError) as exc:
                self.last_error = str(exc)
            self.connected = False
            if not self._stop.is_set():
                self._stop.wait(self.reconnect_s)

    def _ingest(self, line: bytes) -> None:
        text = line.decode("ascii", errors="ignore").strip()
        if not text:
            return
        parts = _SPLIT.split(text)
        if len(parts) < self.channels:
            self.malformed += 1
            return
        try:
            values = tuple(float(p) for p in parts[: self.channels])
        except ValueError:
            # Boot-time chatter from the ESP32 ROM loader, or a half-line after
            # connecting mid-stream. Both are expected; just skip.
            self.malformed += 1
            return
        with self._lock:
            self._ring.append(values)
            self.total_samples += 1

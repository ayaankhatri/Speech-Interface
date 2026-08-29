"""serial reader — background thread, ESP32 stream to a ring buffer

The ESP32 prints one "millis,adc" line per sample at SAMPLE_HZ. Reading that
inline would stall whatever loop owns the foreground, so a daemon thread drains
the port into a fixed-size ring and callers take snapshots of it.
"""
from __future__ import annotations

import threading
from collections import deque

import numpy as np
import serial

from . import config as cfg


class SerialReader:
    def __init__(
        self,
        port: str,
        baud: int = cfg.BAUD,
        ring_samples: int = cfg.RING_SAMPLES,
        reconnect_s: float = 1.0,
    ) -> None:
        self.port = port
        self.baud = baud
        self.reconnect_s = reconnect_s
        self._ring: deque[float] = deque(maxlen=ring_samples)
        self._lock = threading.Lock()
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None
        self.connected = False
        self.last_error: str | None = None
        self.total_samples = 0

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
        with self._lock:
            buf = np.fromiter(self._ring, dtype=np.float64, count=len(self._ring))
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
        try:
            text = line.decode("ascii", errors="ignore").strip()
        except Exception:
            return
        if not text:
            return
        _, _, adc = text.partition(",")
        try:
            value = float(adc)
        except ValueError:
            return
        with self._lock:
            self._ring.append(value)
            self.total_samples += 1

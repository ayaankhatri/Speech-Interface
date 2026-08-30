"""serial reader — background thread, ESP32 stream to a ring buffer

The ESP32 prints one whitespace-separated line per sample at SAMPLE_HZ, one
column per EMG channel ("adc1<TAB>adc2"). That format is also what the Arduino
Serial Plotter expects, so the same firmware output can be eyeballed live and
parsed here. Reading it inline would stall whatever loop owns the foreground, so
a daemon thread drains the port into a fixed-size ring and callers take
snapshots of it.

The buffer itself is a SampleRing, shared with the replay reader so both
sources hand the live loop the same snapshot contract.
"""
from __future__ import annotations

import re
import threading

import serial

from . import config as cfg
from .ring import SampleRing

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
        self._ring = SampleRing(ring_samples, channels)
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None
        self.connected = False
        self.last_error: str | None = None
        self.malformed = 0

    @property
    def source(self) -> str:
        return self.port

    @property
    def total_samples(self) -> int:
        return self._ring.total

    # Lifecycle
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
            self.malformed += 1
            return
        self._ring.append(values)

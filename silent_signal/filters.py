"""mains-hum removal — IIR notch, no scipy dependency

The sEMG front end picks up substantial mains interference (~50 Hz in IN/EU,
60 Hz in US/JP). Rectifying that hum straight into the envelope swamps the
muscle signal, so it is notched out of the raw stream first.

Implemented as a hand-rolled biquad because the project deliberately keeps its
dependency list to numpy/sklearn/pyserial (see requirements.txt).
"""
from __future__ import annotations

import numpy as np

from . import config as cfg


def notch_coeffs(f0: float, fs: float, q: float = 30.0):
    """Standard RBJ audio-EQ-cookbook band-reject biquad."""
    w0 = 2.0 * np.pi * f0 / fs
    alpha = np.sin(w0) / (2.0 * q)
    cw = np.cos(w0)
    b = np.array([1.0, -2.0 * cw, 1.0])
    a = np.array([1.0 + alpha, -2.0 * cw, 1.0 - alpha])
    return b / a[0], a / a[0]


def biquad(x: np.ndarray, b: np.ndarray, a: np.ndarray) -> np.ndarray:
    """Direct-form-II transposed. Loops in Python; fine for our window sizes."""
    y = np.empty_like(x, dtype=np.float64)
    z1 = z2 = 0.0
    for n, xn in enumerate(x):
        yn = b[0] * xn + z1
        z1 = b[1] * xn - a[1] * yn + z2
        z2 = b[2] * xn - a[2] * yn
        y[n] = yn
    return y


def notch(x: np.ndarray, f0: float = None, fs: float = None, q: float = 30.0,
          harmonics: int = 2) -> np.ndarray:
    """Remove mains hum and its first few harmonics, zero-phase.

    Filtered forwards then backwards so the envelope's timing is not shifted --
    onset detection depends on that.
    """
    f0 = cfg.MAINS_HZ if f0 is None else f0
    fs = cfg.SAMPLE_HZ if fs is None else fs
    y = np.asarray(x, dtype=np.float64)
    for k in range(1, harmonics + 1):
        fk = f0 * k
        if fk >= fs / 2:
            break
        b, a = notch_coeffs(fk, fs, q)
        y = biquad(y, b, a)          # forward
        y = biquad(y[::-1], b, a)[::-1]  # and back -> zero phase
    return y


def hum_fraction(x: np.ndarray, f0: float = None, fs: float = None,
                 width: float = 5.0) -> float:
    """Share of spectral energy within +/-width Hz of the mains frequency."""
    f0 = cfg.MAINS_HZ if f0 is None else f0
    fs = cfg.SAMPLE_HZ if fs is None else fs
    x = np.asarray(x, dtype=np.float64)
    x = x - x.mean()
    if x.std() == 0:
        return 0.0
    mag = np.abs(np.fft.rfft(x * np.hanning(len(x))))
    fr = np.fft.rfftfreq(len(x), 1.0 / fs)
    mag[fr < 3] = 0.0
    total = mag.sum()
    return float(mag[(fr >= f0 - width) & (fr <= f0 + width)].sum() / total) if total else 0.0

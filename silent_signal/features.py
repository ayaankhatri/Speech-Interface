"""feature extraction — one envelope window to a fixed vector (default 28 dims)

The single shared front end for training and live inference. Both paths must
call `features_from_raw` (or `envelope` then `features`) so that a vector built
during collection and a vector built during the live loop mean the same thing.
Any change here invalidates models/model.joblib — retrain after editing.

Windows are 2-D, shape (samples, channels). Each channel is reduced to the same
block of N_FEATURES_PER_CH stats independently and the blocks are concatenated,
so channel order is part of the contract: column 0 stays column 0 for the life
of a model. A 1-D input is treated as a single channel.
"""
from __future__ import annotations

import numpy as np

from . import config as cfg

_PER_CHANNEL_NAMES: list[str] = [
    "mean",
    "std",
    "peak",
    "rms",
    "area",
    "waveform_length",
    "peak_position",
    "active_fraction",
] + [f"slice{i}_{stat}" for i in range(cfg.N_SLICES) for stat in ("mean", "peak")]

assert len(_PER_CHANNEL_NAMES) == cfg.N_FEATURES_PER_CH

FEATURE_NAMES: list[str] = [
    f"ch{c + 1}_{name}" for c in range(cfg.N_CHANNELS) for name in _PER_CHANNEL_NAMES
]

assert len(FEATURE_NAMES) == cfg.N_FEATURES


def as_2d(x: np.ndarray) -> np.ndarray:
    """(samples,) or (samples, channels) -> (samples, channels)."""
    a = np.asarray(x, dtype=np.float64)
    return a[:, None] if a.ndim == 1 else a


def fit_window(x: np.ndarray, n: int = cfg.WINDOW_SAMPLES) -> np.ndarray:
    a = as_2d(x)
    if a.shape[0] >= n:
        return a[:n]
    return np.vstack([a, np.zeros((n - a.shape[0], a.shape[1]), dtype=np.float64)])


def envelope(raw: np.ndarray) -> np.ndarray:
    """Rectify about each channel's own mean, then moving-average."""
    a = as_2d(raw)
    if a.shape[0] == 0:
        return a
    centred = np.abs(a - a.mean(axis=0, keepdims=True))
    k = min(cfg.SMOOTH_SAMPLES, a.shape[0])
    if k <= 1:
        return centred
    pad_l, pad_r = k // 2, k - 1 - k // 2
    kernel = np.ones(k) / k
    out = np.empty_like(centred)
    for c in range(centred.shape[1]):
        padded = np.pad(centred[:, c], (pad_l, pad_r), mode="edge")
        out[:, c] = np.convolve(padded, kernel, mode="valid")
    return out


def combine(env: np.ndarray) -> np.ndarray:
    """Channels -> one trace for onset detection: whichever site fires first wins."""
    return as_2d(env).max(axis=1)


def _channel_features(e: np.ndarray) -> list[float]:
    peak = float(e.max())
    dt = 1.0 / cfg.SAMPLE_HZ

    whole = [
        float(e.mean()),
        float(e.std()),
        peak,
        float(np.sqrt(np.mean(e**2))),
        float(e.sum() * dt),
        float(np.abs(np.diff(e)).sum()),
        float(int(e.argmax()) / e.size),
        float((e >= cfg.ACTIVE_FRAC * peak).mean()) if peak > 0 else 0.0,
    ]

    per_slice: list[float] = []
    for s in np.array_split(e, cfg.N_SLICES):
        per_slice.append(float(s.mean()))
        per_slice.append(float(s.max()))

    return whole + per_slice


def features(env: np.ndarray) -> np.ndarray:
    e = fit_window(env)
    if e.shape[1] != cfg.N_CHANNELS:
        raise ValueError(
            f"window has {e.shape[1]} channel(s), config.N_CHANNELS is {cfg.N_CHANNELS}"
        )
    vec = np.array(
        [v for c in range(e.shape[1]) for v in _channel_features(e[:, c])],
        dtype=np.float64,
    )
    assert vec.shape == (cfg.N_FEATURES,)
    return vec


def features_from_raw(raw: np.ndarray) -> np.ndarray:
    return features(envelope(fit_window(raw)))

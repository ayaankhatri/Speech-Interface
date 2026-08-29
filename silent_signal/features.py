"""feature extraction — one envelope window to a fixed vector (default 14 dims)

The single shared front end for training and live inference. Both paths must
call `features_from_raw` (or `envelope` then `features`) so that a vector built
during collection and a vector built during the live loop mean the same thing.
Any change here invalidates models/model.joblib — retrain after editing.
"""
from __future__ import annotations

import numpy as np

from . import config as cfg

FEATURE_NAMES: list[str] = [
    "mean",
    "std",
    "peak",
    "rms",
    "area",
    "waveform_length",
    "peak_position",
    "active_fraction",
] + [f"slice{i}_{stat}" for i in range(cfg.N_SLICES) for stat in ("mean", "peak")]

assert len(FEATURE_NAMES) == cfg.N_FEATURES


def fit_window(x: np.ndarray, n: int = cfg.WINDOW_SAMPLES) -> np.ndarray:
    x = np.asarray(x, dtype=np.float64).ravel()
    if x.size >= n:
        return x[:n]
    return np.concatenate([x, np.zeros(n - x.size)])


def envelope(raw: np.ndarray) -> np.ndarray:
    x = np.asarray(raw, dtype=np.float64).ravel()
    if x.size == 0:
        return x
    centred = np.abs(x - x.mean())
    k = min(cfg.SMOOTH_SAMPLES, x.size)
    if k <= 1:
        return centred
    pad_l, pad_r = k // 2, k - 1 - k // 2
    padded = np.pad(centred, (pad_l, pad_r), mode="edge")
    return np.convolve(padded, np.ones(k) / k, mode="valid")


def features(env: np.ndarray) -> np.ndarray:
    e = fit_window(env)
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

    vec = np.array(whole + per_slice, dtype=np.float64)
    assert vec.shape == (cfg.N_FEATURES,)
    return vec


def features_from_raw(raw: np.ndarray) -> np.ndarray:
    return features(envelope(fit_window(raw)))

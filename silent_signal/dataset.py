"""dataset loader — data/<word>/*.csv to an (X, y) feature matrix

CSV layout, one file per recorded rep, written by collect.py:
    sample,adc
    0,1873
    1,1881
    ...
"""
from __future__ import annotations

import csv
from pathlib import Path

import numpy as np

from . import config as cfg
from .features import features_from_raw


def read_capture(path: Path) -> np.ndarray:
    values: list[float] = []
    with path.open(newline="") as fh:
        for row in csv.reader(fh):
            if len(row) < 2:
                continue
            try:
                values.append(float(row[1]))
            except ValueError:
                continue
    return np.asarray(values, dtype=np.float64)


def load_dataset(
    data_dir: Path = cfg.DATA_DIR,
    words: list[str] = cfg.WORDS,
    min_samples: int = cfg.SAMPLE_HZ // 2,
) -> tuple[np.ndarray, np.ndarray]:
    rows: list[np.ndarray] = []
    labels: list[str] = []
    skipped = 0

    for word in words:
        for path in sorted((data_dir / word).glob("*.csv")):
            raw = read_capture(path)
            if raw.size < min_samples:
                print(f"skip {path} — {raw.size} samples, need {min_samples}")
                skipped += 1
                continue
            rows.append(features_from_raw(raw))
            labels.append(word)

    if not rows:
        raise FileNotFoundError(
            f"no usable captures under {data_dir} for words={words}. "
            "Run: python -m silent_signal.collect --word <word>"
        )

    X = np.vstack(rows)
    y = np.asarray(labels)
    print(f"loaded {X.shape[0]} captures, {len(set(labels))} words, {skipped} skipped")
    return X, y

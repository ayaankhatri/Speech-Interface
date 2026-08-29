"""train — RandomForest + 5-fold confusion matrix, writes models/model.joblib

    python -m silent_signal.train

Read the confusion matrix, not the headline accuracy. Two words that keep
swapping need more or cleaner data for that pair — or one of them dropped from
the demo vocabulary — not more trees.

The saved bundle carries the feature count and the classifier window length it
was fitted at, so live.py can refuse a model whose front end no longer matches
config rather than predicting against a layout it was never trained on.
"""
from __future__ import annotations

import argparse
import sys

import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.model_selection import StratifiedKFold, cross_val_predict

from . import config as cfg
from .dataset import load_dataset
from .features import FEATURE_NAMES


# Reporting
def print_confusion(y_true: np.ndarray, y_pred: np.ndarray, labels: list[str]) -> None:
    cm = confusion_matrix(y_true, y_pred, labels=labels)
    width = max(len(w) for w in labels) + 1
    header = " " * width + " ".join(f"{w[:4]:>5}" for w in labels)
    print("\nconfusion matrix (rows = truth, cols = predicted)")
    print(header)
    for word, row in zip(labels, cm):
        print(f"{word:<{width}}" + " ".join(f"{n:>5}" for n in row))


# CLI
def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--folds", type=int, default=cfg.CV_FOLDS)
    ap.add_argument("--trees", type=int, default=cfg.N_ESTIMATORS)
    args = ap.parse_args(argv)

    X, y = load_dataset()
    labels = sorted(set(y))
    counts = {w: int((y == w).sum()) for w in labels}
    print("captures per word:", counts)

    smallest = min(counts.values())
    if smallest < 2:
        print(f"\nneed at least 2 captures per word to score; smallest class has {smallest}")
        return 1

    folds = min(args.folds, smallest)
    if folds < args.folds:
        print(f"folds reduced {args.folds} -> {folds} (smallest class has {smallest})")

    clf = RandomForestClassifier(
        n_estimators=args.trees,
        random_state=cfg.RANDOM_STATE,
        class_weight="balanced",
        n_jobs=-1,
    )

    cv = StratifiedKFold(n_splits=folds, shuffle=True, random_state=cfg.RANDOM_STATE)
    y_pred = cross_val_predict(clf, X, y, cv=cv)
    print(f"\ncross-validated accuracy: {(y_pred == y).mean():.3f}  ({folds}-fold)")
    print("\n" + classification_report(y, y_pred, zero_division=0))
    print_confusion(y, y_pred, labels)

    clf.fit(X, y)
    ranked = sorted(zip(FEATURE_NAMES, clf.feature_importances_), key=lambda p: -p[1])
    print("\ntop features: " + ", ".join(f"{n} {v:.2f}" for n, v in ranked[:5]))

    cfg.MODEL_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(
        {
            "clf": clf,
            "labels": labels,
            "n_features": cfg.N_FEATURES,
            "classify_s": cfg.CLASSIFY_S,
        },
        cfg.MODEL_PATH,
    )
    print(f"\nsaved {cfg.MODEL_PATH.relative_to(cfg.ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

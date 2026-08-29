"""constants — vocab, carrier phrases, tunables, paths"""
from pathlib import Path

# Paths
ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
MODEL_DIR = ROOT / "models"
MODEL_PATH = MODEL_DIR / "model.joblib"

# Serial
BAUD = 115200
SAMPLE_HZ = 500
ADC_MAX = 4095  # ESP32 analogReadResolution(12)

# Capture Time
# One silently-mouthed word. Must match between collect.py and live.py:
WINDOW_S = 1.2 #The size to record
WINDOW_SAMPLES = int(WINDOW_S * SAMPLE_HZ)

# Word Import
from lib.wordData import CORE_WORDS, FULL_WORDS, WORDS, CARRIER  # noqa: F401

# Feature Extraction
N_SLICES = 3  # envelope shape over time
N_FEATURES = 8 + N_SLICES * 2  # 8 whole-window + 2 per slice = 14

# Onset Detection
RING_S = 2.0  # serial ring buffer depth
RING_SAMPLES = int(RING_S * SAMPLE_HZ)
BASELINE_S = 1.0  # rolling quiet-window baseline
BASELINE_SAMPLES = int(BASELINE_S * SAMPLE_HZ)
ONSET_K = 3.0  # trigger at baseline + K * std; start generous, tighten later
ONSET_MIN_MS = 80  # must stay above threshold this long to count
REFRACTORY_S = 1.5  # ignore new triggers while a capture is in flight

# Model
N_ESTIMATORS = 300
CV_FOLDS = 5
RANDOM_STATE = 0
CONF_THRESHOLD = 0.45

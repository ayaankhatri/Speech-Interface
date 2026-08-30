"""constants — vocab, tunables, paths"""
from pathlib import Path

# Paths
ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
MODEL_DIR = ROOT / "models"
MODEL_PATH = MODEL_DIR / "model.joblib"

# Serial: connection with hardware
BAUD = 115200
SAMPLE_HZ = 500
ADC_MAX = 4095
N_CHANNELS = 1
MAINS_HZ = 50  # local mains frequency; 60 in US/JP -- drives the notch filter

# Capture Time
WINDOW_S = 1.4
WINDOW_SAMPLES = int(WINDOW_S * SAMPLE_HZ)

# Classifier Window
CLASSIFY_S = 1.0
CLASSIFY_SAMPLES = int(CLASSIFY_S * SAMPLE_HZ)
ALIGN_FRAC = 0.2

# Word Import
from lib.wordData import CORE_WORDS, FULL_WORDS, WORDS  # noqa: F401

# Feature Extraction
SMOOTH_MS = 50
SMOOTH_SAMPLES = max(1, int(SMOOTH_MS * SAMPLE_HZ / 1000))
ACTIVE_FRAC = 0.5
N_SLICES = 3
N_FEATURES_PER_CH = 8 + N_SLICES * 2
N_FEATURES = N_CHANNELS * N_FEATURES_PER_CH

# Onset Detection
RING_S = 2.0
RING_SAMPLES = int(RING_S * SAMPLE_HZ)
BASELINE_S = 1.0
BASELINE_SAMPLES = int(BASELINE_S * SAMPLE_HZ)
ONSET_K = 3.0
ONSET_MIN_MS = 80
REFRACTORY_S = 1.5
PRE_ROLL_S = 0.2
PRE_ROLL_SAMPLES = int(PRE_ROLL_S * SAMPLE_HZ)

# Model
N_ESTIMATORS = 300
CV_FOLDS = 5
RANDOM_STATE = 0
CONF_THRESHOLD = 0.45

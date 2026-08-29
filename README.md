# Speech-Interface — Silent Signal

A sEMG interface that reads words you only *mouth*, silently, and speaks
them aloud. 
One sensor under the chin → ESP32 → laptop classifier → offline TTS + terminal dashboard.

## Layout

```
firmware/silent_signal_stream/   ESP32 sketch — samples one ADC channel @500Hz, streams "millis,adc"
silent_signal/                   Python package
  config.py       constants, vocabulary, carrier phrases, paths
  serial_reader.py background serial read -> ring buffer        [stub: phase 6]
  collect.py       prompted-recording CLI                       [stub: phase 3]
  dataset.py       load data/<word>/*.csv -> (X, y)
  features.py      envelope-window feature vector (14 dims)
  train.py         Random Forest + confusion matrix -> models/model.joblib
  onset.py         live onset detection                         [stub: phase 6]
  live.py          real-time inference loop + dashboard          [stub: phase 6]
  action.py        carrier phrase + pyttsx3 speech              [stub: phase 7]
  ui.py            rich full-screen dashboard, sparkline
  trackb/          phonetic extension                            [stub: phase 5b]
data/                            recorded CSVs (gitignored, person/session specific)
models/                          trained artifacts (gitignored)
```

## Setup

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

Flash `firmware/silent_signal_stream/` with the Arduino IDE. Verify the raw
signal in the Serial Plotter (swallow / tongue-to-palate → clear jump) before
touching Python.

## Workflow

```bash
python -m silent_signal.collect --word water --reps 30 --duration 1.2   # per word
python -m silent_signal.train                                           # review confusion matrix
python -m silent_signal.live --port /dev/tty.usbserial-XXXX             # demo
```

# Speech-Interface — Silent Signal

A sEMG interface that reads words you only *mouth*, silently, and speaks
them aloud. 
Two sEMG sensors → ESP32 → laptop classifier → offline TTS + terminal dashboard.

## Layout

```
firmware/silent_signal_stream/   ESP32 sketch — samples two ADC channels @500Hz, streams "adc1<TAB>adc2"
silent_signal/                   Python package
  config.py       constants, vocabulary, paths
  serial_reader.py background serial read -> ring buffer        [stub: phase 6]
  collect.py       prompted-recording CLI                       [stub: phase 3]
  dataset.py       load data/<word>/*.csv -> (X, y)
  features.py      envelope-window feature vector (14 dims/channel, 28 total)
  train.py         Random Forest + confusion matrix -> models/model.joblib
  onset.py         live onset detection                         [stub: phase 6]
  live.py          real-time inference loop + dashboard          [stub: phase 6]
  action.py        pyttsx3 speech                               [stub: phase 7]
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

Generated captures, while the hardware is still on the bench or when 30 real
reps per word is too thin:

```bash
python -m silent_signal.synth --reps 40                 # invent data_synth/
python -m silent_signal.synth --from data --reps 5      # jitter real captures
python -m silent_signal.train --data-dir data_synth
```

## Demo without firmware

`replay.py` plays a capture directory into the live loop at 500 Hz with resting
gaps between words, so onset detection, the feature front end and the model all
run exactly as they would on the ESP32 — only the sample source changes.

```bash
python -m silent_signal.live --replay data_synth --no-speak     # terminal
python -m silent_signal.server --replay data_synth              # + SSE on :8000
cd web && npm run dev                                           # dashboard
```

Turn the TV on and the page subscribes to `/events`; colour bars mean no
classifier is running. `--speed 6` replays faster than real time, `--gap` sets
the rest between words (never below `config.REFRACTORY_S`, or words are
swallowed). `VITE_SIGNAL_URL` points the page at another host.

Synthetic words are separable by construction, so that confusion matrix scores
the generator, not the interface. Keep the two sets apart — `synth.py` refuses
to write into `data/`.

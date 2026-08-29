# Silent Signal — Web Dashboard

A retro-CRT dashboard for the Silent Signal sEMG speech interface, implemented
from the Figma design (`node-id=60-721`). TypeScript + React + Tailwind.

## Run

```bash
cd web
npm install
npm run dev      # http://localhost:5173
```

## What it does

- **Connection status** (top-left): green **Connected** when the hardware link
  is up, red **Disconnected** otherwise. Click it to toggle.
- **Detected Word** box: words are appended as they're detected and kept in a
  cache. Only the newest words that fit within **three rows** are shown — when a
  new word overflows the last row, the oldest visible word drops off the front
  and everything shifts up. Text never leaves the box, whatever the word length.
- **Probabilistic Words** box: the classifier's top-5 candidates for the latest
  detection.
- **Dino**: patrols the floor of the Detected Word box between the words and the
  box edge. Walks forward while hovered, and hops each time a new word arrives.
- **Controls**: **START** begins a simulated live-detection stream (also
  <kbd>Space</kbd>), **STOP** halts it, **HISTORY** shows the full cache,
  **CLEAR** empties the box.
- The **say a word** input below the TV feeds arbitrary words in for testing —
  including very long ones, to confirm they stay inside the box.

Wire `addWord()` in `src/hooks/useWordStream.ts` to the real classifier output
(e.g. a WebSocket from `silent_signal.live`) to drive it from live hardware.

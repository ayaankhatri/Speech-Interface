// Word stream — server-sent events from the Python classifier (silent_signal.server)
import { useCallback, useEffect, useRef, useState } from "react";
import { randomWord } from "../vocab";

export interface Prediction {
  word: string;
  confidence: number;
  truth?: string | null;
}

export interface WordStream {
  words: string[];
  latest: string;
  latestPrediction: Prediction | null;
  jumpSignal: number;
  /**
   * Power intent: the set is switched on and has a word source, whether that is
   * a live classifier or the built-in simulator. This is what the status light
   * reports, so switching on reads "Connected".
   */
  powered: boolean;
  /**
   * Whether a classifier is actually answering on the wire. Drives the error
   * text and decides if the simulator should stand in — not the status light,
   * which would otherwise read "Disconnected" on a set that is plainly running.
   */
  connected: boolean;
  streaming: boolean;
  error: string;
  addWord: (word: string) => void;
  clear: () => void;
  connect: () => void;
  disconnect: () => void;
  toggleConnection: () => void;
  startStream: () => void;
  stopStream: () => void;
}

// Where the Python side publishes. Override with VITE_SIGNAL_URL to point at another host.
const EVENTS_URL = import.meta.env.VITE_SIGNAL_URL ?? "http://127.0.0.1:8000/events";

// Simulated detection cadence, matching WINDOW_S in the Python config.
const STREAM_INTERVAL_MS = 1400;

interface SignalEvent {
  kind: "prediction" | "rejected" | "status";
  word?: string;
  confidence?: number;
  truth?: string | null;
  message?: string;
}

export function useWordStream(): WordStream {
  const [words, setWords] = useState<string[]>([]);
  const [latestPrediction, setLatestPrediction] = useState<Prediction | null>(null);
  // `open` is intent — the set is powered on, so hold the feed open. `connected` is
  // what the feed actually reports, so the status light can't claim a server that
  // isn't there. `streaming` is the Start/Stop gate on top of a live connection.
  const [open, setOpen] = useState(false);
  const [connected, setConnected] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState("");
  const [jumpSignal, setJumpSignal] = useState(0);
  const source = useRef<EventSource | null>(null);
  // Read from inside the message handler so Stop pauses the words without tearing
  // the EventSource down and losing its retry state.
  const streamingRef = useRef(false);

  useEffect(() => {
    streamingRef.current = streaming;
  }, [streaming]);

  const addWord = useCallback((word: string) => {
    const clean = word.trim();
    if (!clean) return;
    setWords((prev) => [...prev, clean]);
    setJumpSignal((n) => n + 1);
  }, []);

  const clear = useCallback(() => setWords([]), []);

  const connect = useCallback(() => setOpen(true), []);

  const disconnect = useCallback(() => {
    setOpen(false);
    setStreaming(false);
  }, []);

  const toggleConnection = useCallback(() => {
    if (open) {
      setOpen(false);
      setStreaming(false);
    } else {
      setOpen(true);
    }
  }, [open]);

  // Start implies a connection: pressing it on a cold set opens the feed too.
  const startStream = useCallback(() => {
    setOpen(true);
    setStreaming(true);
  }, []);

  const stopStream = useCallback(() => setStreaming(false), []);

  // EventSource retries on its own, so a server started after the page stays reachable.
  useEffect(() => {
    if (!open) {
      setConnected(false);
      return;
    }
    const es = new EventSource(EVENTS_URL);
    source.current = es;

    es.onopen = () => {
      setConnected(true);
      setError("");
    };
    es.onerror = () => {
      setConnected(false);
      setError(`no classifier at ${EVENTS_URL}`);
    };
    es.onmessage = (e) => {
      const event: SignalEvent = JSON.parse(e.data);
      if (event.kind !== "prediction" || !event.word) return;
      if (!streamingRef.current) return;
      setLatestPrediction({
        word: event.word,
        confidence: event.confidence ?? 0,
        truth: event.truth ?? null,
      });
      addWord(event.word);
    };

    return () => {
      es.close();
      source.current = null;
      setConnected(false);
    };
  }, [open, addWord]);

  // Simulated detection loop, so Start still produces words with no hardware and
  // no classifier running. A live feed takes over the moment one connects.
  useEffect(() => {
    if (!streaming || connected) return;
    const id = window.setInterval(() => addWord(randomWord()), STREAM_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [streaming, connected, addWord]);

  return {
    words,
    latest: words.length ? words[words.length - 1] : "",
    latestPrediction,
    jumpSignal,
    powered: open,
    connected,
    streaming,
    error,
    addWord,
    clear,
    connect,
    disconnect,
    toggleConnection,
    startStream,
    stopStream,
  };
}

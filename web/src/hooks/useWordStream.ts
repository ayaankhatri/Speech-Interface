// Word stream — server-sent events from the Python classifier (silent_signal.server)
import { useCallback, useEffect, useRef, useState } from "react";

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
  connected: boolean;
  streaming: boolean;
  error: string;
  addWord: (word: string) => void;
  clear: () => void;
  toggleConnection: () => void;
  startStream: () => void;
  stopStream: () => void;
}

// Where the Python side publishes. Override with VITE_SIGNAL_URL to point at another host.
const EVENTS_URL = import.meta.env.VITE_SIGNAL_URL ?? "http://127.0.0.1:8000/events";

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
  const [connected, setConnected] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState("");
  const [jumpSignal, setJumpSignal] = useState(0);
  const source = useRef<EventSource | null>(null);

  const addWord = useCallback((word: string) => {
    const clean = word.trim();
    if (!clean) return;
    setWords((prev) => [...prev, clean]);
    setJumpSignal((n) => n + 1);
  }, []);

  const clear = useCallback(() => setWords([]), []);

  const stopStream = useCallback(() => {
    setStreaming(false);
    source.current?.close();
    source.current = null;
    setConnected(false);
  }, []);

  const startStream = useCallback(() => setStreaming(true), []);

  const toggleConnection = useCallback(() => {
    // The status light is the stream: connected means the classifier feed is open.
    setStreaming((prev) => {
      if (prev) {
        source.current?.close();
        source.current = null;
        setConnected(false);
      }
      return !prev;
    });
  }, []);

  // EventSource retries on its own, so a server started after the page stays reachable.
  useEffect(() => {
    if (!streaming) return;
    const es = new EventSource(EVENTS_URL);
    source.current = es;

    es.onopen = () => {
      setConnected(true);
      setError("");
    };
    es.onerror = () => {
      setConnected(false);
      setError(`no classifier at ${EVENTS_URL} — run: python -m silent_signal.server --replay data_synth`);
    };
    es.onmessage = (e) => {
      const event: SignalEvent = JSON.parse(e.data);
      if (event.kind !== "prediction" || !event.word) return;
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
  }, [streaming, addWord]);

  return {
    words,
    latest: words.length ? words[words.length - 1] : "",
    latestPrediction,
    jumpSignal,
    connected,
    streaming,
    error,
    addWord,
    clear,
    toggleConnection,
    startStream,
    stopStream,
  };
}

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
  connect: () => void;
  disconnect: () => void;
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
      setError(`no classifier at ${EVENTS_URL} — run: python -m silent_signal.server --replay data_synth`);
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
    connect,
    disconnect,
    toggleConnection,
    startStream,
    stopStream,
  };
}

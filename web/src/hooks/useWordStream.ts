import { useCallback, useEffect, useRef, useState } from "react";
import { randomWord } from "../vocab";

export interface WordStream {
  /** Every word detected this session (the cache). Newest last. */
  words: string[];
  /** Most recently detected word, or "" before anything is said. */
  latest: string;
  /** Increments on every new word — used to trigger the dino's jump. */
  jumpSignal: number;
  connected: boolean;
  streaming: boolean;
  addWord: (word: string) => void;
  clear: () => void;
  toggleConnection: () => void;
  startStream: () => void;
  stopStream: () => void;
}

const STREAM_INTERVAL_MS = 1400; // matches WINDOW_S in the Python config

export function useWordStream(): WordStream {
  const [words, setWords] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [jumpSignal, setJumpSignal] = useState(0);
  const timer = useRef<number | null>(null);

  const addWord = useCallback((word: string) => {
    const clean = word.trim();
    if (!clean) return;
    setWords((prev) => [...prev, clean]);
    setJumpSignal((n) => n + 1);
  }, []);

  const clear = useCallback(() => setWords([]), []);

  const stopStream = useCallback(() => {
    setStreaming(false);
    if (timer.current !== null) {
      window.clearInterval(timer.current);
      timer.current = null;
    }
  }, []);

  const startStream = useCallback(() => {
    setConnected(true);
    setStreaming(true);
  }, []);

  const toggleConnection = useCallback(() => {
    setConnected((prev) => {
      if (prev) stopStream(); // disconnecting also halts the live stream
      return !prev;
    });
  }, [stopStream]);

  // Drive the simulated live-detection loop while streaming.
  useEffect(() => {
    if (!streaming) return;
    timer.current = window.setInterval(() => {
      addWord(randomWord());
    }, STREAM_INTERVAL_MS);
    return () => {
      if (timer.current !== null) {
        window.clearInterval(timer.current);
        timer.current = null;
      }
    };
  }, [streaming, addWord]);

  return {
    words,
    latest: words.length ? words[words.length - 1] : "",
    jumpSignal,
    connected,
    streaming,
    addWord,
    clear,
    toggleConnection,
    startStream,
    stopStream,
  };
}

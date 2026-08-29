"""action layer — predicted word to carrier phrase + pyttsx3 speech

pyttsx3's engine blocks while it speaks and is not safe to drive from two
threads, so it lives on one worker thread behind a queue and the live loop just
posts words to it.
"""
from __future__ import annotations

import queue
import threading

from . import config as cfg


def phrase_for(word: str) -> str:
    return cfg.CARRIER.get(word, word)


class Speaker:
    def __init__(self, enabled: bool = True) -> None:
        self.enabled = enabled
        self.last_error: str | None = None
        self._queue: queue.Queue[str | None] = queue.Queue()
        self._thread: threading.Thread | None = None

    def start(self) -> "Speaker":
        if not self.enabled or self._thread is not None:
            return self
        self._thread = threading.Thread(target=self._run, name="speaker", daemon=True)
        self._thread.start()
        return self

    def say(self, word: str) -> str:
        text = phrase_for(word)
        if self.enabled:
            self._queue.put(text)
        return text

    def stop(self) -> None:
        if self._thread is not None:
            self._queue.put(None)
            self._thread.join(timeout=3.0)
            self._thread = None

    def __enter__(self) -> "Speaker":
        return self.start()

    def __exit__(self, *exc) -> None:
        self.stop()

    def _run(self) -> None:
        try:
            import pyttsx3

            engine = pyttsx3.init()
        except Exception as exc:
            self.last_error = f"TTS unavailable: {exc}"
            self.enabled = False
            return
        while True:
            text = self._queue.get()
            if text is None:
                break
            try:
                engine.say(text)
                engine.runAndWait()
            except Exception as exc:
                self.last_error = str(exc)

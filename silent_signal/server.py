"""event server — the live loop's predictions over SSE, for the web dashboard

    python -m silent_signal.server --replay data_synth        # no hardware
    python -m silent_signal.server --port /dev/tty.usbserial-XXXX

The browser cannot open a serial port or load a joblib model, so the classifier
stays in Python and the page subscribes to what it decides. Server-sent events
rather than a websocket: the traffic is one-way and EventSource reconnects on
its own, so neither side needs a protocol of its own.

Each subscriber gets its own queue and the live loop's sink fans out to all of
them. A subscriber that stops draining (a closed laptop lid, a paused tab) fills
its queue and is dropped at DROP_AFTER events rather than blocking the loop that
feeds every other one.
"""
from __future__ import annotations

import argparse
import json
import queue
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from . import config as cfg
from .live import add_source_args, build_reader, run

QUEUE_DEPTH = 64
DROP_AFTER = 32          # queued events a dead subscriber may bank before it is cut
KEEPALIVE_S = 15.0       # SSE comment interval, to hold proxies open


class Hub:
    """Fan-out of live-loop events to every connected browser."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._subs: list[queue.Queue[dict]] = []
        self.last: dict | None = None

    def subscribe(self) -> queue.Queue[dict]:
        q: queue.Queue[dict] = queue.Queue(maxsize=QUEUE_DEPTH)
        with self._lock:
            self._subs.append(q)
        return q

    def unsubscribe(self, q: queue.Queue[dict]) -> None:
        with self._lock:
            if q in self._subs:
                self._subs.remove(q)

    def publish(self, event: dict) -> None:
        event = {**event, "t": time.time()}
        self.last = event
        with self._lock:
            subs = list(self._subs)
        for q in subs:
            try:
                q.put_nowait(event)
            except queue.Full:
                self.unsubscribe(q)


def make_handler(hub: Hub, origin: str):
    class Handler(BaseHTTPRequestHandler):
        protocol_version = "HTTP/1.1"

        def log_message(self, *args) -> None:      # one line per prediction is plenty
            pass

        def _cors(self) -> None:
            self.send_header("Access-Control-Allow-Origin", origin)

        def do_OPTIONS(self) -> None:
            self.send_response(204)
            self._cors()
            self.send_header("Access-Control-Allow-Headers", "*")
            self.send_header("Content-Length", "0")
            self.end_headers()

        def do_GET(self) -> None:
            if self.path.startswith("/events"):
                return self._events()
            if self.path == "/" or self.path.startswith("/health"):
                return self._health()
            self.send_error(404)

        def _health(self) -> None:
            body = json.dumps({"ok": True, "words": cfg.WORDS, "last": hub.last}).encode()
            self.send_response(200)
            self._cors()
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def _events(self) -> None:
            q = hub.subscribe()
            self.send_response(200)
            self._cors()
            self.send_header("Content-Type", "text/event-stream")
            self.send_header("Cache-Control", "no-cache")
            self.send_header("Connection", "keep-alive")
            self.end_headers()
            try:
                while True:
                    try:
                        event = q.get(timeout=KEEPALIVE_S)
                        payload = f"data: {json.dumps(event)}\n\n"
                    except queue.Empty:
                        payload = ": keepalive\n\n"
                    self.wfile.write(payload.encode())
                    self.wfile.flush()
            except (BrokenPipeError, ConnectionResetError):
                pass
            finally:
                hub.unsubscribe(q)

    return Handler


def main(argv: list[str] | None = None) -> int:
    ap = add_source_args(argparse.ArgumentParser(description=__doc__))
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--http-port", type=int, default=8000)
    ap.add_argument("--origin", default="*", help="Access-Control-Allow-Origin for the page")
    ap.add_argument("--no-speak", action="store_true", help="predict without TTS")
    args = ap.parse_args(argv)

    hub = Hub()

    def sink(event: dict) -> None:
        hub.publish(event)
        kind = event["kind"]
        if kind == "prediction":
            print(f"  {event['word']:<10} p={event['confidence']:.2f}")
        elif kind == "status":
            print(f"  {event['message']}")

    try:
        reader = build_reader(args)
    except FileNotFoundError as exc:
        print(exc)
        return 1

    server = ThreadingHTTPServer((args.host, args.http_port), make_handler(hub, args.origin))
    server.daemon_threads = True
    threading.Thread(target=server.serve_forever, name="sse-server", daemon=True).start()
    print(f"  events on http://{args.host}:{args.http_port}/events")

    try:
        return run(reader, sink=sink, speak=not args.no_speak)
    except (FileNotFoundError, ValueError) as exc:
        print(exc)
        return 1
    finally:
        server.shutdown()


if __name__ == "__main__":
    sys.exit(main())

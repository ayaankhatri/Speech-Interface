// App shell
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { FRAME } from "./layout";
import { useWordStream } from "./hooks/useWordStream";
import Home from "./components/home/Home";
import History from "./components/history/History";
import ColorBar from "./components/colorbar/ColorBar";
import TvOff from "./components/tvoff/TvOff";
import MobileHome from "./components/mobile/MobileHome";
import MobileHistory from "./components/mobile/MobileHistory";
import MobileTvOff from "./components/mobile/MobileTvOff";
import MobileTvOn from "./components/mobile/MobileTvOn";
import MobileOff from "./components/mobile/MobileOff";
import TvOn from "./components/tvoff/TvOn";

export default function App() {
  const stream = useWordStream();
  const [showHistory, setShowHistory] = useState(false);
  const [turnOff, setTurnOff] = useState<"idle" | "status" | "screen">("idle");
  const [turningOn, setTurningOn] = useState(false);
  const [draft, setDraft] = useState("");

  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useLayoutEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const fit = () => {
      const s = Math.min(el.clientWidth / FRAME.width, el.clientHeight / FRAME.height);
      setScale(s > 0 ? s : 1);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        stream.streaming ? stream.stopStream() : stream.startStream();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stream]);

  const powerOff = () => {
    // Whatever screen you powered off from stays up until the tube collapses;
    // it is cleared on the way back on, not here.
    if (stream.connected) stream.toggleConnection();
    setTurningOn(false);
    setTurnOff("status");
    window.setTimeout(() => setTurnOff("screen"), 600);
  };

  const powerOn = () => {
    setShowHistory(false);
    if (!stream.connected) stream.toggleConnection();
    setTurnOff("idle");
    setTurningOn(true);
  };

  const submitDraft = () => {
    if (!draft.trim()) return;
    stream.addWord(draft);
    setDraft("");
  };

  if (mobile) {
    if (turnOff === "screen") return <MobileTvOff onDone={() => setTurnOff("idle")} />;
    if (!stream.connected && turnOff === "idle") return <MobileOff onPower={powerOn} />;
    return (
      <div className="relative h-full w-full">
        {showHistory ? (
          <MobileHistory
            words={stream.words}
            connected={stream.connected}
            onBack={() => setShowHistory(false)}
            onClear={stream.clear}
            onPower={powerOff}
          />
        ) : (
          <MobileHome stream={stream} onPower={powerOff} onHistory={() => setShowHistory(true)} />
        )}
        {turningOn && <MobileTvOn onDone={() => setTurningOn(false)} />}
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-4">
      <div ref={wrapperRef} className="flex min-h-0 w-full flex-1 items-center justify-center">
        <div
          className="relative overflow-hidden bg-gradient-to-b from-[#191717] to-[#484645]"
          style={{ width: FRAME.width, height: FRAME.height, transform: `scale(${scale})`, transformOrigin: "center" }}
        >
          <Home stream={stream} onPower={powerOff} onHistory={() => setShowHistory((v) => !v)} />

          {showHistory && (
            <History
              words={stream.words}
              connected={stream.connected}
              onBack={() => setShowHistory(false)}
              onClear={stream.clear}
              onPower={powerOff}
            />
          )}

          {!stream.connected && turnOff === "idle" && <ColorBar onPower={powerOn} />}

          {turnOff === "screen" && <TvOff onDone={() => setTurnOff("idle")} />}

          {turningOn && <TvOn onDone={() => setTurningOn(false)} />}
        </div>
      </div>

      <div className="flex items-center gap-2 font-handjet text-white/80">
        <span className="text-sm uppercase tracking-widest text-white/40">say a word</span>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submitDraft()}
          placeholder="type + Enter…"
          className="w-56 rounded-md border border-white/20 bg-black/40 px-3 py-1 text-white placeholder:text-white/30 focus:border-white/50 focus:outline-none"
        />
        <button
          type="button"
          onClick={submitDraft}
          className="rounded-md border border-white/20 bg-white/10 px-3 py-1 hover:bg-white/20"
        >
          add
        </button>
      </div>
    </div>
  );
}

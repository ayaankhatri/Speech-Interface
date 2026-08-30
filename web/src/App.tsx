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
import MobileOff from "./components/mobile/MobileOff";

type Power = "on" | "closing" | "collapsing" | "off";

// How long the disconnected status stays readable before the tube collapses.
const OFF_STATUS_MS = 600;
// The set comes up disconnected, then links, so the change is visible.
const CONNECT_DELAY_MS = 1400;

export default function App() {
  const stream = useWordStream();
  const [showHistory, setShowHistory] = useState(false);
  // "closing" holds the lit picture while the status flips to Disconnected;
  // "collapsing" is the CRT discharge; "off" is the dead screen.
  const [power, setPower] = useState<Power>("off");
  const [draft, setDraft] = useState("");
  const powerTimer = useRef<number | null>(null);

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
        if (power !== "on") return;
        stream.streaming ? stream.stopStream() : stream.startStream();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stream, power]);

  const clearPowerTimer = () => {
    if (powerTimer.current !== null) {
      window.clearTimeout(powerTimer.current);
      powerTimer.current = null;
    }
  };
  useEffect(() => clearPowerTimer, []);

  // History stays up through the shutdown, so switching off from it closes the
  // set directly instead of flashing home first.
  const powerOff = () => {
    clearPowerTimer();
    stream.disconnect();
    setPower("closing");
    powerTimer.current = window.setTimeout(() => setPower("collapsing"), OFF_STATUS_MS);
  };

  // Runs once the tube has finished collapsing.
  const finishPowerOff = () => {
    setPower("off");
    // The set always comes back up on home.
    setShowHistory(false);
  };

  const powerOn = () => {
    clearPowerTimer();
    setPower("on");
    powerTimer.current = window.setTimeout(() => stream.connect(), CONNECT_DELAY_MS);
  };

  const submitDraft = () => {
    if (!draft.trim()) return;
    stream.addWord(draft);
    setDraft("");
  };

  if (mobile) {
    if (power === "collapsing") return <MobileTvOff onDone={finishPowerOff} />;
    if (power === "off") return <MobileOff onPower={powerOn} />;
    return showHistory ? (
      <MobileHistory
        words={stream.words}
        connected={stream.connected}
        onBack={() => setShowHistory(false)}
        onClear={stream.clear}
        onPower={powerOff}
      />
    ) : (
      <MobileHome stream={stream} onPower={powerOff} onHistory={() => setShowHistory(true)} />
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

          {power === "off" && <ColorBar onPower={powerOn} />}

          {power === "collapsing" && <TvOff onDone={finishPowerOff} />}
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

        {stream.latestPrediction && (
          <span className="text-sm text-white/50">
            {stream.latestPrediction.word} p={stream.latestPrediction.confidence.toFixed(2)}
          </span>
        )}
        {stream.error && <span className="text-sm text-status-red">{stream.error}</span>}
      </div>
    </div>
  );
}

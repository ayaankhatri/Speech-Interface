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
  const powerTimer = useRef<number | null>(null);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [mobile, setMobile] = useState(false);

  // Single read of what the set is doing. Keyed off power intent, not
  // `connected` — the set stays on whether or not a classifier is listening.
  const power: "on" | "off" | "shutting-down" =
    turnOff !== "idle" ? "shutting-down" : stream.powered ? "on" : "off";

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
    // Whatever screen you powered off from stays up until the tube collapses;
    // it is cleared on the way back on, not here.
    stream.disconnect();
    setTurningOn(false);
    setTurnOff("status");
    clearPowerTimer();
    powerTimer.current = window.setTimeout(() => setTurnOff("screen"), 600);
  };

  const powerOn = () => {
    // Drops a shutdown still inside its 600ms status pause, so switching back on
    // can't be followed by the tube collapsing anyway.
    clearPowerTimer();
    setShowHistory(false);
    stream.connect();
    setTurnOff("idle");
    setTurningOn(true);
  };

  if (mobile) {
    if (turnOff === "screen") return <MobileTvOff onDone={() => setTurnOff("idle")} />;
    if (power === "off") return <MobileOff onPower={powerOn} />;
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
    <div className="flex h-full w-full flex-col items-center justify-center p-4">
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

          {turnOff === "screen" && <TvOff onDone={() => setTurnOff("idle")} />}

          {turningOn && <TvOn onDone={() => setTurningOn(false)} />}
        </div>
      </div>

    </div>
  );
}

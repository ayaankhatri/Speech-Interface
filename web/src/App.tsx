import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { FRAME, PANEL_LEFT, SCREEN, STICKERS, TITLE } from "./layout";
import { useWordStream } from "./hooks/useWordStream";
import { probabilisticWordsFor } from "./vocab";
import ConnectionStatus from "./components/ConnectionStatus";
import Panel from "./components/Panel";
import DetectedWords from "./components/DetectedWords";
import ProbabilisticWords from "./components/ProbabilisticWords";
import ControlButtons from "./components/ControlButtons";
import HistoryScreen from "./components/HistoryScreen";

export default function App() {
  const stream = useWordStream();
  const [showHistory, setShowHistory] = useState(false);
  const [draft, setDraft] = useState("");

  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const titleTextRef = useRef<HTMLSpanElement>(null);
  const [folderPos, setFolderPos] = useState<{ left: number; top: number }>({
    left: STICKERS.folder.left,
    top: STICKERS.folder.top,
  });

  useLayoutEffect(() => {
    const el = titleTextRef.current;
    if (!el) return;
    const place = () => {
      const rightEdge = SCREEN.left + el.offsetLeft + el.offsetWidth;
      const bottomEdge = TITLE.top + el.offsetHeight;
      setFolderPos({ left: rightEdge - 14, top: bottomEdge - STICKERS.folder.height / 2 });
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(el);
    document.fonts?.ready.then(place).catch(() => {});
    return () => ro.disconnect();
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

  const submitDraft = () => {
    if (!draft.trim()) return;
    stream.addWord(draft);
    setDraft("");
  };

  const candidates = probabilisticWordsFor(stream.latest);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-4">
      <div ref={wrapperRef} className="flex min-h-0 w-full flex-1 items-center justify-center">
        <div
          className="relative overflow-hidden bg-gradient-to-b from-[#191717] to-[#484645]"
          style={{
            width: FRAME.width,
            height: FRAME.height,
            transform: `scale(${scale})`,
            transformOrigin: "center",
          }}
        >
          <img src="/assets/tv.svg" alt="" className="absolute inset-0 h-full w-full" />

          <Sticker src="/assets/stars.svg" spec={STICKERS.stars} />
          <Sticker src="/assets/camera.svg" spec={STICKERS.camera} />

          <h1
            className="absolute text-center font-handjet text-white"
            style={{ top: TITLE.top, fontSize: TITLE.fontSize, left: SCREEN.left, width: SCREEN.width }}
          >
            <span ref={titleTextRef}>Silent Signal</span>
          </h1>

          <Sticker src="/assets/folder.svg" spec={{ ...STICKERS.folder, ...folderPos }} />

          <ConnectionStatus connected={stream.connected} onToggle={stream.toggleConnection} />

          <Panel left={PANEL_LEFT.detected} label="Detected Word">
            <DetectedWords words={stream.words} jumpSignal={stream.jumpSignal} />
          </Panel>

          <Panel left={PANEL_LEFT.probabilistic} label="Probabilistic Words">
            <ProbabilisticWords candidates={candidates} />
          </Panel>

          <ControlButtons
            streaming={stream.streaming}
            onPower={stream.toggleConnection}
            onStart={stream.startStream}
            onStop={stream.stopStream}
            onHistory={() => setShowHistory((v) => !v)}
            onClear={stream.clear}
          />

          {showHistory && (
            <HistoryScreen
              words={stream.words}
              connected={stream.connected}
              onBack={() => setShowHistory(false)}
              onClear={stream.clear}
              onPower={stream.toggleConnection}
            />
          )}
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

function Sticker({
  src,
  spec,
}: {
  src: string;
  spec: { left: number; top: number; width: number; height: number; rotate: number };
}) {
  return (
    <img
      src={src}
      alt=""
      draggable={false}
      className="pointer-events-none absolute select-none"
      style={{
        left: spec.left,
        top: spec.top,
        width: spec.width,
        height: spec.height,
        transform: `rotate(${spec.rotate}deg)`,
      }}
    />
  );
}

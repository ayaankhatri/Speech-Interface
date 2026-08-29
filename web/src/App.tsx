import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { CONTROLS, DETECTED, FRAME, PROBABILISTIC, SCREEN, STICKERS, TITLE } from "./layout";
import { useWordStream } from "./hooks/useWordStream";
import { probabilisticWordsFor } from "./vocab";
import ConnectionStatus from "./components/ConnectionStatus";
import DetectedWords from "./components/DetectedWords";
import ProbabilisticWords from "./components/ProbabilisticWords";
import ControlButtons from "./components/ControlButtons";

export default function App() {
  const stream = useWordStream();
  const [showHistory, setShowHistory] = useState(false);
  const [draft, setDraft] = useState("");

  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // The folder sticker is pinned to the title's bottom-right corner. Because the
  // title is centred with a custom web font, we measure the actual rendered text
  // rather than guessing where it ends.
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
      // Nudge so the folder overlaps the corner, hanging off the bottom-right.
      setFolderPos({ left: rightEdge - 14, top: bottomEdge - STICKERS.folder.height / 2 });
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(el);
    // Re-measure once the web font finishes loading (changes text width).
    document.fonts?.ready.then(place).catch(() => {});
    return () => ro.disconnect();
  }, []);

  // Scale the fixed 1280x832 stage to fit whatever space it's given.
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

  // Keyboard: space to toggle the stream, for demo convenience.
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
        {/* Fixed-size design stage, scaled to fit. */}
        <div
          className="relative overflow-hidden bg-gradient-to-b from-[#191717] to-[#484645]"
          style={{
            width: FRAME.width,
            height: FRAME.height,
            transform: `scale(${scale})`,
            transformOrigin: "center",
          }}
        >
          {/* Retro-TV background (Figma "tv.svg", exact 1280x832 frame) */}
          <img src="/assets/tv.svg" alt="" className="absolute inset-0 h-full w-full" />

          {/* Decorative stickers, matched to their Figma slots */}
          <Sticker src="/assets/stars.svg" spec={STICKERS.stars} />
          <Sticker src="/assets/camera.svg" spec={STICKERS.camera} />

          {/* --- Screen content --- */}
          <h1
            className="absolute text-center font-handjet text-white"
            style={{ top: TITLE.top, fontSize: TITLE.fontSize, left: SCREEN.left, width: SCREEN.width }}
          >
            <span ref={titleTextRef}>Silent Signal</span>
          </h1>

          {/* Folder pinned to the title's bottom-right edge (measured above) */}
          <Sticker src="/assets/folder.svg" spec={{ ...STICKERS.folder, ...folderPos }} />

          <ConnectionStatus connected={stream.connected} onToggle={stream.toggleConnection} />

          <span
            className="absolute font-handjet text-white"
            style={{ left: DETECTED.label.left, top: DETECTED.label.top, fontSize: DETECTED.label.fontSize }}
          >
            Detected Word
          </span>
          <span
            className="absolute font-handjet text-white"
            style={{ left: PROBABILISTIC.label.left, top: PROBABILISTIC.label.top, fontSize: PROBABILISTIC.label.fontSize }}
          >
            Probabilistic Words
          </span>

          <DetectedWords words={stream.words} jumpSignal={stream.jumpSignal} />
          <ProbabilisticWords candidates={candidates} />

          <ControlButtons
            streaming={stream.streaming}
            onPower={stream.toggleConnection}
            onStart={stream.startStream}
            onStop={stream.stopStream}
            onHistory={() => setShowHistory((v) => !v)}
            onClear={stream.clear}
          />

          {showHistory && (
            <HistoryOverlay words={stream.words} onClose={() => setShowHistory(false)} />
          )}
        </div>
      </div>

      {/* Testing aid (not part of the design): feed arbitrary words in. */}
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

function HistoryOverlay({ words, onClose }: { words: string[]; onClose: () => void }) {
  return (
    <div
      className="absolute z-10 flex flex-col rounded-[10px] border-[3px] border-dashed border-white/70 bg-black/85 p-4 font-handjet text-white backdrop-blur-sm"
      style={{ left: SCREEN.left + 40, top: SCREEN.top + 40, width: SCREEN.width - 80, height: CONTROLS.top - SCREEN.top - 40 }}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[28px]">History · {words.length} words</span>
        <button type="button" onClick={onClose} className="text-[24px] text-white/60 hover:text-white">
          ✕ close
        </button>
      </div>
      <div className="flex flex-wrap content-start gap-x-3 gap-y-1 overflow-y-auto text-[24px] leading-tight">
        {words.length === 0 ? (
          <span className="text-white/40">Nothing said yet.</span>
        ) : (
          words.map((w, i) => (
            <span key={i} className="text-white/85">
              {w}
            </span>
          ))
        )}
      </div>
    </div>
  );
}

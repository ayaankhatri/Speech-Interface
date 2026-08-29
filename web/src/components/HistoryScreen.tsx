import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { SCREEN, STICKERS, TITLE } from "../layout";

interface Props {
  words: string[];
  connected: boolean;
  onBack: () => void;
  onClear: () => void;
  onPower: () => void;
}

const BOX = { left: 95, top: 227, width: 810, height: 380 };
const BASE_PERIMETER = 2 * (BOX.width + BOX.height);
const SPEED = 150;
const CLOSED_MS = 200;
const CHASE_MS = 1000;
const COIN_COUNT = 6;
const PAC_SIZE = 47;
const GHOST_SIZE = 57;
const COIN_SIZE = 27;
const PAC_INSET = PAC_SIZE / 2;
const GHOST_INSET = GHOST_SIZE / 2;

const TEXT = { left: 125, top: 287, width: 720, height: 260 };
const TRACK = { left: 878, top: 247, width: 17, height: 340 };

type Edge = "top" | "right" | "bottom" | "left";

function pathPoint(frac: number, inset: number): { x: number; y: number; edge: Edge } {
  const L = BOX.left + inset;
  const T = BOX.top + inset;
  const W = BOX.width - 2 * inset;
  const H = BOX.height - 2 * inset;
  const per = 2 * (W + H);
  let d = ((((frac % 1) + 1) % 1)) * per;
  if (d < W) return { x: L + d, y: T, edge: "top" };
  d -= W;
  if (d < H) return { x: L + W, y: T + d, edge: "right" };
  d -= H;
  if (d < W) return { x: L + W - d, y: T + H, edge: "bottom" };
  d -= W;
  return { x: L, y: T + H - d, edge: "left" };
}

function pacTransform(edge: Edge): string {
  if (edge === "right") return "rotate(90deg)";
  if (edge === "bottom") return "scaleX(-1)";
  if (edge === "left") return "rotate(-90deg)";
  return "scaleX(1)";
}

function crossed(prev: number, cur: number, target: number): boolean {
  if (prev <= cur) return target > prev && target <= cur;
  return target > prev || target <= cur;
}

let coinSeq = 0;
function makeCoins() {
  return Array.from({ length: COIN_COUNT }, () => ({ id: coinSeq++, frac: Math.random() }));
}

function BoxRunners({ chaseSignal, wordsCount }: { chaseSignal: number; wordsCount: number }) {
  const [coins, setCoins] = useState(makeCoins);
  const [pac, setPac] = useState<{ x: number; y: number; edge: Edge; closed: boolean }>(() => ({
    ...pathPoint(0, PAC_INSET),
    closed: false,
  }));
  const [ghost, setGhost] = useState(() => pathPoint(0.5, GHOST_INSET));
  const [pacHidden, setPacHidden] = useState(false);

  const coinsRef = useRef(coins);
  coinsRef.current = coins;
  const phaseRef = useRef<"run" | "chase" | "caught">("run");
  const chaseStartRef = useRef(0);
  const closedUntilRef = useRef(0);
  const prevWordsRef = useRef(wordsCount);

  useEffect(() => {
    if (chaseSignal > 0) {
      phaseRef.current = "chase";
      chaseStartRef.current = performance.now();
    }
  }, [chaseSignal]);

  useEffect(() => {
    if (wordsCount > prevWordsRef.current && phaseRef.current !== "run") {
      phaseRef.current = "run";
      setPacHidden(false);
    }
    prevWordsRef.current = wordsCount;
  }, [wordsCount]);

  useEffect(() => {
    let raf = 0;
    let start: number | null = null;
    let prevFrac = 0;
    const loop = (t: number) => {
      if (start === null) {
        start = t;
        prevFrac = 0;
      }
      const frac = (((t - start) / 1000) * SPEED / BASE_PERIMETER) % 1;

      const current = coinsRef.current;
      const eaten = current.filter((c) => crossed(prevFrac, frac, c.frac)).map((c) => c.id);
      if (eaten.length) {
        closedUntilRef.current = t + CLOSED_MS;
        setCoins((prev) => {
          const kept = prev.filter((c) => !eaten.includes(c.id));
          const added = eaten.map(() => ({ id: coinSeq++, frac: Math.random() }));
          return [...kept, ...added];
        });
      }

      let gap = 0.5;
      if (phaseRef.current === "chase") {
        const prog = Math.min(1, (t - chaseStartRef.current) / CHASE_MS);
        gap = 0.5 * (1 - prog);
        if (prog >= 1) {
          phaseRef.current = "caught";
          setPacHidden(true);
        }
      } else if (phaseRef.current === "caught") {
        gap = 0;
      }

      const p = pathPoint(frac, PAC_INSET);
      setPac({ x: p.x, y: p.y, edge: p.edge, closed: t < closedUntilRef.current });
      setGhost(pathPoint(frac + gap, GHOST_INSET));

      prevFrac = frac;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <>
      {coins.map((c) => {
        const p = pathPoint(c.frac, PAC_INSET);
        return (
          <img
            key={c.id}
            src="/assets/coin.svg"
            alt=""
            draggable={false}
            className="pointer-events-none absolute select-none"
            style={{ left: p.x - COIN_SIZE / 2, top: p.y - COIN_SIZE / 2, width: COIN_SIZE, height: COIN_SIZE }}
          />
        );
      })}

      <img
        src="/assets/ghost.svg"
        alt=""
        draggable={false}
        className="pointer-events-none absolute select-none"
        style={{ left: ghost.x - GHOST_SIZE / 2, top: ghost.y - GHOST_SIZE / 2, width: GHOST_SIZE, height: GHOST_SIZE }}
      />

      {!pacHidden && (
        <img
          src={pac.closed ? "/assets/pac-man-closed.svg" : "/assets/pac-man.svg"}
          alt=""
          draggable={false}
          className="pointer-events-none absolute select-none"
          style={{ left: pac.x - PAC_SIZE / 2, top: pac.y - PAC_SIZE / 2, width: PAC_SIZE, height: PAC_SIZE, transform: pacTransform(pac.edge) }}
        />
      )}
    </>
  );
}

export default function HistoryScreen({ words, connected, onBack, onClear, onPower }: Props) {
  const history = words.length ? words.join(" - ") + " - " : "";

  const titleRef = useRef<HTMLSpanElement>(null);
  const [folderPos, setFolderPos] = useState<{ left: number; top: number }>({
    left: STICKERS.folder.left,
    top: STICKERS.folder.top,
  });

  useLayoutEffect(() => {
    const el = titleRef.current;
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

  const [chaseSignal, setChaseSignal] = useState(0);
  const handleClear = () => {
    onClear();
    setChaseSignal((n) => n + 1);
  };

  const scrollRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const [metrics, setMetrics] = useState({ top: 0, scroll: 0, client: 0 });

  const readMetrics = () => {
    const el = scrollRef.current;
    if (!el) return;
    setMetrics({ top: el.scrollTop, scroll: el.scrollHeight, client: el.clientHeight });
  };

  useLayoutEffect(() => {
    readMetrics();
  }, [history]);

  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (!draggingRef.current) return;
      const el = scrollRef.current;
      const tr = trackRef.current;
      if (!el || !tr) return;
      const rect = tr.getBoundingClientRect();
      const maxScroll = el.scrollHeight - el.clientHeight;
      if (maxScroll <= 0) return;
      const thumb = Math.max(28, (TRACK.height * el.clientHeight) / el.scrollHeight);
      const thumbPx = (thumb * rect.height) / TRACK.height;
      const range = rect.height - thumbPx;
      let f = range > 0 ? (e.clientY - rect.top - thumbPx / 2) / range : 0;
      f = Math.min(1, Math.max(0, f));
      el.scrollTop = f * maxScroll;
      readMetrics();
    };
    const up = () => {
      draggingRef.current = false;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, []);

  const maxScroll = metrics.scroll - metrics.client;
  const scrollable = maxScroll > 1;
  const thumbHeight = scrollable ? Math.max(28, (TRACK.height * metrics.client) / metrics.scroll) : 0;
  const thumbTop = scrollable ? (metrics.top / maxScroll) * (TRACK.height - thumbHeight) : 0;

  return (
    <div className="absolute inset-0 z-20 overflow-hidden bg-gradient-to-b from-[#191717] to-[#484645]">
      <img src="/assets/tv.svg" alt="" className="absolute inset-0 h-full w-full" />

      <span
        className="absolute whitespace-nowrap font-handjet leading-[normal] text-white"
        style={{ left: 95, top: 116, fontSize: 20 }}
      >
        {connected ? "Connected" : "Disconnected"}
      </span>
      <span
        className="absolute whitespace-nowrap font-handjet leading-[normal] text-white"
        style={{ left: 95, top: 196, fontSize: 24 }}
      >
        History
      </span>
      <div
        className={`absolute rounded-full border-2 shadow-[4px_12px_4px_0px_rgba(0,0,0,0.5)] ${
          connected ? "border-[#3a6e2b] bg-[#59eb30]" : "border-status-red-edge bg-status-red"
        }`}
        style={{ left: 171, top: 118, width: 17, height: 17 }}
      />

      <button
        type="button"
        onClick={onPower}
        aria-label="Power"
        className="absolute outline-none transition-transform duration-100 hover:scale-110 active:scale-95"
        style={{ left: 279, top: 667, width: 58.6165, height: 55.5169 }}
      >
        <span className="relative block h-full w-full">
          <img
            src="/assets/stars.svg"
            alt=""
            draggable={false}
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none"
            style={{ width: 88, height: (88 * 108) / 105 }}
          />
          <img src="/assets/btn-power.svg" alt="Power" draggable={false} className="absolute inset-0 h-full w-full select-none" />
        </span>
      </button>

      <div
        className="absolute rounded-[10px] border-[3px] border-dashed border-[#fefefe]"
        style={{ left: BOX.left, top: BOX.top, width: BOX.width, height: BOX.height }}
      />

      <div
        ref={scrollRef}
        onScroll={readMetrics}
        className="absolute overflow-y-auto text-center font-handjet [scrollbar-width:none] [word-break:break-word] [&::-webkit-scrollbar]:hidden"
        style={{ left: TEXT.left, top: TEXT.top, width: TEXT.width, height: TEXT.height, color: "#FFF", fontSize: 54, fontWeight: 400, lineHeight: "normal" }}
      >
        {history}
      </div>

      {scrollable && (
        <div ref={trackRef} className="absolute" style={{ left: TRACK.left, top: TRACK.top, width: TRACK.width, height: TRACK.height }}>
          <img
            src="/assets/scroll-bar.svg"
            alt=""
            draggable={false}
            onPointerDown={(e) => {
              e.preventDefault();
              draggingRef.current = true;
            }}
            className="absolute left-0 cursor-grab select-none active:cursor-grabbing"
            style={{ top: thumbTop, width: TRACK.width, height: thumbHeight }}
          />
        </div>
      )}

      <BoxRunners chaseSignal={chaseSignal} wordsCount={words.length} />

      <button
        type="button"
        onClick={onBack}
        aria-label="Go back"
        className="absolute outline-none transition-transform duration-100 hover:scale-110 active:scale-95"
        style={{ left: 407.62, top: 672, width: 119, height: 55 }}
      >
        <img src="/assets/btn-back.svg" alt="Go back" draggable={false} className="h-full w-full select-none" />
      </button>
      <button
        type="button"
        onClick={handleClear}
        aria-label="Clear"
        className="absolute outline-none transition-transform duration-100 hover:scale-110 active:scale-95"
        style={{ left: 596.62, top: 667, width: 119, height: 55 }}
      >
        <img src="/assets/btn-clear.svg" alt="Clear" draggable={false} className="h-full w-full select-none" />
      </button>

      <h1
        className="absolute text-center font-handjet text-white"
        style={{ top: TITLE.top, fontSize: TITLE.fontSize, left: SCREEN.left, width: SCREEN.width }}
      >
        <span ref={titleRef}>Silent Signal</span>
      </h1>

      <img
        src="/assets/folder.svg"
        alt=""
        draggable={false}
        className="pointer-events-none absolute select-none"
        style={{
          left: folderPos.left,
          top: folderPos.top,
          width: STICKERS.folder.width,
          height: STICKERS.folder.height,
          transform: `rotate(${STICKERS.folder.rotate}deg)`,
        }}
      />
    </div>
  );
}

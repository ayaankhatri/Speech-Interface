// History screen
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { SCREEN, STICKERS, TITLE } from "../../layout";
import ConnectionStatus from "../home/ConnectionStatus";

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
const RESET_MS = 500;
const COIN_COUNT = 6;
const PAC_SIZE = 47;
const GHOST_SIZE = 57;
const COIN_SIZE = 27;

const TEXT = { left: 125, top: 287, width: 720, height: 260 };

type Edge = "top" | "right" | "bottom" | "left";

function pathPoint(frac: number): { x: number; y: number; edge: Edge } {
  const { left: L, top: T, width: W, height: H } = BOX;
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

function BoxRunners({ chaseSignal }: { chaseSignal: number }) {
  const [coins, setCoins] = useState(makeCoins);
  const [pac, setPac] = useState<{ x: number; y: number; edge: Edge; closed: boolean }>(() => ({
    ...pathPoint(0),
    closed: false,
  }));
  const [ghost, setGhost] = useState(() => pathPoint(0.5));
  const [pacHidden, setPacHidden] = useState(false);

  const coinsRef = useRef(coins);
  coinsRef.current = coins;
  const phaseRef = useRef<"run" | "chase" | "caught">("run");
  const chaseStartRef = useRef(0);
  const caughtAtRef = useRef(0);
  const closedUntilRef = useRef(0);

  useEffect(() => {
    if (chaseSignal > 0) {
      phaseRef.current = "chase";
      chaseStartRef.current = performance.now();
    }
  }, [chaseSignal]);

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
        gap = 0.5 * (1 + prog);
        if (prog >= 1) {
          phaseRef.current = "caught";
          caughtAtRef.current = t;
          setPacHidden(true);
        }
      } else if (phaseRef.current === "caught") {
        gap = 1;
        if (t - caughtAtRef.current > RESET_MS) {
          phaseRef.current = "run";
          setPacHidden(false);
        }
      }

      const p = pathPoint(frac);
      setPac({ x: p.x, y: p.y, edge: p.edge, closed: t < closedUntilRef.current });
      setGhost(pathPoint(frac + gap));

      prevFrac = frac;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <>
      {coins.map((c) => {
        const p = pathPoint(c.frac);
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

export default function History({ words, connected, onBack, onClear, onPower }: Props) {
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

  return (
    <div className="absolute inset-0 z-20 overflow-hidden bg-gradient-to-b from-[#191717] to-[#484645]">
      <img src="/assets/tv.svg" alt="" className="absolute inset-0 h-full w-full" />

      <ConnectionStatus connected={connected} onToggle={onPower} />

      <span
        className="absolute whitespace-nowrap font-handjet leading-[normal] text-white"
        style={{ left: 95, top: 196, fontSize: 24 }}
      >
        History
      </span>

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
        className="absolute overflow-y-auto text-center font-handjet [scrollbar-width:none] [word-break:break-word] [&::-webkit-scrollbar]:hidden"
        style={{ left: TEXT.left, top: TEXT.top, width: TEXT.width, height: TEXT.height, color: "#FFF", fontSize: 54, fontWeight: 400, lineHeight: "normal" }}
      >
        {history}
      </div>

      <BoxRunners chaseSignal={chaseSignal} />

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

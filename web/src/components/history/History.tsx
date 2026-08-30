// History screen
import { useLayoutEffect, useRef, useState } from "react";
import { SCREEN, STICKERS, TITLE } from "../../layout";
import ConnectionStatus from "../home/ConnectionStatus";
import PowerButton from "../common/PowerButton";
import BoxRunners from "./BoxRunners";

interface Props {
  words: string[];
  connected: boolean;
  onBack: () => void;
  onClear: () => void;
  onPower: () => void;
}

const BOX = { left: 95, top: 227, width: 810, height: 380 };

const TEXT = { left: 125, top: 287, width: 720, height: 260 };

// History centres its own three-button row, so power sits here rather than at
// the shared home position.
const POWER_SPEC = { left: 279, top: 667, width: 58.6165, height: 55.5169 };

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

      <PowerButton onClick={onPower} spec={POWER_SPEC} />

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

      <BoxRunners box={BOX} chaseSignal={chaseSignal} speed={150} pacSize={47} ghostSize={57} coinSize={27} />

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

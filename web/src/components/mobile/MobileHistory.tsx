// Mobile history screen
import { useState } from "react";
import BoxRunners from "../history/BoxRunners";
import { useFolderAnchor } from "../../hooks/useFolderAnchor";
import MobileFrame from "./MobileFrame";
import MobileStatus from "./MobileStatus";

interface Props {
  words: string[];
  connected: boolean;
  onBack: () => void;
  onClear: () => void;
  onPower: () => void;
}

// Coordinates below are relative to the screen's inner content area.
const BOX = { left: 18.5, top: 178, width: 313, height: 257 };
const TEXT = { left: 19, top: 33, width: 275 };
const TEXT_SIZE = 40;
const TEXT_LINE = 45;
const TEXT_MAX_LINES = 4;

const FOLDER = { width: 50, height: 43 };

// The row of controls shares one horizontal centre line.
const CONTROLS_CENTER_Y = 549;
const POWER = { left: 47.9, width: 41, height: 39 };
const BUTTON = { width: 86, height: 40 };

export default function MobileHistory({
  words,
  connected,
  onBack,
  onClear,
  onPower,
}: Props) {
  const folder = useFolderAnchor({ ...FOLDER, overlap: 11 });
  const [chaseSignal, setChaseSignal] = useState(0);
  const handleClear = () => {
    onClear();
    setChaseSignal((n) => n + 1);
  };

  const history = words.length ? words.join(" - ") + " - " : "";

  return (
    <MobileFrame>
      <MobileStatus connected={connected} />

      <span
        ref={folder.titleRef}
        className="absolute whitespace-nowrap font-handjet leading-[normal] text-white"
        style={{ left: 65.5, top: 56, fontSize: 48 }}
      >
        Silent Signal
      </span>
      {folder.pos && (
        <img
          src="/assets/folder.svg"
          alt=""
          draggable={false}
          className="pointer-events-none absolute select-none"
          style={{
            left: folder.pos.left,
            top: folder.pos.top,
            width: folder.width,
            height: folder.height,
            transform: "rotate(6.89deg)",
          }}
        />
      )}

      <span
        className="absolute whitespace-nowrap font-handjet leading-[normal] text-white"
        style={{ left: 18.5, top: 144, fontSize: 24 }}
      >
        History
      </span>

      <div
        className="absolute rounded-[10px] border-[3px] border-dashed border-[#fefefe]"
        style={{
          left: BOX.left,
          top: BOX.top,
          width: BOX.width,
          height: BOX.height,
        }}
      >
        {/* At most 4 lines visible; scrolls without a scrollbar beyond that */}
        <div
          className="absolute overflow-y-auto overscroll-contain font-handjet text-white [scrollbar-width:none] [word-break:break-word] [&::-webkit-scrollbar]:hidden"
          style={{
            left: TEXT.left,
            top: TEXT.top,
            width: TEXT.width,
            maxHeight: TEXT_LINE * TEXT_MAX_LINES,
            fontSize: TEXT_SIZE,
            lineHeight: `${TEXT_LINE}px`,
          }}
        >
          {history}
        </div>
      </div>

      <BoxRunners
        box={BOX}
        chaseSignal={chaseSignal}
        speed={90}
        pacSize={26}
        ghostSize={31}
        coinSize={15}
      />

      {/* Controls — all centred on CONTROLS_CENTER_Y */}
      <img
        src="/assets/stars.svg"
        alt=""
        draggable={false}
        className="pointer-events-none absolute select-none"
        style={{
          left: 50.4,
          top: CONTROLS_CENTER_Y - 19.5 - 37.6,
          width: 55,
          height: 61,
          transform: "rotate(-30deg)",
        }}
      />
      <button
        type="button"
        onClick={onPower}
        aria-label="Power"
        className="absolute outline-none transition-transform duration-100 active:scale-95"
        style={{
          left: POWER.left,
          top: CONTROLS_CENTER_Y - POWER.height / 2,
          width: POWER.width,
          height: POWER.height,
        }}
      >
        <img
          src="/assets/btn-power.svg"
          alt="Power"
          draggable={false}
          className="h-full w-full select-none"
        />
      </button>
      <button
        type="button"
        onClick={onBack}
        aria-label="Go back"
        className="absolute outline-none transition-transform duration-100 active:scale-95"
        style={{
          left: 107,
          top: CONTROLS_CENTER_Y - BUTTON.height / 2,
          ...BUTTON,
        }}
      >
        <img
          src="/assets/btn-back.svg"
          alt="Go back"
          draggable={false}
          className="h-full w-full select-none"
        />
      </button>
      <button
        type="button"
        onClick={handleClear}
        aria-label="Clear"
        className="absolute outline-none transition-transform duration-100 active:scale-95"
        style={{
          left: 217.5,
          top: CONTROLS_CENTER_Y - BUTTON.height / 2,
          ...BUTTON,
        }}
      >
        <img
          src="/assets/btn-clear.svg"
          alt="Clear"
          draggable={false}
          className="h-full w-full select-none"
        />
      </button>
    </MobileFrame>
  );
}

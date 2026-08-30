// Mobile history screen
import { useLayoutEffect, useRef, useState } from "react";
import BoxRunners from "../history/BoxRunners";
import { useFolderAnchor } from "../../hooks/useFolderAnchor";

interface Props {
  words: string[];
  connected: boolean;
  onBack: () => void;
  onClear: () => void;
  onPower: () => void;
}

const FRAME = { width: 393, height: 852 };
const SCREEN = { left: 9.5, top: 126, width: 374, height: 611 };
const INNER = { left: 24.5, top: 141, width: 344, height: 581 };

// Coordinates below are relative to INNER.
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

export default function MobileHistory({ words, connected, onBack, onClear, onPower }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const folder = useFolderAnchor({ ...FOLDER, overlap: 11 });

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

  const [chaseSignal, setChaseSignal] = useState(0);
  const handleClear = () => {
    onClear();
    setChaseSignal((n) => n + 1);
  };

  const history = words.length ? words.join(" - ") + " - " : "";

  return (
    <div ref={wrapperRef} className="flex h-full w-full items-center justify-center overflow-hidden bg-[#26272b]">
      <div
        className="relative overflow-hidden bg-[#26272b]"
        style={{ width: FRAME.width, height: FRAME.height, transform: `scale(${scale})`, transformOrigin: "center" }}
      >
        {/* Screen content — clipped to the console screen */}
        <div
          className="absolute overflow-hidden"
          style={{ left: INNER.left, top: INNER.top, width: INNER.width, height: INNER.height }}
        >
          <div className="relative" style={{ width: INNER.width, height: INNER.height }}>
            <div
              className={`absolute rounded-full border-2 shadow-[4px_12px_4px_0px_rgba(0,0,0,0.5)] transition-colors ${
                connected ? "border-status-green-edge bg-status-green" : "border-status-red-edge bg-status-red"
              }`}
              style={{ left: 8.5, top: 17, width: 17, height: 17 }}
            />
            <span
              className="absolute whitespace-nowrap font-handjet leading-[normal] text-white"
              style={{ left: 31.5, top: 15, fontSize: 20 }}
            >
              {connected ? "Connected" : "Disconnected"}
            </span>

            <span
              ref={folder.titleRef}
              className="absolute whitespace-nowrap font-handjet leading-[normal] text-white"
              style={{ left: 37.5, top: 56, fontSize: 48 }}
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
              style={{ left: BOX.left, top: BOX.top, width: BOX.width, height: BOX.height }}
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

            <BoxRunners box={BOX} chaseSignal={chaseSignal} speed={90} pacSize={26} ghostSize={31} coinSize={15} />

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
              <img src="/assets/btn-power.svg" alt="Power" draggable={false} className="h-full w-full select-none" />
            </button>
            <button
              type="button"
              onClick={onBack}
              aria-label="Go back"
              className="absolute outline-none transition-transform duration-100 active:scale-95"
              style={{ left: 107, top: CONTROLS_CENTER_Y - BUTTON.height / 2, ...BUTTON }}
            >
              <img src="/assets/btn-back.svg" alt="Go back" draggable={false} className="h-full w-full select-none" />
            </button>
            <button
              type="button"
              onClick={handleClear}
              aria-label="Clear"
              className="absolute outline-none transition-transform duration-100 active:scale-95"
              style={{ left: 217.5, top: CONTROLS_CENTER_Y - BUTTON.height / 2, ...BUTTON }}
            >
              <img src="/assets/btn-clear.svg" alt="Clear" draggable={false} className="h-full w-full select-none" />
            </button>
          </div>
        </div>

        {/* Fixed frame + joy-cons */}
        <img
          src="/assets/phone-rectangle.svg"
          alt=""
          draggable={false}
          className="pointer-events-none absolute select-none"
          style={{ left: SCREEN.left, top: SCREEN.top, width: SCREEN.width, height: SCREEN.height }}
        />
        <img
          src="/assets/nintendo-blue.svg"
          alt=""
          draggable={false}
          className="pointer-events-none absolute select-none"
          style={{ left: (FRAME.width - 402) / 2, top: 0, width: 402, height: 147 }}
        />
        <img
          src="/assets/nintendo-red.svg"
          alt=""
          draggable={false}
          className="pointer-events-none absolute select-none"
          style={{ left: (FRAME.width - 402) / 2, top: FRAME.height - 137, width: 402, height: 137 }}
        />
      </div>
    </div>
  );
}

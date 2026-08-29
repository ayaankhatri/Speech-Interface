interface Props {
  words: string[];
  connected: boolean;
  onBack: () => void;
  onClear: () => void;
  onPower: () => void;
}

const COINS: { left: number; top: number; rotate?: number }[] = [
  { left: 111, top: 235 },
  { left: 245, top: 235 },
  { left: 647, top: 235 },
  { left: 105, top: 465 },
  { left: 195, top: 565 },
  { left: 597, top: 565 },
  { left: 871, top: 302, rotate: 90 },
  { left: 871, top: 503, rotate: 90 },
  { left: 871, top: 565 },
];

export default function HistoryScreen({ words, connected, onBack, onClear, onPower }: Props) {
  const history = words.length ? words.join(" - ") + " - " : "";

  return (
    <div className="absolute inset-0 z-20 overflow-hidden bg-gradient-to-b from-[#191717] to-[#484645]">
      <img src="/assets/tv.svg" alt="" className="absolute inset-0 h-full w-full" />

      <div
        className="absolute flex items-center justify-center"
        style={{ left: 228, top: 629, width: 104.939, height: 107.659 }}
      >
        <div className="flex-none" style={{ transform: "rotate(-30deg)" }}>
          <img
            src="/assets/stars.svg"
            alt=""
            draggable={false}
            className="pointer-events-none select-none"
            style={{ width: 74.1, height: 81.533 }}
          />
        </div>
      </div>

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
        <img src="/assets/btn-power.svg" alt="Power" draggable={false} className="h-full w-full select-none" />
      </button>

      <div
        className="absolute rounded-[10px] border-[3px] border-dashed border-[#fefefe]"
        style={{ left: 95, top: 227, width: 810, height: 380 }}
      />

      <p
        className="absolute font-handjet font-normal leading-[normal] text-white [word-break:break-word]"
        style={{ left: 125, top: 297, width: 744, fontSize: 60 }}
      >
        {history}
      </p>

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
        onClick={onClear}
        aria-label="Clear"
        className="absolute outline-none transition-transform duration-100 hover:scale-110 active:scale-95"
        style={{ left: 596.62, top: 667, width: 119, height: 55 }}
      >
        <img src="/assets/btn-clear.svg" alt="Clear" draggable={false} className="h-full w-full select-none" />
      </button>

      <div
        className="absolute flex items-center justify-center"
        style={{ left: 660, top: 100, width: 66.476, height: 59.751 }}
      >
        <div className="flex-none" style={{ transform: "rotate(6.89deg)" }}>
          <img
            src="/assets/folder.svg"
            alt=""
            draggable={false}
            className="pointer-events-none select-none"
            style={{ width: 60.573, height: 52.868 }}
          />
        </div>
      </div>

      <span
        className="absolute whitespace-nowrap font-handjet leading-[normal] text-white"
        style={{ left: 316, top: 80, fontSize: 64 }}
      >
        Silent Signal
      </span>

      <img
        src="/assets/big-star.svg"
        alt=""
        draggable={false}
        className="pointer-events-none absolute select-none"
        style={{ left: 53, top: 526, width: 103, height: 103 }}
      />
      <img
        src="/assets/pac-man.svg"
        alt=""
        draggable={false}
        className="pointer-events-none absolute select-none"
        style={{ left: 134, top: 550, width: 47, height: 47 }}
      />
      <img
        src="/assets/ghost.svg"
        alt=""
        draggable={false}
        className="pointer-events-none absolute select-none"
        style={{ left: 777, top: 235, width: 57, height: 57 }}
      />

      {COINS.map((c, i) => (
        <img
          key={i}
          src="/assets/coin.svg"
          alt=""
          draggable={false}
          className="pointer-events-none absolute select-none"
          style={{ left: c.left, top: c.top, width: 27, height: 27, transform: c.rotate ? `rotate(${c.rotate}deg)` : undefined }}
        />
      ))}

      <div
        className="absolute flex items-center justify-center"
        style={{ left: 842, top: 177, width: 98.994, height: 91.172 }}
      >
        <div className="flex-none" style={{ transform: "rotate(20.2deg)" }}>
          <img
            src="/assets/camera.svg"
            alt=""
            draggable={false}
            className="pointer-events-none select-none"
            style={{ width: 80.659, height: 67.474 }}
          />
        </div>
      </div>
    </div>
  );
}

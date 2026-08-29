import { CONTROLS, SCREEN } from "../layout";

interface Props {
  streaming: boolean;
  onPower: () => void;
  onStart: () => void;
  onStop: () => void;
  onHistory: () => void;
  onClear: () => void;
}

// All four action buttons share the exact same rendered size (source SVGs are
// 119x55). The power button keeps its own square-ish aspect.
const BTN_W = 112;
const BTN_H = 52;

interface ButtonSpec {
  key: string;
  src: string;
  alt: string;
  onClick: () => void;
  active?: boolean;
}

/** Evenly-spaced control buttons along the bottom of the screen. */
export default function ControlButtons({
  streaming,
  onPower,
  onStart,
  onStop,
  onHistory,
  onClear,
}: Props) {
  const buttons: ButtonSpec[] = [
    { key: "start", src: "/assets/btn-start.svg", alt: "Start", onClick: onStart, active: streaming },
    { key: "stop", src: "/assets/btn-stop.svg", alt: "Stop", onClick: onStop },
    { key: "history", src: "/assets/btn-history.svg", alt: "History", onClick: onHistory },
    { key: "clear", src: "/assets/btn-clear.svg", alt: "Clear", onClick: onClear },
  ];

  return (
    <div
      className="absolute flex items-center justify-center gap-6"
      style={{ left: SCREEN.left, top: CONTROLS.top, width: SCREEN.width, height: CONTROLS.height }}
    >
      {/* Power button, to the left of START — sits on top of a star burst. */}
      <button
        type="button"
        onClick={onPower}
        aria-label="Power"
        className="relative outline-none transition-transform duration-100 hover:scale-110 active:scale-95"
      >
        {/* Star sits behind the power button. */}
        <img
          src="/assets/stars.svg"
          alt=""
          draggable={false}
          className="pointer-events-none absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 select-none"
          style={{ width: 92, height: (92 * 108) / 105 }}
        />
        <img
          src="/assets/btn-power.svg"
          alt="Power"
          draggable={false}
          className="relative select-none"
          style={{ height: BTN_H, width: (BTN_H * 59) / 56 }}
        />
      </button>

      {buttons.map((b) => (
        <button
          key={b.key}
          type="button"
          onClick={b.onClick}
          aria-label={b.alt}
          className={`outline-none transition-transform duration-100 hover:scale-110 active:scale-95 ${
            b.active ? "scale-105 drop-shadow-[0_0_10px_rgba(89,235,48,0.7)]" : ""
          }`}
        >
          <img
            src={b.src}
            alt={b.alt}
            draggable={false}
            className="select-none"
            style={{ width: BTN_W, height: BTN_H }}
          />
        </button>
      ))}
    </div>
  );
}

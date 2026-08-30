import { CONTROLS, CONTROLS_ROW_LEFT } from "../../layout";
import PowerButton from "../PowerButton";

interface Props {
  streaming: boolean;
  onPower: () => void;
  onStart: () => void;
  onStop: () => void;
  onHistory: () => void;
  onClear: () => void;
}

interface ButtonSpec {
  key: string;
  src: string;
  alt: string;
  onClick: () => void;
  active?: boolean;
}

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
    <>
      <PowerButton onClick={onPower} />

      <div
        className="absolute flex items-center"
        style={{ left: CONTROLS_ROW_LEFT, top: CONTROLS.top, height: CONTROLS.height, gap: CONTROLS.gap }}
      >
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
              style={{ width: CONTROLS.button.width, height: CONTROLS.button.height }}
            />
          </button>
        ))}
      </div>
    </>
  );
}

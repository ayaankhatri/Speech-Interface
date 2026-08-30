// Power button, pinned to its on-screen slot in every view
import { POWER } from "../layout";

interface Props {
  onClick: () => void;
}

export default function PowerButton({ onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Power"
      className="absolute outline-none transition-transform duration-100 hover:scale-110 active:scale-95"
      style={{ left: POWER.left, top: POWER.top, width: POWER.width, height: POWER.height }}
    >
      <span className="relative block h-full w-full">
        <img
          src="/assets/stars.svg"
          alt=""
          draggable={false}
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none"
          style={{ width: 92, height: (92 * 108) / 105 }}
        />
        <img
          src="/assets/btn-power.svg"
          alt="Power"
          draggable={false}
          className="absolute inset-0 h-full w-full select-none"
        />
      </span>
    </button>
  );
}

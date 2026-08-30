// The one power button, shared by every screen so it never shifts between them.
import { POWER } from "../../layout";

interface Props {
  onClick: () => void;
  /** Screens with their own control row (History) pass their own rect. */
  spec?: { left: number; top: number; width: number; height: number };
}

const STAR_WIDTH = 92;
const STAR_HEIGHT = (STAR_WIDTH * 108) / 105;

export default function PowerButton({ onClick, spec = POWER }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Power"
      className="absolute outline-none transition-transform duration-100 hover:scale-110 active:scale-95"
      style={{ left: spec.left, top: spec.top, width: spec.width, height: spec.height }}
    >
      <img
        src="/assets/stars.svg"
        alt=""
        draggable={false}
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none"
        style={{ width: STAR_WIDTH, height: STAR_HEIGHT }}
      />
      <img
        src="/assets/btn-power.svg"
        alt="Power"
        draggable={false}
        className="absolute inset-0 h-full w-full select-none"
      />
    </button>
  );
}

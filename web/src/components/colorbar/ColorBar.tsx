// Color-bar / no-signal screen
import { SCREEN, TITLE } from "../../layout";
import DvdTitle from "../common/DvdTitle";

interface Props {
  onPower: () => void;
}

const SCREEN_PATH =
  "M71.2678 122.838C73.3826 103.694 88.6852 88.6175 107.858 86.7802C404.672 58.3375 586.288 59.098 887.758 86.8754C907.106 88.6581 922.547 103.915 924.552 123.241C946.973 339.317 947.306 476.197 924.579 700.677C922.574 720.485 906.467 735.983 886.599 737.267C591.017 756.373 409.822 757.815 109.109 737.375C89.3687 736.033 73.3861 720.64 71.3204 700.962C46.6923 466.356 48.3753 330.065 71.2678 122.838Z";

export default function ColorBar({ onPower }: Props) {
  return (
    <div className="absolute inset-0 z-20 overflow-hidden bg-gradient-to-b from-[#191717] to-[#484645]">
      <div className="absolute inset-0" style={{ clipPath: `path("${SCREEN_PATH}")` }}>
        <img
          src="/assets/color-bars.png"
          alt=""
          draggable={false}
          className="pointer-events-none absolute max-w-none select-none object-cover"
          style={{ left: -43, top: -11, width: 1200, height: 839 }}
        />
        <DvdTitle bounds={SCREEN} fontSize={TITLE.fontSize} />
      </div>
      <img src="/assets/tv.svg" alt="" className="pointer-events-none absolute inset-0 h-full w-full" />

      <button
        type="button"
        onClick={onPower}
        aria-label="Power"
        className="absolute outline-none transition-transform duration-100 hover:scale-110 active:scale-95"
        style={{ left: 610, top: 662, width: 59, height: 56 }}
      >
        <span className="relative block h-full w-full">
          <img
            src="/assets/stars.svg"
            alt=""
            draggable={false}
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none"
            style={{ width: 92, height: (92 * 108) / 105 }}
          />
          <img src="/assets/btn-power.svg" alt="Power" draggable={false} className="absolute inset-0 h-full w-full select-none" />
        </span>
      </button>
    </div>
  );
}

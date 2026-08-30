// Powered-off phone screen: blank, with the title bouncing around it.
import MobileFrame, { INNER } from "./MobileFrame";
import MobileStatus from "./MobileStatus";
import DvdTitle from "../common/DvdTitle";

interface Props {
  onPower: () => void;
}

const BOUNDS = { left: 0, top: 0, width: INNER.width, height: INNER.height };
const TITLE_SIZE = 40;

const POWER = { width: 46, height: 44 };
const POWER_TOP = 480;
const STARS = { width: 72, height: (72 * 108) / 105 };

export default function MobileOff({ onPower }: Props) {
  return (
    <MobileFrame>
      <div className="absolute inset-0 bg-black" />

      <DvdTitle bounds={BOUNDS} fontSize={TITLE_SIZE} inset={14} />

      <MobileStatus connected={false} onToggle={onPower} />

      <button
        type="button"
        onClick={onPower}
        aria-label="Power"
        className="absolute outline-none transition-transform duration-100 active:scale-95"
        style={{
          left: (INNER.width - POWER.width) / 2,
          top: POWER_TOP,
          width: POWER.width,
          height: POWER.height,
        }}
      >
        <span className="relative block h-full w-full">
          <img
            src="/assets/stars.svg"
            alt=""
            draggable={false}
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none"
            style={{ width: STARS.width, height: STARS.height }}
          />
          <img
            src="/assets/btn-power.svg"
            alt="Power"
            draggable={false}
            className="absolute inset-0 h-full w-full select-none"
          />
        </span>
      </button>
    </MobileFrame>
  );
}

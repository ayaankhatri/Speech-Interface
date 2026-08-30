// Phone turn-off: same CRT discharge as the PC screen, inside the console screen.
import MobileFrame from "./MobileFrame";
import TvStatic, { COLLAPSE_ANIMATION } from "../common/TvStatic";

interface Props {
  onDone: () => void;
}

export default function MobileTvOff({ onDone }: Props) {
  return (
    <MobileFrame>
      <div className="absolute inset-0 bg-black" />
      <div
        className="tv-off-collapse absolute inset-0"
        onAnimationEnd={(e) => {
          // The veil's animationend bubbles here too — only the collapse ends the sequence.
          if (e.animationName === COLLAPSE_ANIMATION) onDone();
        }}
      >
        <TvStatic />
        <div className="tv-off-veil absolute inset-0 bg-white" />
      </div>
    </MobileFrame>
  );
}

// Phone turn-on: the turn-off sequence played backwards, dissolving into the live screen.
import MobileFrame from "./MobileFrame";
import TvStatic, { HANDOFF_ANIMATION } from "../common/TvStatic";

interface Props {
  onDone: () => void;
}

export default function MobileTvOn({ onDone }: Props) {
  return (
    <div
      className="tv-on-handoff pointer-events-none absolute inset-0 z-40"
      onAnimationEnd={(e) => {
        // Sibling animations bubble here too — only the hand-off ends the sequence.
        if (e.animationName === HANDOFF_ANIMATION) onDone();
      }}
    >
      <MobileFrame>
        <div className="absolute inset-0 bg-black" />
        <div className="tv-on-expand absolute inset-0">
          <TvStatic />
          <div className="tv-on-veil absolute inset-0 bg-white" />
        </div>
      </MobileFrame>
    </div>
  );
}

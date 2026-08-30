// TV turn-off screen: analog static, the white veil easing off, then a CRT collapse.
import { SCREEN_CENTER } from "../../layout";
import TvStatic, { COLLAPSE_ANIMATION } from "../common/TvStatic";

interface Props {
  onDone: () => void;
}

const SCREEN_PATH =
  "M71.2678 122.838C73.3826 103.694 88.6852 88.6175 107.858 86.7802C404.672 58.3375 586.288 59.098 887.758 86.8754C907.106 88.6581 922.547 103.915 924.552 123.241C946.973 339.317 947.306 476.197 924.579 700.677C922.574 720.485 906.467 735.983 886.599 737.267C591.017 756.373 409.822 757.815 109.109 737.375C89.3687 736.033 73.3861 720.64 71.3204 700.962C46.6923 466.356 48.3753 330.065 71.2678 122.838Z";

export default function TvOff({ onDone }: Props) {
  return (
    <div className="absolute inset-0 z-30 overflow-hidden bg-gradient-to-b from-[#191717] to-[#484645]">
      <div className="absolute inset-0" style={{ clipPath: `path("${SCREEN_PATH}")` }}>
        <div className="absolute inset-0 bg-black" />
        <div
          className="tv-off-collapse absolute inset-0"
          // Converge on the tube's centre, not the frame's — the screen sits
          // left of centre inside the TV artwork.
          style={{ transformOrigin: `${SCREEN_CENTER.x}px ${SCREEN_CENTER.y}px` }}
          onAnimationEnd={(e) => {
            // The veil's animationend bubbles here too — only the collapse ends the sequence.
            if (e.animationName === COLLAPSE_ANIMATION) onDone();
          }}
        >
          <TvStatic />
          <div className="tv-off-veil absolute inset-0 bg-white" />
        </div>
      </div>
      <img src="/assets/tv.svg" alt="" className="pointer-events-none absolute inset-0 h-full w-full" />
    </div>
  );
}

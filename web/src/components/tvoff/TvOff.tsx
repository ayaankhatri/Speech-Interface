// TV turn-off screen: analog static, the white veil easing off, then a CRT collapse.
import { useEffect, useRef } from "react";
import { SCREEN_CENTER } from "../../layout";

interface Props {
  onDone: () => void;
}

const SCREEN_PATH =
  "M71.2678 122.838C73.3826 103.694 88.6852 88.6175 107.858 86.7802C404.672 58.3375 586.288 59.098 887.758 86.8754C907.106 88.6581 922.547 103.915 924.552 123.241C946.973 339.317 947.306 476.197 924.579 700.677C922.574 720.485 906.467 735.983 886.599 737.267C591.017 756.373 409.822 757.815 109.109 737.375C89.3687 736.033 73.3861 720.64 71.3204 700.962C46.6923 466.356 48.3753 330.065 71.2678 122.838Z";

// Must match the .tv-off-collapse keyframes name in index.css.
const COLLAPSE_ANIMATION = "tvOffCollapse";

const NOISE_W = 320;
const NOISE_H = 180;

/** Animated analog snow — random luminance with horizontal correlation, so it
 *  streaks along scanlines the way real static does. */
function Static() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = NOISE_W;
    canvas.height = NOISE_H;
    const frame = ctx.createImageData(NOISE_W, NOISE_H);
    const data = frame.data;
    for (let i = 3; i < data.length; i += 4) data[i] = 255;

    let raf = 0;
    const draw = () => {
      for (let y = 0; y < NOISE_H; y++) {
        let v = Math.random() * 255;
        for (let x = 0; x < NOISE_W; x++) {
          v += (Math.random() - 0.5) * 190;
          v = v < 0 ? 0 : v > 255 ? 255 : v;
          const i = (y * NOISE_W + x) * 4;
          data[i] = data[i + 1] = data[i + 2] = v;
        }
      }
      ctx.putImageData(frame, 0, 0);
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />;
}

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
            if (e.animationName === COLLAPSE_ANIMATION) onDone();
          }}
        >
          <Static />
          {/* Scanlines */}
          <div
            className="absolute inset-0 opacity-40 mix-blend-multiply"
            style={{
              backgroundImage:
                "repeating-linear-gradient(to bottom, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 1px, rgba(0,0,0,0.55) 2px, rgba(0,0,0,0.55) 3px)",
            }}
          />
          {/* Vignette */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at center, rgba(0,0,0,0) 45%, rgba(0,0,0,0.45) 78%, rgba(0,0,0,0.85) 100%)",
            }}
          />
          <div className="tv-off-veil absolute inset-0 bg-white" />
        </div>
      </div>
      <img src="/assets/tv.svg" alt="" className="pointer-events-none absolute inset-0 h-full w-full" />
    </div>
  );
}

// Colour-bar / no-signal screen
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { FRAME, SCREEN, TITLE } from "../../layout";
import PowerButton from "../common/PowerButton";

interface Props {
  onPower: () => void;
}

const SCREEN_PATH =
  "M71.2678 122.838C73.3826 103.694 88.6852 88.6175 107.858 86.7802C404.672 58.3375 586.288 59.098 887.758 86.8754C907.106 88.6581 922.547 103.915 924.552 123.241C946.973 339.317 947.306 476.197 924.579 700.677C922.574 720.485 906.467 735.983 886.599 737.267C591.017 756.373 409.822 757.815 109.109 737.375C89.3687 736.033 73.3861 720.64 71.3204 700.962C46.6923 466.356 48.3753 330.065 71.2678 122.838Z";

// Keep the title clear of the tube's rounded corners.
const BOUNDS_INSET = 28;

// Unequal axes, so the bounce path tilts off the plain 45° diagonal.
const SPEED_X = 84; // px/s
const SPEED_Y = 136; // px/s

// The oval outline the title rides inside. The padding is what keeps the
// letters clear of the curve, which pulls in hardest at their corners.
const BOX = {
  // A darker tan than the old #E7D8C7: same hue, dropped in lightness.
  color: "#CEAF8D",
  border: 3,
  paddingX: 46,
  paddingY: 14,
} as const;

// Peak-to-peak luminance jitter of the grain laid over the bars.
const GRAIN_AMPLITUDE = 110;
const GRAIN_OPACITY = 0.3;

// Inks that read against the filled oval; cycled on every wall hit, like the
// old DVD idle screen.
const COLORS = ["#2f2a26", "#c8372d", "#9c6410", "#2f7d4f", "#2f6fb8", "#7a4bbd", "#c2418f"];

const clampByte = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);

/** Film grain: one-shot neutral noise, overlaid so the bars keep their colour. */
function Grain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = FRAME.width;
    canvas.height = FRAME.height;
    const frame = ctx.createImageData(FRAME.width, FRAME.height);
    const data = frame.data;
    for (let i = 0; i < data.length; i += 4) {
      // Mid grey is the no-op tone for the overlay blend, so noise around it
      // only lightens and darkens the bars.
      const v = clampByte(128 + (Math.random() - 0.5) * GRAIN_AMPLITUDE);
      data[i] = data[i + 1] = data[i + 2] = v;
      data[i + 3] = 255;
    }
    ctx.putImageData(frame, 0, 0);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full mix-blend-overlay"
      style={{ opacity: GRAIN_OPACITY }}
    />
  );
}

function DvdTitle() {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: SCREEN.left + BOUNDS_INSET, y: SCREEN.top + BOUNDS_INSET });
  const [colorIndex, setColorIndex] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const minX = SCREEN.left + BOUNDS_INSET;
    const minY = SCREEN.top + BOUNDS_INSET;
    const state = { x: minX, y: minY, vx: SPEED_X, vy: SPEED_Y };

    let raf = 0;
    let prev: number | null = null;
    const loop = (t: number) => {
      if (prev === null) prev = t;
      const dt = Math.min((t - prev) / 1000, 0.05); // clamp so tab-switches don't teleport it
      prev = t;

      // Measured each frame: the web font can land after the first paint.
      const maxX = SCREEN.left + SCREEN.width - BOUNDS_INSET - el.offsetWidth;
      const maxY = SCREEN.top + SCREEN.height - BOUNDS_INSET - el.offsetHeight;

      state.x += state.vx * dt;
      state.y += state.vy * dt;

      let hit = false;
      if (state.x <= minX) {
        state.x = minX;
        state.vx = Math.abs(state.vx);
        hit = true;
      } else if (state.x >= maxX) {
        state.x = maxX;
        state.vx = -Math.abs(state.vx);
        hit = true;
      }
      if (state.y <= minY) {
        state.y = minY;
        state.vy = Math.abs(state.vy);
        hit = true;
      } else if (state.y >= maxY) {
        state.y = maxY;
        state.vy = -Math.abs(state.vy);
        hit = true;
      }

      if (hit) setColorIndex((i) => (i + 1) % COLORS.length);
      setPos({ x: state.x, y: state.y });

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      ref={ref}
      className="absolute select-none"
      style={{
        left: 0,
        top: 0,
        transform: `translate(${pos.x}px, ${pos.y}px)`,
        padding: `${BOX.paddingY}px ${BOX.paddingX}px`,
        border: `${BOX.border}px solid ${BOX.color}`,
        background: BOX.color,
        // Curved sides, flat-ish top and bottom: oval, but not a full ellipse.
        borderRadius: "40% / 60%",
        // Lifts the oval off the white bar.
        boxShadow: "0 0 10px rgba(0,0,0,0.45)",
      }}
    >
      <span
        className="block whitespace-nowrap font-handjet leading-none"
        style={{
          fontSize: TITLE.fontSize,
          color: COLORS[colorIndex],
          textShadow: "0 2px 0 rgba(0,0,0,0.12)",
        }}
      >
        Silent Signal
      </span>
    </div>
  );
}

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
        <Grain />
        <DvdTitle />
      </div>
      <img src="/assets/tv.svg" alt="" className="pointer-events-none absolute inset-0 h-full w-full" />

      <PowerButton onClick={onPower} />
    </div>
  );
}

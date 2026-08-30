// Title that drifts and bounces off the edges, like the old DVD idle screen.
import { useLayoutEffect, useRef, useState } from "react";

interface Bounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface Props {
  bounds: Bounds;
  fontSize: number;
  /** Keeps the text clear of the tube's rounded corners. */
  inset?: number;
  /** px/s along each axis. */
  speedX?: number;
  speedY?: number;
  /** Rides inside a filled oval instead of sitting bare on the picture. */
  boxed?: boolean;
  text?: string;
}

// Unequal by default, so the bounce path tilts off the plain 45° diagonal.
const SPEED_X = 84;
const SPEED_Y = 136;

// Cycled on every wall hit. The boxed inks read against the oval's tan; the
// bare ones read against a dark picture.
const BARE_COLORS = ["#ffffff", "#ff4b4b", "#ffd23f", "#3fd66f", "#4bb8ff", "#c86bff", "#ff8ad4"];
const BOXED_COLORS = ["#2f2a26", "#c8372d", "#9c6410", "#2f7d4f", "#2f6fb8", "#7a4bbd", "#c2418f"];

// The padding is what keeps the letters clear of the curve, which pulls in
// hardest at their corners.
const BOX = {
  color: "#CEAF8D",
  border: 3,
  paddingX: 46,
  paddingY: 14,
} as const;

export default function DvdTitle({
  bounds,
  fontSize,
  inset = 28,
  speedX = SPEED_X,
  speedY = SPEED_Y,
  boxed = false,
  text = "Silent Signal",
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: bounds.left + inset, y: bounds.top + inset });
  const [colorIndex, setColorIndex] = useState(0);

  const colors = boxed ? BOXED_COLORS : BARE_COLORS;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const minX = bounds.left + inset;
    const minY = bounds.top + inset;
    const state = { x: minX, y: minY, vx: speedX, vy: speedY };

    let raf = 0;
    let prev: number | null = null;
    const loop = (t: number) => {
      if (prev === null) prev = t;
      const dt = Math.min((t - prev) / 1000, 0.05); // clamp so tab-switches don't teleport it
      prev = t;

      // Measured each frame: the web font can land after the first paint.
      const maxX = bounds.left + bounds.width - inset - el.offsetWidth;
      const maxY = bounds.top + bounds.height - inset - el.offsetHeight;

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

      if (hit) setColorIndex((i) => (i + 1) % colors.length);
      setPos({ x: state.x, y: state.y });

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [bounds.left, bounds.top, bounds.width, bounds.height, inset, speedX, speedY, colors.length]);

  return (
    <div
      ref={ref}
      className="absolute select-none"
      style={{
        left: 0,
        top: 0,
        transform: `translate(${pos.x}px, ${pos.y}px)`,
        ...(boxed
          ? {
              padding: `${BOX.paddingY}px ${BOX.paddingX}px`,
              border: `${BOX.border}px solid ${BOX.color}`,
              background: BOX.color,
              // Curved sides, flat-ish top and bottom: oval, not a full ellipse.
              borderRadius: "40% / 60%",
              // Lifts the oval off the white bar.
              boxShadow: "0 0 10px rgba(0,0,0,0.45)",
            }
          : null),
      }}
    >
      <span
        className="block whitespace-nowrap font-handjet leading-none"
        style={{
          fontSize,
          color: colors[colorIndex],
          textShadow: boxed ? "0 2px 0 rgba(0,0,0,0.12)" : "0 0 18px rgba(0,0,0,0.55)",
        }}
      >
        {text}
      </span>
    </div>
  );
}

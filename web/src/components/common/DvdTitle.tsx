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
  speed?: number;
  text?: string;
}

// Cycled on every wall hit.
const COLORS = ["#ffffff", "#ff4b4b", "#ffd23f", "#3fd66f", "#4bb8ff", "#c86bff", "#ff8ad4"];

export default function DvdTitle({
  bounds,
  fontSize,
  inset = 28,
  speed = 90,
  text = "Silent Signal",
}: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState({ x: bounds.left + inset, y: bounds.top + inset });
  const [colorIndex, setColorIndex] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const minX = bounds.left + inset;
    const minY = bounds.top + inset;
    const state = { x: minX, y: minY, vx: speed, vy: speed };

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

      if (hit) setColorIndex((i) => (i + 1) % COLORS.length);
      setPos({ x: state.x, y: state.y });

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [bounds.left, bounds.top, bounds.width, bounds.height, inset, speed]);

  return (
    <span
      ref={ref}
      className="absolute select-none whitespace-nowrap font-handjet leading-none"
      style={{
        left: 0,
        top: 0,
        transform: `translate(${pos.x}px, ${pos.y}px)`,
        fontSize,
        color: COLORS[colorIndex],
        textShadow: "0 0 18px rgba(0,0,0,0.55)",
      }}
    >
      {text}
    </span>
  );
}

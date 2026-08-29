import { useEffect, useRef, useState } from "react";

interface Props {
  /** Inner width of the detected-words box floor the dino patrols. */
  trackWidth: number;
  /** Left edge of the roam range — where the written words currently end. */
  minX: number;
  /** Increments whenever a new word is detected → dino jumps. */
  jumpSignal: number;
}

// dino.svg is 109x119 — keep that aspect.
const DINO_H = 50;
const DINO_W = Math.round((DINO_H * 109) / 119);
const STEP = 3; // px per tick
const TICK_MS = 45;

/**
 * The dino patrols the floor of the "Detected Word" box, roaming between where
 * the written words end (minX) and the right edge of the box. It only walks
 * while hovered, turns around at either edge, and hops whenever a new word
 * arrives.
 */
export default function DinoRunner({ trackWidth, minX, jumpSignal }: Props) {
  const maxX = Math.max(minX, trackWidth - DINO_W);
  const [x, setX] = useState(minX);
  const [dir, setDir] = useState<1 | -1>(1);
  const [hovered, setHovered] = useState(false);
  const [jumping, setJumping] = useState(false);
  const jumpTimer = useRef<number | null>(null);

  // Keep the dino inside the (possibly shrinking/growing) roam range.
  useEffect(() => {
    setX((prev) => Math.min(Math.max(prev, minX), maxX));
  }, [minX, maxX]);

  // Walk forward while hovered, bouncing between the two edges.
  useEffect(() => {
    if (!hovered) return;
    const id = window.setInterval(() => {
      setX((prev) => {
        let next = prev + dir * STEP;
        if (next >= maxX) {
          next = maxX;
          setDir(-1);
        } else if (next <= minX) {
          next = minX;
          setDir(1);
        }
        return next;
      });
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [hovered, dir, minX, maxX]);

  // Jump on every new word.
  useEffect(() => {
    if (jumpSignal === 0) return;
    setJumping(true);
    if (jumpTimer.current !== null) window.clearTimeout(jumpTimer.current);
    jumpTimer.current = window.setTimeout(() => setJumping(false), 560);
    return () => {
      if (jumpTimer.current !== null) window.clearTimeout(jumpTimer.current);
    };
  }, [jumpSignal]);

  return (
    <div
      className="absolute bottom-1 cursor-pointer"
      style={{ left: x, width: DINO_W, height: DINO_H }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title="hover to walk · new word to jump"
    >
      <div className={jumping ? "dino-jump" : undefined}>
        <div
          className={hovered && !jumping ? "dino-walk" : undefined}
          /* dino.svg faces left, so flip it to face the travel direction. */
          style={{ transform: `scaleX(${-dir})` }}
        >
          <img
            src="/assets/dino.svg"
            alt="dino"
            draggable={false}
            className="select-none"
            style={{ width: DINO_W, height: DINO_H }}
          />
        </div>
      </div>
    </div>
  );
}

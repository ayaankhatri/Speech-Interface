import { useEffect, useRef, useState } from "react";

interface Props {
  trackWidth: number;
  minX: number;
  jumpSignal: number;
}

const DINO_H = 128;
const DINO_W = Math.round((DINO_H * 109) / 119);
const SPRITE_INK_BOTTOM = 0.6489;
const FLOOR_OFFSET = Math.round(DINO_H * (1 - SPRITE_INK_BOTTOM)) - 1;
const STEP = 3;
const TICK_MS = 45;

export default function DinoRunner({ trackWidth, minX, jumpSignal }: Props) {
  const maxX = Math.max(minX, trackWidth - DINO_W);
  const [x, setX] = useState(minX);
  const [dir, setDir] = useState<1 | -1>(1);
  const [hovered, setHovered] = useState(false);
  const [jumping, setJumping] = useState(false);
  const jumpTimer = useRef<number | null>(null);

  useEffect(() => {
    setX((prev) => Math.min(Math.max(prev, minX), maxX));
  }, [minX, maxX]);

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
      className="absolute cursor-pointer"
      style={{ left: x, bottom: -FLOOR_OFFSET, width: DINO_W, height: DINO_H }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title="hover to walk · new word to jump"
    >
      <div className={jumping ? "dino-jump" : undefined}>
        <div className={hovered && !jumping ? "dino-walk" : undefined}>
          <img
            src="/assets/dino.svg"
            alt="dino"
            draggable={false}
            className="select-none"
            style={{ width: DINO_W, height: DINO_H, transform: `scaleX(${-dir})` }}
          />
        </div>
      </div>
    </div>
  );
}

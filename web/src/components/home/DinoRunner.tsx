import { useEffect, useRef, useState } from "react";

interface Props {
  trackWidth: number;
  minX: number;
  jumpSignal: number;
  interaction?: "hover" | "click";
}

const DINO_H = 128;
const DINO_W = Math.round((DINO_H * 109) / 119);
const SPRITE_INK_BOTTOM = 0.6489;
const FLOOR_OFFSET = Math.round(DINO_H * (1 - SPRITE_INK_BOTTOM)) - 1;
const HIP_Y = 58.6;
const LEG_SPLIT_X = 51;
const SEAM_OVERLAP = 1.5;
const STEP = 3;
const TICK_MS = 45;

const LAYER_CLIP = {
  body: `inset(0px 0px ${DINO_H - HIP_Y - SEAM_OVERLAP}px 0px)`,
  frontLeg: `inset(${HIP_Y}px ${DINO_W - LEG_SPLIT_X - 0.7}px 0px 0px)`,
  rearLeg: `inset(${HIP_Y}px 0px 0px ${LEG_SPLIT_X - 0.7}px)`,
} as const;

export default function DinoRunner({ trackWidth, minX, jumpSignal, interaction = "hover" }: Props) {
  const maxX = Math.max(minX, trackWidth - DINO_W);
  const [x, setX] = useState(minX);
  const [dir, setDir] = useState<1 | -1>(1);
  const [active, setActive] = useState(false);
  const [jumping, setJumping] = useState(false);
  const jumpTimer = useRef<number | null>(null);

  useEffect(() => {
    setX((prev) => Math.min(Math.max(prev, minX), maxX));
  }, [minX, maxX]);

  useEffect(() => {
    if (!active) return;
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
  }, [active, dir, minX, maxX]);

  useEffect(() => {
    if (jumpSignal === 0) return;
    setJumping(true);
    if (jumpTimer.current !== null) window.clearTimeout(jumpTimer.current);
    jumpTimer.current = window.setTimeout(() => setJumping(false), 560);
    return () => {
      if (jumpTimer.current !== null) window.clearTimeout(jumpTimer.current);
    };
  }, [jumpSignal]);

  const walking = active && !jumping;

  const handlers =
    interaction === "click"
      ? { onClick: () => setActive((v) => !v) }
      : { onMouseEnter: () => setActive(true), onMouseLeave: () => setActive(false) };

  return (
    <div
      className="absolute cursor-pointer"
      style={{ left: x, bottom: -FLOOR_OFFSET, width: DINO_W, height: DINO_H }}
      {...handlers}
      title={interaction === "click" ? "click to walk · new word to jump" : "hover to walk · new word to jump"}
    >
      <div className={jumping ? "dino-jump" : undefined}>
        <div
          className="relative select-none"
          style={{ width: DINO_W, height: DINO_H, transform: `scaleX(${-dir})` }}
        >
          <DinoLayer clip={LAYER_CLIP.body} />
          <DinoLayer clip={LAYER_CLIP.frontLeg} className={walking ? "dino-step-a" : undefined} />
          <DinoLayer clip={LAYER_CLIP.rearLeg} className={walking ? "dino-step-b" : undefined} />
        </div>
      </div>
    </div>
  );
}

function DinoLayer({ clip, className }: { clip: string; className?: string }) {
  return (
    <img
      src="/assets/dino.svg"
      alt=""
      draggable={false}
      className={`absolute left-0 top-0 select-none ${className ?? ""}`}
      style={{ width: DINO_W, height: DINO_H, clipPath: clip }}
    />
  );
}

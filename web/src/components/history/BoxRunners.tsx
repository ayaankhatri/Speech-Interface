// Pac-man + ghost + coins running the perimeter of a dashed box
import { useEffect, useRef, useState } from "react";

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface Props {
  box: Box;
  chaseSignal: number;
  speed?: number;
  pacSize?: number;
  ghostSize?: number;
  coinSize?: number;
  coinCount?: number;
}

const CLOSED_MS = 200;
const CHASE_MS = 1000;
const RESET_MS = 500;

type Edge = "top" | "right" | "bottom" | "left";

function pathPoint(box: Box, frac: number): { x: number; y: number; edge: Edge } {
  const { left: L, top: T, width: W, height: H } = box;
  const per = 2 * (W + H);
  let d = ((((frac % 1) + 1) % 1)) * per;
  if (d < W) return { x: L + d, y: T, edge: "top" };
  d -= W;
  if (d < H) return { x: L + W, y: T + d, edge: "right" };
  d -= H;
  if (d < W) return { x: L + W - d, y: T + H, edge: "bottom" };
  d -= W;
  return { x: L, y: T + H - d, edge: "left" };
}

function pacTransform(edge: Edge): string {
  if (edge === "right") return "rotate(90deg)";
  if (edge === "bottom") return "scaleX(-1)";
  if (edge === "left") return "rotate(-90deg)";
  return "scaleX(1)";
}

function crossed(prev: number, cur: number, target: number): boolean {
  if (prev <= cur) return target > prev && target <= cur;
  return target > prev || target <= cur;
}

let coinSeq = 0;

export default function BoxRunners({
  box,
  chaseSignal,
  speed = 150,
  pacSize = 47,
  ghostSize = 57,
  coinSize = 27,
  coinCount = 6,
}: Props) {
  const perimeter = 2 * (box.width + box.height);

  const [coins, setCoins] = useState(() =>
    Array.from({ length: coinCount }, () => ({ id: coinSeq++, frac: Math.random() })),
  );
  const [pac, setPac] = useState<{ x: number; y: number; edge: Edge; closed: boolean }>(() => ({
    ...pathPoint(box, 0),
    closed: false,
  }));
  const [ghost, setGhost] = useState(() => pathPoint(box, 0.5));
  const [pacHidden, setPacHidden] = useState(false);

  const coinsRef = useRef(coins);
  coinsRef.current = coins;
  const boxRef = useRef(box);
  boxRef.current = box;
  const phaseRef = useRef<"run" | "chase" | "caught">("run");
  const chaseStartRef = useRef(0);
  const caughtAtRef = useRef(0);
  const closedUntilRef = useRef(0);

  useEffect(() => {
    if (chaseSignal > 0) {
      phaseRef.current = "chase";
      chaseStartRef.current = performance.now();
    }
  }, [chaseSignal]);

  useEffect(() => {
    let raf = 0;
    let start: number | null = null;
    let prevFrac = 0;
    const loop = (t: number) => {
      if (start === null) {
        start = t;
        prevFrac = 0;
      }
      const frac = ((((t - start) / 1000) * speed) / perimeter) % 1;

      const current = coinsRef.current;
      const eaten = current.filter((c) => crossed(prevFrac, frac, c.frac)).map((c) => c.id);
      if (eaten.length) {
        closedUntilRef.current = t + CLOSED_MS;
        setCoins((prev) => {
          const kept = prev.filter((c) => !eaten.includes(c.id));
          const added = eaten.map(() => ({ id: coinSeq++, frac: Math.random() }));
          return [...kept, ...added];
        });
      }

      let gap = 0.5;
      if (phaseRef.current === "chase") {
        const prog = Math.min(1, (t - chaseStartRef.current) / CHASE_MS);
        gap = 0.5 * (1 + prog);
        if (prog >= 1) {
          phaseRef.current = "caught";
          caughtAtRef.current = t;
          setPacHidden(true);
        }
      } else if (phaseRef.current === "caught") {
        gap = 1;
        if (t - caughtAtRef.current > RESET_MS) {
          phaseRef.current = "run";
          setPacHidden(false);
        }
      }

      const p = pathPoint(boxRef.current, frac);
      setPac({ x: p.x, y: p.y, edge: p.edge, closed: t < closedUntilRef.current });
      setGhost(pathPoint(boxRef.current, frac + gap));

      prevFrac = frac;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [perimeter, speed]);

  return (
    <>
      {coins.map((c) => {
        const p = pathPoint(box, c.frac);
        return (
          <img
            key={c.id}
            src="/assets/coin.svg"
            alt=""
            draggable={false}
            className="pointer-events-none absolute select-none"
            style={{ left: p.x - coinSize / 2, top: p.y - coinSize / 2, width: coinSize, height: coinSize }}
          />
        );
      })}

      <img
        src="/assets/ghost.svg"
        alt=""
        draggable={false}
        className="pointer-events-none absolute select-none"
        style={{ left: ghost.x - ghostSize / 2, top: ghost.y - ghostSize / 2, width: ghostSize, height: ghostSize }}
      />

      {!pacHidden && (
        <img
          src={pac.closed ? "/assets/pac-man-closed.svg" : "/assets/pac-man.svg"}
          alt=""
          draggable={false}
          className="pointer-events-none absolute select-none"
          style={{
            left: pac.x - pacSize / 2,
            top: pac.y - pacSize / 2,
            width: pacSize,
            height: pacSize,
            transform: pacTransform(pac.edge),
          }}
        />
      )}
    </>
  );
}

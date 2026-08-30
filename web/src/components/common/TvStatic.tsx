// Animated analog snow, scanlines and vignette — the CRT "no signal" texture.
import { useEffect, useRef } from "react";

// Must match the .tv-off-collapse keyframes name in index.css.
export const COLLAPSE_ANIMATION = "tvOffCollapse";

const NOISE_W = 320;
const NOISE_H = 180;

export default function TvStatic() {
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
      // Random luminance with horizontal correlation, so it streaks along
      // scanlines the way real static does.
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

  return (
    <>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div
        className="absolute inset-0 opacity-40 mix-blend-multiply"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to bottom, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 1px, rgba(0,0,0,0.55) 2px, rgba(0,0,0,0.55) 3px)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(0,0,0,0) 45%, rgba(0,0,0,0.45) 78%, rgba(0,0,0,0.85) 100%)",
        }}
      />
    </>
  );
}

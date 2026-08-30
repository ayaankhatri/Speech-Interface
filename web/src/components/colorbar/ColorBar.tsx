// Colour-bar / no-signal screen
import { useEffect, useRef } from "react";
import { FRAME, SCREEN, TITLE } from "../../layout";
import DvdTitle from "../common/DvdTitle";
import PowerButton from "../common/PowerButton";

interface Props {
  onPower: () => void;
}

const SCREEN_PATH =
  "M71.2678 122.838C73.3826 103.694 88.6852 88.6175 107.858 86.7802C404.672 58.3375 586.288 59.098 887.758 86.8754C907.106 88.6581 922.547 103.915 924.552 123.241C946.973 339.317 947.306 476.197 924.579 700.677C922.574 720.485 906.467 735.983 886.599 737.267C591.017 756.373 409.822 757.815 109.109 737.375C89.3687 736.033 73.3861 720.64 71.3204 700.962C46.6923 466.356 48.3753 330.065 71.2678 122.838Z";

// Peak-to-peak luminance jitter of the grain laid over the bars.
const GRAIN_AMPLITUDE = 110;
const GRAIN_OPACITY = 0.3;

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
        <DvdTitle bounds={SCREEN} fontSize={TITLE.fontSize} boxed />
      </div>
      <img src="/assets/tv.svg" alt="" className="pointer-events-none absolute inset-0 h-full w-full" />

      <PowerButton onClick={onPower} />
    </div>
  );
}

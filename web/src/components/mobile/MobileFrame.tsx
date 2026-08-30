// Phone chassis: scales to fit, clips content to the console screen, and paints
// the bezel + Joy-Cons on top so they never scroll.
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

export const FRAME = { width: 393, height: 852 };
export const SCREEN = { left: 9.5, top: 126, width: 374, height: 611 };
export const INNER = { left: 24.5, top: 141, width: 344, height: 581 };

interface Props {
  children: ReactNode;
  /** Lets content taller than the screen scroll behind the fixed bezel. */
  scrollable?: boolean;
  contentHeight?: number;
}

export default function MobileFrame({ children, scrollable = false, contentHeight }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const fit = () => {
      const s = Math.min(el.clientWidth / FRAME.width, el.clientHeight / FRAME.height);
      setScale(s > 0 ? s : 1);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={wrapperRef} className="flex h-full w-full items-center justify-center overflow-hidden bg-[#26272b]">
      <div
        className="relative overflow-hidden bg-[#26272b]"
        style={{ width: FRAME.width, height: FRAME.height, transform: `scale(${scale})`, transformOrigin: "center" }}
      >
        <div
          className={
            scrollable
              ? "absolute overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              : "absolute overflow-hidden"
          }
          style={{ left: INNER.left, top: INNER.top, width: INNER.width, height: INNER.height }}
        >
          <div className="relative" style={{ width: INNER.width, height: contentHeight ?? INNER.height }}>
            {children}
          </div>
        </div>

        <img
          src="/assets/phone-rectangle.svg"
          alt=""
          draggable={false}
          className="pointer-events-none absolute select-none"
          style={{ left: SCREEN.left, top: SCREEN.top, width: SCREEN.width, height: SCREEN.height }}
        />
        <img
          src="/assets/nintendo-blue.svg"
          alt=""
          draggable={false}
          className="pointer-events-none absolute select-none"
          style={{ left: (FRAME.width - 402) / 2, top: 0, width: 402, height: 147 }}
        />
        <img
          src="/assets/nintendo-red.svg"
          alt=""
          draggable={false}
          className="pointer-events-none absolute select-none"
          style={{ left: (FRAME.width - 402) / 2, top: FRAME.height - 137, width: 402, height: 137 }}
        />
      </div>
    </div>
  );
}

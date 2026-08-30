// Keeps the folder sticker pinned to the bottom-right edge of the title text.
import { useLayoutEffect, useRef, useState } from "react";

interface Options {
  /** Sticker size, used to centre it on the title's baseline corner. */
  width: number;
  height: number;
  /** How far the sticker tucks back over the last glyph. */
  overlap?: number;
  /** Offsets of the title's containing box within the positioning parent. */
  originLeft?: number;
  originTop?: number;
}

export function useFolderAnchor({ width, height, overlap, originLeft = 0, originTop = 0 }: Options) {
  const titleRef = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  const tuck = overlap ?? width * (14 / 66);

  useLayoutEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    const place = () => {
      const rightEdge = originLeft + el.offsetLeft + el.offsetWidth;
      const bottomEdge = originTop + el.offsetTop + el.offsetHeight;
      setPos({ left: rightEdge - tuck, top: bottomEdge - height / 2 });
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(el);
    document.fonts?.ready.then(place).catch(() => {});
    return () => ro.disconnect();
  }, [tuck, height, originLeft, originTop]);

  return { titleRef, pos, width, height };
}

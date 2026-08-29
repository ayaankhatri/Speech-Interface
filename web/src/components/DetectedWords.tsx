import { useLayoutEffect, useRef, useState } from "react";
import { BOX_TEXT, PANEL_INNER_WIDTH } from "../layout";
import DinoRunner from "./DinoRunner";

interface Props {
  words: string[];
  jumpSignal: number;
}

const LINE_HEIGHT = 72;
const MAX_ROWS = 3;
const CONTENT_HEIGHT = MAX_ROWS * LINE_HEIGHT;

export default function DetectedWords({ words, jumpSignal }: Props) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [start, setStart] = useState(0);

  useLayoutEffect(() => {
    if (words.length === 0 && start !== 0) setStart(0);
  }, [words.length, start]);

  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    if (el.scrollHeight > el.clientHeight && start < words.length - 1) {
      setStart((s) => s + 1);
    }
  }, [words, start]);

  const visible = words.slice(start);

  return (
    <>
      <div className="flex h-full items-center">
        <div
          ref={contentRef}
          className="w-full overflow-hidden text-left font-handjet"
          style={{
            maxHeight: CONTENT_HEIGHT,
            color: BOX_TEXT.color,
            fontSize: BOX_TEXT.fontSize,
            fontWeight: BOX_TEXT.fontWeight,
            lineHeight: `${LINE_HEIGHT}px`,
            overflowWrap: "anywhere",
            wordBreak: "break-word",
          }}
        >
          {visible.length === 0 ? (
            <span className="text-white/35">Listening…</span>
          ) : (
            visible.map((w, i) => (
              <span key={start + i}>
                {w}
                {i < visible.length - 1 ? " " : ""}
              </span>
            ))
          )}
        </div>
      </div>

      <DinoRunner trackWidth={PANEL_INNER_WIDTH} minX={0} jumpSignal={jumpSignal} />
    </>
  );
}

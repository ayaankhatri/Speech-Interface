import { useLayoutEffect, useRef, useState } from "react";
import { BOX_TEXT, DETECTED } from "../layout";
import DinoRunner from "./DinoRunner";

interface Props {
  words: string[];
  jumpSignal: number;
}

const FONT_SIZE = BOX_TEXT.fontSize; // 60px, shared box typography
const LINE_HEIGHT = 72; // "normal" line-height at 60px (~1.2)
const MAX_ROWS = 3;
const PAD = 16; // inner padding of the box
const BORDER = 3;

const CONTENT_HEIGHT = MAX_ROWS * LINE_HEIGHT;
const INNER_WIDTH = DETECTED.box.width - 2 * BORDER - 2 * PAD;

/**
 * "Detected Word" panel. Words are appended as they're spoken and kept in a
 * cache. Only the newest words that fit within three rows are shown; when a new
 * word overflows the third row, the oldest visible word drops off the front and
 * everything shifts up — so the text never leaves the box, for any word length.
 */
export default function DetectedWords({ words, jumpSignal }: Props) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [start, setStart] = useState(0);

  // Reset the window when the cache is cleared.
  useLayoutEffect(() => {
    if (words.length === 0 && start !== 0) setStart(0);
  }, [words.length, start]);

  // If the visible words overflow three rows, drop the oldest one. Runs after
  // each render until the content fits (or only one word remains).
  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    if (el.scrollHeight > el.clientHeight && start < words.length - 1) {
      setStart((s) => s + 1);
    }
  }, [words, start]);

  const visible = words.slice(start);

  return (
    <div
      className="absolute"
      style={{ left: DETECTED.box.left, top: DETECTED.box.top }}
    >
      <div
        className="relative box-border rounded-[10px] border-[3px] border-dashed border-[#fefefe]"
        style={{ width: DETECTED.box.width, height: DETECTED.box.height, padding: PAD }}
      >
        <div
          ref={contentRef}
          className="overflow-hidden text-center font-handjet"
          style={{
            height: CONTENT_HEIGHT,
            color: BOX_TEXT.color,
            fontSize: FONT_SIZE,
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
              <span key={start + i}>{w}{i < visible.length - 1 ? " " : ""}</span>
            ))
          )}
        </div>

        {/* Dino patrols the empty floor beneath the words. */}
        <DinoRunner trackWidth={INNER_WIDTH} minX={0} jumpSignal={jumpSignal} />
      </div>
    </div>
  );
}

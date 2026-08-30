// Mobile home screen
import type { WordStream } from "../../hooks/useWordStream";
import { probabilisticWordsFor } from "../../vocab";
import { useFolderAnchor } from "../../hooks/useFolderAnchor";
import DetectedWords from "../home/DetectedWords";
import MobileFrame from "./MobileFrame";
import MobileStatus from "./MobileStatus";

interface Props {
  stream: WordStream;
  onPower: () => void;
  onHistory: () => void;
}

const CONTENT_HEIGHT = 985;

const DETECTED_BOX = { left: 18.5, top: 178, width: 313, height: 313 };
const PROB_BOX = { left: 18.5, top: 555, width: 313, height: 313 };

const BOX_PADDING = 16;
const BOX_INNER_WIDTH = DETECTED_BOX.width - 2 * 3 - 2 * BOX_PADDING;
const DETECTED_FONT = 48;
const DETECTED_LINE = 58;
const FOLDER = { width: 50, height: 43 };
const CAMERA = { width: 81, height: 67 };

export default function MobileHome({ stream, onPower, onHistory }: Props) {
  // The title span is itself absolutely positioned, so its own offsets are the origin.
  const folder = useFolderAnchor({ ...FOLDER, overlap: 11 });
  const candidates = probabilisticWordsFor(stream.latest);

  return (
    <MobileFrame scrollable contentHeight={CONTENT_HEIGHT}>
      <MobileStatus connected={stream.connected} />

      <span
        ref={folder.titleRef}
        className="absolute whitespace-nowrap font-handjet leading-[normal] text-white"
        style={{ left: 37.5, top: 56, fontSize: 48 }}
      >
        Silent Signal
      </span>
      {folder.pos && (
        <img
          src="/assets/folder.svg"
          alt=""
          draggable={false}
          className="pointer-events-none absolute select-none"
          style={{
            left: folder.pos.left,
            top: folder.pos.top,
            width: folder.width,
            height: folder.height,
            transform: "rotate(6.89deg)",
          }}
        />
      )}

      {/* Detected words */}
      <span
        className="absolute whitespace-nowrap font-handjet leading-[normal] text-white"
        style={{ left: 18.5, top: 144, fontSize: 24 }}
      >
        Detected Word
      </span>
      <div
        className="absolute rounded-[10px] border-[3px] border-dashed border-[#fefefe]"
        style={{
          left: DETECTED_BOX.left,
          top: DETECTED_BOX.top,
          width: DETECTED_BOX.width,
          height: DETECTED_BOX.height,
          padding: BOX_PADDING,
        }}
      >
        <DetectedWords
          words={stream.words}
          jumpSignal={stream.jumpSignal}
          fontSize={DETECTED_FONT}
          lineHeight={DETECTED_LINE}
          maxRows={3}
          align="center"
          trackWidth={BOX_INNER_WIDTH}
          dinoInteraction="click"
        />
      </div>

      {/* Probabilistic words */}
      <span
        className="absolute whitespace-nowrap font-handjet leading-[normal] text-white"
        style={{ left: 18.5, top: 521, fontSize: 24 }}
      >
        Probabilistic Words
      </span>
      <img
        src="/assets/stars.svg"
        alt=""
        draggable={false}
        className="pointer-events-none absolute select-none"
        style={{
          left: 287.5,
          top: 531,
          width: 48,
          height: 53,
          transform: "rotate(-30deg)",
        }}
      />
      <div
        className="absolute rounded-[10px] border-[3px] border-dashed border-[#fefefe]"
        style={{
          left: PROB_BOX.left,
          top: PROB_BOX.top,
          width: PROB_BOX.width,
          height: PROB_BOX.height,
        }}
      >
        {/* Rows read left-aligned, block sits vertically centred in the box */}
        <ol
          className="absolute inset-0 flex flex-col justify-center text-left font-handjet leading-[normal] text-white"
          style={{ paddingLeft: 20, paddingRight: 12, fontSize: 44 }}
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <li key={i} className="flex items-baseline gap-3 whitespace-nowrap">
              <span className="w-[30px] shrink-0 text-white/60">{i + 1}.</span>
              <span className="min-w-0 flex-1 overflow-hidden text-ellipsis">
                {candidates[i] ?? <span className="text-white/25">—</span>}
              </span>
            </li>
          ))}
        </ol>
      </div>

      {/* Stickers — camera straddles the probabilistic box's bottom edge */}
      <img
        src="/assets/camera.svg"
        alt=""
        draggable={false}
        className="pointer-events-none absolute select-none"
        style={{
          left: 256.5,
          top: PROB_BOX.top + PROB_BOX.height - CAMERA.height / 2,
          width: CAMERA.width,
          height: CAMERA.height,
          transform: "rotate(110.2deg)",
        }}
      />

      {/* Controls */}
      <img
        src="/assets/stars.svg"
        alt=""
        draggable={false}
        className="pointer-events-none absolute select-none"
        style={{
          left: 35.5,
          top: 884,
          width: 46,
          height: 50,
          transform: "rotate(-30deg)",
        }}
      />
      <button
        type="button"
        onClick={onPower}
        aria-label="Power"
        className="absolute outline-none transition-transform duration-100 active:scale-95"
        style={{ left: 56.5, top: 893, width: 33, height: 31 }}
      >
        <img
          src="/assets/btn-power.svg"
          alt="Power"
          draggable={false}
          className="h-full w-full select-none"
        />
      </button>
      <button
        type="button"
        onClick={stream.startStream}
        aria-label="Start"
        className={`absolute outline-none transition-transform duration-100 active:scale-95 ${
          stream.streaming ? "drop-shadow-[0_0_8px_rgba(89,235,48,0.7)]" : ""
        }`}
        style={{ left: 101.5, top: 891, width: 75, height: 35 }}
      >
        <img
          src="/assets/btn-start.svg"
          alt="Start"
          draggable={false}
          className="h-full w-full select-none"
        />
      </button>
      <button
        type="button"
        onClick={stream.stopStream}
        aria-label="Stop"
        className="absolute outline-none transition-transform duration-100 active:scale-95"
        style={{ left: 180.5, top: 891, width: 75, height: 35 }}
      >
        <img
          src="/assets/btn-stop.svg"
          alt="Stop"
          draggable={false}
          className="h-full w-full select-none"
        />
      </button>
      <button
        type="button"
        onClick={onHistory}
        aria-label="History"
        className="absolute outline-none transition-transform duration-100 active:scale-95"
        style={{ left: 102.5, top: 929, width: 75, height: 35 }}
      >
        <img
          src="/assets/btn-history.svg"
          alt="History"
          draggable={false}
          className="h-full w-full select-none"
        />
      </button>
      <button
        type="button"
        onClick={stream.clear}
        aria-label="Clear"
        className="absolute outline-none transition-transform duration-100 active:scale-95"
        style={{ left: 181.5, top: 928, width: 75, height: 35 }}
      >
        <img
          src="/assets/btn-clear.svg"
          alt="Clear"
          draggable={false}
          className="h-full w-full select-none"
        />
      </button>
    </MobileFrame>
  );
}

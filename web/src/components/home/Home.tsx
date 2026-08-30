// Home screen
import { useLayoutEffect, useRef, useState } from "react";
import { PANEL_LEFT, SCREEN, STICKERS, TITLE } from "../../layout";
import type { WordStream } from "../../hooks/useWordStream";
import { probabilisticWordsFor } from "../../vocab";
import ConnectionStatus from "./ConnectionStatus";
import Panel from "./Panel";
import DetectedWords from "./DetectedWords";
import ProbabilisticWords from "./ProbabilisticWords";
import ControlButtons from "./ControlButtons";

interface Props {
  stream: WordStream;
  onPower: () => void;
  onHistory: () => void;
}

export default function Home({ stream, onPower, onHistory }: Props) {
  const titleTextRef = useRef<HTMLSpanElement>(null);
  const [folderPos, setFolderPos] = useState<{ left: number; top: number }>({
    left: STICKERS.folder.left,
    top: STICKERS.folder.top,
  });

  useLayoutEffect(() => {
    const el = titleTextRef.current;
    if (!el) return;
    const place = () => {
      const rightEdge = SCREEN.left + el.offsetLeft + el.offsetWidth;
      const bottomEdge = TITLE.top + el.offsetHeight;
      setFolderPos({ left: rightEdge - 14, top: bottomEdge - STICKERS.folder.height / 2 });
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(el);
    document.fonts?.ready.then(place).catch(() => {});
    return () => ro.disconnect();
  }, []);

  const candidates = probabilisticWordsFor(stream.latest);

  return (
    <>
      <img src="/assets/tv.svg" alt="" className="absolute inset-0 h-full w-full" />

      <Sticker src="/assets/stars.svg" spec={STICKERS.stars} />
      <Sticker src="/assets/camera.svg" spec={STICKERS.camera} />

      <h1
        className="absolute text-center font-handjet text-white"
        style={{ top: TITLE.top, fontSize: TITLE.fontSize, left: SCREEN.left, width: SCREEN.width }}
      >
        <span ref={titleTextRef}>Silent Signal</span>
      </h1>

      <Sticker src="/assets/folder.svg" spec={{ ...STICKERS.folder, ...folderPos }} />

      <ConnectionStatus connected={stream.powered} onToggle={onPower} />

      <Panel left={PANEL_LEFT.detected} label="Detected Word">
        <DetectedWords words={stream.words} jumpSignal={stream.jumpSignal} />
      </Panel>

      <Panel left={PANEL_LEFT.probabilistic} label="Probabilistic Words">
        <ProbabilisticWords candidates={candidates} />
      </Panel>

      <ControlButtons
        streaming={stream.streaming}
        onPower={onPower}
        onStart={stream.startStream}
        onStop={stream.stopStream}
        onHistory={onHistory}
        onClear={stream.clear}
      />
    </>
  );
}

function Sticker({
  src,
  spec,
}: {
  src: string;
  spec: { left: number; top: number; width: number; height: number; rotate: number };
}) {
  return (
    <img
      src={src}
      alt=""
      draggable={false}
      className="pointer-events-none absolute select-none"
      style={{ left: spec.left, top: spec.top, width: spec.width, height: spec.height, transform: `rotate(${spec.rotate}deg)` }}
    />
  );
}

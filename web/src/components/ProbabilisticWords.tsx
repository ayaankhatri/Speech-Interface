import { BOX_TEXT, PANEL_INNER_WIDTH } from "../layout";

interface Props {
  candidates: string[];
}

const RANK_COLUMN = 46;

export default function ProbabilisticWords({ candidates }: Props) {
  return (
    <ol
      className="flex h-full flex-col justify-between overflow-hidden font-handjet"
      style={{
        color: BOX_TEXT.color,
        fontWeight: BOX_TEXT.fontWeight,
        lineHeight: BOX_TEXT.lineHeight,
      }}
    >
      {Array.from({ length: 5 }).map((_, i) => {
        const word = candidates[i];
        return (
          <li key={i} className="flex items-baseline gap-3">
            <span className="w-[34px] shrink-0 text-[36px] text-white/50">{i + 1}.</span>
            <span
              className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap"
              style={{
                fontSize: BOX_TEXT.fontSize,
                maxWidth: PANEL_INNER_WIDTH - RANK_COLUMN,
              }}
            >
              {word ?? <span className="text-white/25">—</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

import { PROBABILISTIC } from "../layout";

interface Props {
  candidates: string[];
}

const PAD = 16;
const BORDER = 3;

/**
 * "Probabilistic Words" panel — the classifier's top-5 candidates for the most
 * recent detection, ranked best-first. Each row is clamped to a single line so
 * long words stay inside the box.
 */
export default function ProbabilisticWords({ candidates }: Props) {
  return (
    <div
      className="absolute"
      style={{ left: PROBABILISTIC.box.left, top: PROBABILISTIC.box.top }}
    >
      <div
        className="box-border rounded-[10px] border-[3px] border-dashed border-[#fefefe]"
        style={{ width: PROBABILISTIC.box.width, height: PROBABILISTIC.box.height, padding: PAD }}
      >
        <ol className="flex h-full flex-col justify-between font-handjet text-white">
          {Array.from({ length: 5 }).map((_, i) => {
            const word = candidates[i];
            return (
              <li key={i} className="flex items-baseline gap-3 leading-none">
                <span className="w-[28px] shrink-0 text-[30px] text-white/50">
                  {i + 1}.
                </span>
                <span
                  className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[36px]"
                  style={{ maxWidth: PROBABILISTIC.box.width - 2 * BORDER - 2 * PAD - 40 }}
                >
                  {word ?? <span className="text-white/25">—</span>}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

import type { ReactNode } from "react";
import { PANEL } from "../layout";

interface Props {
  left: number;
  label: string;
  children: ReactNode;
}

export default function Panel({ left, label, children }: Props) {
  return (
    <div className="absolute" style={{ left, top: PANEL.top, width: PANEL.width }}>
      <span
        className="absolute left-0 font-handjet text-white"
        style={{ top: -PANEL.labelGap, fontSize: PANEL.labelFontSize }}
      >
        {label}
      </span>
      <div
        className="relative box-border rounded-[10px] border-dashed border-[#fefefe]"
        style={{
          width: PANEL.width,
          height: PANEL.height,
          borderWidth: PANEL.border,
          padding: PANEL.padding,
        }}
      >
        {children}
      </div>
    </div>
  );
}

// Absolute coordinates lifted straight from the Figma frame (node 60:721's
// parent, "MacBook Air - 9"). Everything is positioned on a fixed 1280x832
// stage and scaled to fit the viewport, so the layout stays pixel-accurate to
// the design at any window size.

export const FRAME = { width: 1280, height: 832 } as const;

// The retro-TV background image (Figma "image 2"), including its inner zoom
// transform so the CRT screen lands exactly where the design places it.
export const TV = {
  left: -47,
  top: -35,
  width: 1390,
  height: 900,
  img: { top: "-59.2%", left: "-9.98%", width: "118.52%", height: "217.91%" },
} as const;

// The dark CRT screen area — all interactive content lives inside this.
export const SCREEN = { left: 53, top: 65, width: 888, height: 686 } as const;

export const TITLE = { left: 53, top: 80, fontSize: 64 } as const;

export const STATUS = { dot: { left: 97, top: 150 }, label: { left: 123, top: 146 } } as const;

// Shared word typography for both the Detected and Probabilistic panels.
export const BOX_TEXT = {
  color: "#FFF",
  fontSize: 60,
  fontWeight: 400,
  lineHeight: "normal",
} as const;

// Two equal panels, centred symmetrically across the screen width with an even
// gap between them (screen spans x:53–941; ~44px margins, ~60px gutter).
export const DETECTED = {
  label: { left: 97, top: 196, fontSize: 24 },
  box: { left: 97, top: 232, width: 370, height: 410 },
} as const;

export const PROBABILISTIC = {
  label: { left: 527, top: 196, fontSize: 24 },
  box: { left: 527, top: 232, width: 370, height: 410 },
} as const;

// Bottom control row. Buttons are evenly spaced across the screen width.
export const CONTROLS = { top: 662, height: 62 } as const;

// Decorative stickers, positioned to match their slots in the Figma frame
// (image 21 / image 13 / image 15), including their playful rotations.
export const STICKERS = {
  folder: { left: 660, top: 100, width: 66, height: 59, rotate: 7 },
  stars: { left: 382, top: 182, width: 126, height: 129, rotate: -30 },
  camera: { left: 842, top: 521, width: 99, height: 91, rotate: 110 },
} as const;

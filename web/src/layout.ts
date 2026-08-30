export const FRAME = { width: 1280, height: 832 } as const;

export const TV = {
  left: -47,
  top: -35,
  width: 1390,
  height: 900,
  img: { top: "-59.2%", left: "-9.98%", width: "118.52%", height: "217.91%" },
} as const;

export const SCREEN = { left: 53, top: 65, width: 888, height: 686 } as const;

export const TITLE = { left: 53, top: 80, fontSize: 64 } as const;

export const STATUS = { dot: { left: 97, top: 150 }, label: { left: 123, top: 146 } } as const;

export const BOX_TEXT = {
  color: "#FFF",
  fontSize: 60,
  fontWeight: 400,
  lineHeight: "normal",
} as const;

export const PANEL = {
  top: 232,
  height: 386,
  width: 370,
  border: 3,
  padding: 16,
  labelGap: 36,
  labelFontSize: 24,
} as const;

export const PANEL_LEFT = { detected: 97, probabilistic: 527 } as const;

export const PANEL_INNER_WIDTH = PANEL.width - 2 * PANEL.border - 2 * PANEL.padding;

export const PANEL_BOTTOM = PANEL.top + PANEL.height;

export const CONTROLS = { top: 662, height: 62 } as const;

// The tube's optical centre, which the CRT collapse converges on.
export const SCREEN_CENTER = {
  x: SCREEN.left + SCREEN.width / 2,
  y: SCREEN.top + SCREEN.height / 2,
} as const;

// Power holds one spot on every screen, so switching the set on or off never
// moves the button out from under the cursor.
export const POWER = { left: 197.6, top: 667, width: 54.79, height: 52 } as const;

// The remaining controls keep the row they occupied when power sat inside it.
export const CONTROL_ROW = {
  left: 276.39,
  top: CONTROLS.top,
  width: 520,
  height: CONTROLS.height,
} as const;

export const STICKERS = {
  folder: { left: 660, top: 100, width: 66, height: 59, rotate: 7 },
  stars: { left: 382, top: 182, width: 126, height: 129, rotate: -30 },
  camera: { left: 842, top: 560, width: 99, height: 91, rotate: 110 },
} as const;

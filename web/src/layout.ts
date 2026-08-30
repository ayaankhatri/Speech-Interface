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

export const CONTROLS = { top: 662, height: 62, gap: 24, button: { width: 112, height: 52 } } as const;

// Power button keeps a fixed on-screen slot so the screen-off view can reuse it.
const POWER_HEIGHT = CONTROLS.button.height;
const POWER_WIDTH = (POWER_HEIGHT * 59) / 56;
const CONTROLS_ROW_WIDTH = POWER_WIDTH + 4 * CONTROLS.button.width + 4 * CONTROLS.gap;

export const POWER = {
  left: SCREEN.left + (SCREEN.width - CONTROLS_ROW_WIDTH) / 2,
  top: CONTROLS.top + (CONTROLS.height - POWER_HEIGHT) / 2,
  width: POWER_WIDTH,
  height: POWER_HEIGHT,
} as const;

export const CONTROLS_ROW_LEFT = POWER.left + POWER.width + CONTROLS.gap;

// Time the connection indicator lingers on its old state while the TV animates.
export const POWER_STATUS_DELAY_MS = 600;

export const STICKERS = {
  folder: { left: 660, top: 100, width: 66, height: 59, rotate: 7 },
  stars: { left: 382, top: 182, width: 126, height: 129, rotate: -30 },
  camera: { left: 842, top: 560, width: 99, height: 91, rotate: 110 },
} as const;

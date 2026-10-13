import type { HTMLAttributes } from "react"

// ---- upstream: src/types.ts ----
/** A single stop in the gradient, positioned 0..1 along the ramp. */
export interface GradientStop {
  position: number
  color: string
}

export type GradientPresetName =
  | "sunrise"
  | "bubble"
  | "peach"
  | "tonic"
  | "mint"
  | "spring"
  | "twilight"
  | "bay"

/** Either an explicit multi-stop gradient or a built-in preset name. */
export type GradientInput = GradientStop[] | GradientPresetName

/**
 * Wavefront shape. Each pattern is a distance function over the grid — cells
 * at equal distance light together and form the moving front.
 */
export type SpinPattern = "arrow-up" | "diagonal" | "snake" | "ripple"

export interface GradientSpinProps extends HTMLAttributes<HTMLSpanElement> {
  /** Multi-stop gradient or a preset name. Defaults to `"sunrise"`. */
  gradient?: GradientInput
  /** Wavefront shape. Defaults to `"arrow-up"`. */
  pattern?: SpinPattern
  /** Grid rows. Defaults to `3`. */
  rows?: number
  /** Grid columns. Defaults to `3`. */
  cols?: number
  /** Cell edge length in px. Defaults to `4`. */
  cellSize?: number
  /** Gap between cells in px. Defaults to `2`. */
  cellGap?: number
  /** Cell corner radius in px. Defaults to `1`. */
  cellRadius?: number
  /** One full wave sweep in ms. Defaults to `750`. */
  period?: number
  /** Resting opacity of unlit cells, 0..1. Defaults to `0.1`. */
  dim?: number
  /**
   * How the gradient maps onto cells: `"row"` maps it top→bottom like a
   * backdrop, `"path"` walks the ramp along the wave's travel order (every
   * cell gets a unique sample). Defaults to `"row"`.
   */
  colorBy?: "path" | "row"
  /** Accessible label for the spinner. Defaults to `"Loading"`. */
  label?: string
  /** Freeze to a static mid-state under `prefers-reduced-motion`. Defaults to `true`. */
  respectReducedMotion?: boolean
}

// ---- upstream: src/presets.ts ----
/**
 * Built-in gradients — the same rich multi-stop palettes as the sister
 * library `gradient-shimmer`, so the two compose in one product without the
 * palettes drifting. Raw colors so they read true regardless of theme.
 */
export const gradientPresets: Record<GradientPresetName, GradientStop[]> = {
  sunrise: [
    { color: "#B6D3EF", position: 0 },
    { color: "#CAD1D7", position: 0.153 },
    { color: "#D7CFC8", position: 0.252 },
    { color: "#E1CDB9", position: 0.341 },
    { color: "#EAC6A5", position: 0.424 },
    { color: "#EDB185", position: 0.505 },
    { color: "#EF9B62", position: 0.586 },
    { color: "#F18F60", position: 0.669 },
    { color: "#F48D7A", position: 0.758 },
    { color: "#F78A94", position: 0.857 },
    { color: "#F888A0", position: 1 },
  ],
  bubble: [
    { color: "#F5EBD9", position: 0 },
    { color: "#F2D4DB", position: 0.31 },
    { color: "#EBBDDE", position: 0.5 },
    { color: "#CCBAE3", position: 0.65 },
    { color: "#8CBFF0", position: 0.82 },
    { color: "#78B0FF", position: 1 },
  ],
  peach: [
    { color: "#D9F5FA", position: 0 },
    { color: "#FCD9D6", position: 0.31 },
    { color: "#FCBAC9", position: 0.61 },
    { color: "#F0B3F5", position: 1 },
  ],
  tonic: [
    { color: "#E3EDF0", position: 0 },
    { color: "#E8EBB8", position: 0.27 },
    { color: "#F0DEA3", position: 0.43 },
    { color: "#E8B078", position: 0.75 },
    { color: "#F29682", position: 1 },
  ],
  mint: [
    { color: "#DECEE8", position: 0 },
    { color: "#CBBAEE", position: 0.21 },
    { color: "#7DC0FB", position: 0.46 },
    { color: "#00C7A6", position: 1 },
  ],
  spring: [
    { color: "#F7D5C5", position: 0.07 },
    { color: "#46A8C0", position: 0.58 },
    { color: "#43AE7D", position: 1 },
  ],
  twilight: [
    { color: "#E3CCE6", position: 0 },
    { color: "#4E8CD5", position: 0.35 },
    { color: "#6068C2", position: 0.64 },
    { color: "#38364E", position: 1 },
  ],
  bay: [
    { color: "#DBE3D0", position: 0 },
    { color: "#8DB8A7", position: 0.23 },
    { color: "#2D8E9A", position: 0.42 },
    { color: "#076492", position: 0.59 },
    { color: "#154288", position: 0.79 },
    { color: "#262C81", position: 1 },
  ],
}

// ---- upstream: src/patterns.ts ----
export const spinPatterns: readonly SpinPattern[] = ["arrow-up", "diagonal", "snake", "ripple"]

/**
 * Spatial period (in cells along the travel direction) for the scrolling
 * patterns. A single corner-to-corner sweep teleports on wrap — the trailing
 * comet is still lit at one end while the new head enters the opposite end, so
 * you briefly see two counter-running waves (worst on large/oblong grids).
 * Tiling the wave into repeating bands fixes this: one stripe exits an edge
 * exactly as the next enters the other, seamlessly and independent of grid
 * size. Lower = denser stripes.
 */
const SCROLL_BAND = 4

/**
 * Wave order for a cell: `d` is the cell's distance along the pattern's travel
 * direction, `max` the largest distance in the grid. Cells with equal `d`
 * light together and form the wavefront shape. The `phase = d / (max + 1)`
 * mapping in GradientSpin makes the wrap gap match the inter-front gap, so
 * `d = raw % SCROLL_BAND, max = SCROLL_BAND - 1` yields a seamless scroll.
 */
export function cellWaveOrder(
  pattern: SpinPattern,
  row: number,
  col: number,
  rows: number,
  cols: number
): { d: number; max: number } {
  const centerCol = (cols - 1) / 2
  switch (pattern) {
    case "arrow-up": {
      // Chevron fold across the center column: equal-d cells form a "^" whose
      // apex climbs upward as d grows.
      return {
        d: rows - 1 - row + Math.abs(col - centerCol),
        max: rows - 1 + centerCol,
      }
    }
    case "diagonal":
      // Anti-diagonal stripes scrolling toward the bottom-right, tiled so the
      // loop scrolls seamlessly instead of sweeping corner-to-corner once.
      return { d: (row + col) % SCROLL_BAND, max: SCROLL_BAND - 1 }
    case "snake": {
      // Boustrophedon index from the bottom-left — the wave runs the grid like
      // a snake, alternating direction per row — tiled into scrolling comets so
      // the loop never teleports from the top end back to the bottom start.
      const rowFromBottom = rows - 1 - row
      const leftToRight = rowFromBottom % 2 === 0
      const path = rowFromBottom * cols + (leftToRight ? col : cols - 1 - col)
      return { d: path % SCROLL_BAND, max: SCROLL_BAND - 1 }
    }
    case "ripple": {
      // Chebyshev distance → expanding square rings, the most "LED matrix" of
      // the distance functions.
      const centerRow = (rows - 1) / 2
      return {
        d: Math.max(Math.abs(row - centerRow), Math.abs(col - centerCol)),
        max: Math.max(centerRow, centerCol),
      }
    }
  }
}

// ---- upstream: src/sample-gradient.ts ----
function hexChannel(hex: string, offset: number) {
  return Number.parseInt(hex.slice(offset, offset + 2), 16)
}

function srgbToLinear(value: number) {
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
}

function linearToSrgb(value: number) {
  const clamped = Math.min(Math.max(value, 0), 1)
  return clamped <= 0.0031308 ? clamped * 12.92 : 1.055 * clamped ** (1 / 2.4) - 0.055
}

interface Oklab {
  l: number
  a: number
  b: number
}

function hexToOklab(hex: string): Oklab {
  const normalized = hex.replace(/^#/, "")
  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((c) => c + c)
          .join("")
      : normalized
  const r = srgbToLinear(hexChannel(expanded, 0) / 255)
  const g = srgbToLinear(hexChannel(expanded, 2) / 255)
  const b = srgbToLinear(hexChannel(expanded, 4) / 255)
  const lmsL = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const lmsM = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const lmsS = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return {
    l: 0.2104542553 * lmsL + 0.793617785 * lmsM - 0.0040720468 * lmsS,
    a: 1.9779984951 * lmsL - 2.428592205 * lmsM + 0.4505937099 * lmsS,
    b: 0.0259040371 * lmsL + 0.7827717662 * lmsM - 0.808675766 * lmsS,
  }
}

function oklabToRgbString({ l, a, b }: Oklab): string {
  const lmsL = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const lmsM = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const lmsS = (l - 0.0894841775 * a - 1.291485548 * b) ** 3
  const r = linearToSrgb(4.0767416621 * lmsL - 3.3077115913 * lmsM + 0.2309699292 * lmsS)
  const g = linearToSrgb(-1.2684380046 * lmsL + 2.6097574011 * lmsM - 0.3413193965 * lmsS)
  const bl = linearToSrgb(-0.0041960863 * lmsL - 0.7034186147 * lmsM + 1.707614701 * lmsS)
  return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(bl * 255)})`
}

/**
 * Sample a color at `t` (0..1) from gradient stops. Interpolates in OKLab —
 * straight sRGB lerp detours through desaturated gray between hue families.
 */
export function sampleGradient(stops: readonly GradientStop[], t: number): string {
  if (stops.length === 0) return "currentColor"
  const sorted = [...stops].sort((a, b) => a.position - b.position)
  const clamped = Math.min(Math.max(t, sorted[0].position), sorted[sorted.length - 1].position)
  let lower = sorted[0]
  let upper = sorted[sorted.length - 1]
  for (let index = 0; index < sorted.length - 1; index++) {
    if (clamped >= sorted[index].position && clamped <= sorted[index + 1].position) {
      lower = sorted[index]
      upper = sorted[index + 1]
      break
    }
  }
  const span = upper.position - lower.position
  const mix = span === 0 ? 0 : (clamped - lower.position) / span
  const from = hexToOklab(lower.color)
  const to = hexToOklab(upper.color)
  return oklabToRgbString({
    l: from.l + (to.l - from.l) * mix,
    a: from.a + (to.a - from.a) * mix,
    b: from.b + (to.b - from.b) * mix,
  })
}

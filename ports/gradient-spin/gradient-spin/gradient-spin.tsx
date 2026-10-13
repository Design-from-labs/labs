"use client"

import { type CSSProperties, useMemo } from "react"
import {
  cellWaveOrder,
  type GradientInput,
  type GradientSpinProps,
  type GradientStop,
  gradientPresets,
  sampleGradient,
} from "./gradient-spin-core"

// ---- upstream: src/GradientSpin.tsx ----
/**
 * GradientSpin — a matrix-of-cells loading spinner. A brightness wavefront
 * travels across the grid in an infinite loop; the pattern is a per-cell
 * phase (delay = distance function over the grid), so the whole animation is
 * ONE shared CSS keyframe animating opacity only. Compositor-friendly: it
 * keeps ticking while the main thread is busy with the work you're waiting
 * for. Negative delays mean the loop mounts already in steady state.
 *
 * Styles are injected once at runtime (`useInsertionEffect`, id-deduped) —
 * no CSS import, no Tailwind, zero dependencies.
 */

const STYLE_TEXT = `@keyframes gradient-spin-pulse {
  0% { opacity: 1; }
  45% { opacity: var(--gradient-spin-dim, 0.1); }
  92% { opacity: var(--gradient-spin-dim, 0.1); }
  100% { opacity: 1; }
}
.gradient-spin-cell {
  opacity: var(--gradient-spin-dim, 0.1);
  animation: gradient-spin-pulse var(--gradient-spin-period, 750ms) linear infinite;
  animation-delay: calc((var(--gradient-spin-phase, 0) - 1) * var(--gradient-spin-period, 750ms));
}
@media (prefers-reduced-motion: reduce) {
  [data-gspin-reduced-motion="respect"] .gradient-spin-cell {
    animation: none;
    opacity: 0.6;
  }
}`
// Labs: rendered as <style href precedence> (React 19 hoists and dedupes it,
// and server rendering emits it with the markup) instead of the
// useInsertionEffect injection described above; the custom properties carry
// the component name (--gradient-spin-*).

function resolveStops(gradient: GradientInput): readonly GradientStop[] {
  return typeof gradient === "string" ? gradientPresets[gradient] : gradient
}

export function GradientSpin({
  gradient = "sunrise",
  pattern = "arrow-up",
  rows = 3,
  cols = 3,
  cellSize = 4,
  cellGap = 2,
  cellRadius = 1,
  period = 750,
  dim = 0.1,
  colorBy = "row",
  label = "Loading",
  respectReducedMotion = true,
  className,
  style,
  ...rest
}: GradientSpinProps) {
  const stops = resolveStops(gradient)

  const cells = useMemo(() => {
    const seeds: Array<{ row: number; col: number; d: number; max: number }> = []
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        seeds.push({ row, col, ...cellWaveOrder(pattern, row, col, rows, cols) })
      }
    }
    // "path" color axis: EVERY cell gets a unique sample point so the full
    // multi-stop ramp is always visible — rank cells along the wave (ties on
    // equal distance broken spatially) instead of sampling at the distance
    // value itself, which would collapse a 3×3 arrow to only 4 samples.
    const pathRank = new Map<string, number>()
    if (colorBy === "path") {
      const ordered = [...seeds].sort((a, b) => a.d - b.d || a.row - b.row || a.col - b.col)
      ordered.forEach((seed, index) => {
        pathRank.set(`${seed.row}-${seed.col}`, index)
      })
    }
    return seeds.map((seed) => {
      const key = `${seed.row}-${seed.col}`
      // +1 keeps the wrap-around gap the same as the gap between fronts, so
      // the loop re-enters seamlessly instead of first/last firing together.
      const phase = seed.max === 0 ? 0 : seed.d / (seed.max + 1)
      const colorT =
        colorBy === "path"
          ? seeds.length > 1
            ? (pathRank.get(key) ?? 0) / (seeds.length - 1)
            : 0
          : rows > 1
            ? seed.row / (rows - 1)
            : 0
      return { key, color: sampleGradient(stops, colorT), phase }
    })
  }, [pattern, rows, cols, colorBy, stops])

  const rootStyle: CSSProperties = {
    display: "inline-grid",
    gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
    gridAutoRows: `${cellSize}px`,
    gap: `${cellGap}px`,
    ...style,
  }
  ;(rootStyle as Record<string, string | number>)["--gradient-spin-period"] = `${period}ms`
  ;(rootStyle as Record<string, string | number>)["--gradient-spin-dim"] = dim

  return (
    <span
      role="status"
      aria-label={label}
      data-gspin-reduced-motion={respectReducedMotion ? "respect" : "ignore"}
      className={className}
      style={rootStyle}
      {...rest}
    >
      <style href="designfrom-gradient-spin" precedence="default">
        {STYLE_TEXT}
      </style>
      {cells.map((cell) => (
        <span
          key={cell.key}
          className="gradient-spin-cell"
          style={
            {
              backgroundColor: cell.color,
              borderRadius: `${cellRadius}px`,
              "--gradient-spin-phase": cell.phase,
            } as CSSProperties
          }
        />
      ))}
      {/* Labs: the label as live-region content (aria-label alone is not announced). */}
      <span style={visuallyHidden}>{label}</span>
    </span>
  )
}

// ---- Labs ----
/** The standard visually hidden (sr-only) clip: read by screen readers, never painted. */
const visuallyHidden: CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
}

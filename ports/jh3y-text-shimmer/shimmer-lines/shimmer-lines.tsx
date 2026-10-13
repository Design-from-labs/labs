import type * as React from "react";

import { cn } from "@/lib/utils";

// Upstream CSS (the pen's `main p` rule and its `shimmer` keyframes), with
// component-prefixed parts, keyframes and variables. Public variables are
// `--shimmer-lines-*`; internal ones set from props are `--shimmer-lines--*`.
// The type (border, line height, nowrap) is Tailwind classes on the root, so
// `className` can override it; the effect below is unlayered.
const css = `
[data-slot="shimmer-lines"] {
  --shimmer-lines--duration: calc(
    (var(--shimmer-lines--length, 10) * var(--shimmer-lines--speed, 0.12)) * 1s
  );
  --shimmer-lines--fill: var(
    --shimmer-lines-base,
    color-mix(in hsl, canvas, canvasText 20%)
  );
  --shimmer-lines--offset: calc(var(--shimmer-lines--spread, 3) * 0.5ch);
  --shimmer-lines--angle-deg: calc(var(--shimmer-lines--angle, 295) * 1deg);
  --shimmer-lines--chosen: linear-gradient(
    var(--shimmer-lines--angle-deg),
    #0000 calc(50% - var(--shimmer-lines--offset)),
    var(--shimmer-lines-highlight, canvasText),
    #0000 calc(50% + var(--shimmer-lines--offset))
  );
  background: var(--shimmer-lines--chosen) 0 0 / 300% 100% no-repeat border-box,
    linear-gradient(var(--shimmer-lines--fill), var(--shimmer-lines--fill))
      padding-box;
  -webkit-animation: shimmer-lines-shimmer var(--shimmer-lines--duration)
    infinite both ease-in-out;
  animation: shimmer-lines-shimmer var(--shimmer-lines--duration) infinite both
    ease-in-out;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
[data-slot="shimmer-lines"][data-variant="flame"] {
  --shimmer-lines--chosen: linear-gradient(
    var(--shimmer-lines--angle-deg),
    #0000 calc(50% - var(--shimmer-lines--offset)),
    hsl(45 100% 60%) calc(50% - (var(--shimmer-lines--offset) - 0.5ch)),
    hsl(0 100% 50%),
    #0000 calc(50% + var(--shimmer-lines--offset))
  );
}
[data-slot="shimmer-lines"][data-variant="aurora"] {
  --shimmer-lines--chosen: linear-gradient(
    var(--shimmer-lines--angle-deg),
    #0000 calc(50% - var(--shimmer-lines--offset)),
    #a960ee,
    #ff333d,
    #ffcb57,
    #90e0ff,
    #0000 calc(50% + var(--shimmer-lines--offset))
  );
}

@keyframes shimmer-lines-shimmer {
  0% {
    background-position: 100% 0;
  }
  50%,
  100% {
    background-position: 0% 0;
  }
}

/* Upstream's "Configure" mode: the band holds at a fixed position. */
[data-slot="shimmer-lines"][data-position] {
  -webkit-animation: none;
  animation: none;
  background-position: calc(var(--shimmer-lines--position) * 1%);
}

/* Paused: holds the current frame (WCAG 2.2.2 Pause, Stop, Hide). */
[data-slot="shimmer-lines"][data-paused] {
  animation-play-state: paused;
}

/*
 * Right to left: the band sweeps along the inline direction (from the
 * start edge, now on the right) and its slant is mirrored. Left to right is
 * unchanged.
 */
@keyframes shimmer-lines-shimmer-rtl {
  0% {
    background-position: 0% 0;
  }
  50%,
  100% {
    background-position: 100% 0;
  }
}
[data-slot="shimmer-lines"]:dir(rtl) {
  --shimmer-lines--angle-deg: calc(
    (360 - var(--shimmer-lines--angle, 295)) * 1deg
  );
}
@media (prefers-reduced-motion: no-preference) {
  [data-slot="shimmer-lines"]:not([data-position]):dir(rtl) {
    animation-name: shimmer-lines-shimmer-rtl;
  }
}
[data-slot="shimmer-lines"][data-position]:dir(rtl) {
  background-position: calc((100 - var(--shimmer-lines--position)) * 1%);
}

/* More contrast on request: the resting text takes the highlight color. */
@media (prefers-contrast: more) {
  [data-slot="shimmer-lines"] {
    --shimmer-lines--fill: var(--shimmer-lines-highlight, canvasText);
  }
}

/* Reduced motion: static, fully readable text, no band. */
@media (prefers-reduced-motion: reduce) {
  [data-slot="shimmer-lines"] {
    -webkit-animation: none;
    animation: none;
    background: none;
    color: var(--shimmer-lines-highlight, canvasText);
  }
}

@media (forced-colors: active) {
  [data-slot="shimmer-lines"] {
    animation: none;
    background: none;
    color: CanvasText;
  }
}
`;

/** Counts the characters of text in `node`, or undefined when it cannot. */
function textLength(node: React.ReactNode): number | undefined {
  if (node == null || typeof node === "boolean") {
    return 0;
  }
  if (typeof node === "string" || typeof node === "number") {
    return String(node).length;
  }
  if (Array.isArray(node)) {
    let total = 0;
    for (const child of node) {
      const length = textLength(child);
      if (length === undefined) {
        return undefined;
      }
      total += length;
    }
    return total;
  }
  if (
    typeof node === "object" &&
    "props" in node &&
    typeof node.type === "string"
  ) {
    return textLength(
      (node.props as { children?: React.ReactNode } | null)?.children,
    );
  }
  return undefined;
}

type ShimmerLinesVariant = "classic" | "aurora" | "flame";

export interface ShimmerLinesProps extends React.ComponentProps<"span"> {
  /** The band: one color (classic), or a multi-color aurora or flame. */
  variant?: ShimmerLinesVariant;
  /** Seconds per character of text; the sweep takes longer on longer lines. */
  speed?: number;
  /** A fixed duration in seconds, instead of one derived from the length. */
  duration?: number;
  /**
   * The number of characters the duration is derived from. Defaults to the
   * length of the text in `children`; pass it for text you edit in place.
   */
  length?: number;
  /** Half the band's width, in `ch`. */
  spread?: number;
  /** The band's angle, in degrees (mirrored in right-to-left). */
  angle?: number;
  /** Holds the band at this position, 0 to 100, without animating. */
  position?: number;
  /** Holds the animation on its current frame. */
  paused?: boolean;
}

/**
 * A single line of text with a light band that sweeps across it, clipped to
 * the glyphs, then rests. Pass any text as children; it stays real,
 * selectable and read by screen readers.
 */
function ShimmerLines({
  variant = "classic",
  speed,
  duration,
  length: lengthProp,
  spread,
  angle,
  position,
  paused = false,
  className,
  style,
  children,
  ...props
}: ShimmerLinesProps) {
  const length = lengthProp ?? textLength(children);
  const vars: Record<string, string | number> = {};
  if (length !== undefined) {
    vars["--shimmer-lines--length"] = length;
  }
  if (speed !== undefined) {
    vars["--shimmer-lines--speed"] = speed;
  }
  if (duration !== undefined) {
    vars["--shimmer-lines--duration"] = `${duration}s`;
  }
  if (spread !== undefined) {
    vars["--shimmer-lines--spread"] = spread;
  }
  if (angle !== undefined) {
    vars["--shimmer-lines--angle"] = angle;
  }
  if (position !== undefined) {
    vars["--shimmer-lines--position"] = position;
  }
  return (
    <span
      data-slot="shimmer-lines"
      data-variant={variant}
      data-position={position !== undefined ? "" : undefined}
      data-paused={paused ? "" : undefined}
      className={cn(
        "inline-block self-start whitespace-nowrap border-2 border-transparent font-normal leading-[1.2]",
        className,
      )}
      style={{ ...vars, ...style } as React.CSSProperties}
      {...props}
    >
      <style href="designfrom-shimmer-lines" precedence="default">
        {css}
      </style>
      {children}
    </span>
  );
}

export type { ShimmerLinesVariant };
export { ShimmerLines };

"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

// Upstream CSS (style.css), line for line, with component-prefixed parts
// (data-slot), keyframes and variables. The upstream comments are kept.
// Public variables are `--text-shimmer-*`; internal ones set from props are
// `--text-shimmer--*`.
const css = `
/* original text */
[data-slot="text-shimmer-text"] {
  display: inline-block;
}

/* inert clone positioned above original text.
 * This element acts as a mask for the actual shimmer
 * in the ::after pseudo element.
 *
 * NOTE: It is possible to add the ::after shimmer
 * directly to the original text instead of a clone,
 * but this can cause the text to appear thinner than
 * expected due to masking of sub-pixels. The clone
 * fixes that problem. */
[data-slot="text-shimmer-shine"] {
  --text-shimmer--spread-ch: var(--text-shimmer--spread, 4ch);
  position: relative;
  position: absolute;
  inset: 0;
  overflow: clip;
  color: transparent;
  contain: strict;
  -webkit-user-select: none;
  user-select: none;

  @media (prefers-reduced-motion: reduce) {
    display: none;
  }

  /* This only works in Chrome/Safari, not Firefox */
  @supports (-webkit-mask-clip: text) {
    mask-image: linear-gradient(white, white);
    -webkit-mask-clip: text;
  }

  /* This fallback works in Firefox but unfortunately
   * -moz-element is not GPU accelerated so it causes
   * high CPU usage. The element is the original text, by id. */
  @supports (mask-image: -moz-element(#text)) {
    mask-image: var(--text-shimmer--moz-mask);
  }

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      transparent calc(50% - var(--text-shimmer--spread-ch)),
      var(--text-shimmer-highlight, light-dark(black, white)) 50%,
      transparent calc(50% + var(--text-shimmer--spread-ch))
    );
    will-change: transform;
    pointer-events: none;
    animation: text-shimmer-shimmer var(--text-shimmer--duration, 2.5s) infinite;
  }
}

@keyframes text-shimmer-shimmer {
  from {
    translate: -100% 0;
  }

  to {
    translate: 100% 0;
  }
}

/* Paused: holds the current frame (WCAG 2.2.2 Pause, Stop, Hide). */
[data-slot="text-shimmer"][data-paused] [data-slot="text-shimmer-shine"]::after {
  animation-play-state: paused;
}

/*
 * Right to left: the shine sweeps from the inline start (the right). The
 * keyframes are mirrored rather than the animation reversed, because
 * reversing also reverses the default ease, which is not symmetric.
 */
@keyframes text-shimmer-shimmer-rtl {
  from {
    translate: 100% 0;
  }

  to {
    translate: -100% 0;
  }
}
[data-slot="text-shimmer-shine"]:dir(rtl)::after {
  animation-name: text-shimmer-shimmer-rtl;
}

/* More contrast on request: the gray moves a quarter toward the highlight. */
@media (prefers-contrast: more) {
  [data-slot="text-shimmer"] {
    color: color-mix(
      in srgb,
      var(--text-shimmer-color, #777),
      var(--text-shimmer-highlight, light-dark(black, white)) 25%
    );
  }
}

@media (forced-colors: active) {
  [data-slot="text-shimmer-shine"] {
    display: none;
  }
}
`;

export interface TextShimmerProps extends React.ComponentProps<"span"> {
  /** Half the shine's width, as a CSS length. */
  spread?: string;
  /** One sweep, in seconds. */
  duration?: number;
  /** Holds the shine on its current frame. */
  paused?: boolean;
}

/**
 * Gray text with a light shine sweeping across the glyphs, on the GPU: an
 * inert, hidden copy of the text masks a translating gradient. The text you
 * pass stays real, selectable and read by screen readers; the copy is
 * hidden from them.
 */
function TextShimmer({
  spread,
  duration,
  paused = false,
  className,
  style,
  children,
  ...props
}: TextShimmerProps) {
  // The Firefox fallback masks the shine with the original text, by id.
  const id = `text-shimmer-${React.useId().replace(/[^\w-]/g, "")}`;
  const vars: Record<string, string> = {
    "--text-shimmer--moz-mask": `-moz-element(#${id})`,
  };
  if (spread !== undefined) {
    vars["--text-shimmer--spread"] = spread;
  }
  if (duration !== undefined) {
    vars["--text-shimmer--duration"] = `${duration}s`;
  }
  return (
    <span
      data-slot="text-shimmer"
      data-paused={paused ? "" : undefined}
      className={cn(
        "relative inline-block text-[color:var(--text-shimmer-color,#777)]",
        className,
      )}
      style={{ ...vars, ...style } as React.CSSProperties}
      {...props}
    >
      <style href="designfrom-text-shimmer" precedence="default">
        {css}
      </style>
      <span data-slot="text-shimmer-text" id={id}>
        {children}
      </span>
      {/* inert clone of the children with shimmer masked by text. */}
      <span data-slot="text-shimmer-shine" inert aria-hidden="true">
        {children}
      </span>
    </span>
  );
}

export { TextShimmer };

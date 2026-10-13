import type { ComponentProps } from "react";

// ---- upstream: style.css (Shadow Stacking I) ----
// The pen's two elevation scales, layer for layer: the light scale
// (`.elevation-0` to `.elevation-6`) and the dark scale
// (`.dm-elevation-0` to `.dm-elevation-7`). Each class is now one attribute
// selector of the same specificity, `[data-slot="elevation"][data-level="N"]`,
// and the pen's `:root` color tokens are read as `--elevation-*` variables
// with the pen's values as fallbacks (`--shadow-color` is
// `--elevation-shadow-color`; `--dm-hi-base` is `--elevation-dark-hi-base`;
// `--dm-ring-mid` is `--elevation-dark-ring-mid`; `--dm-drop` is
// `--elevation-dark-drop`), so the item's cssVars, a class or an inline style
// can set them. The pen's `box-shadow` per class becomes two internal
// variables per level, the light list and the dark list, and the rules at the
// end pick one.
//
// Labs additions, none of which changes a pen look:
// - `mode`: "light" and "dark" pick a scale outright; "auto" follows the
//   theme (`.dark`, `[data-theme="dark"]`, or the system when no theme is set);
// - level 7 exists only in the dark scale; on the light scale it repeats
//   level 6 rather than invent a layer;
// - the shadow transitions between levels (not under reduced motion);
// - `prefers-contrast: more` and `forced-colors: active` draw an edge that the
//   faint shadows alone do not give.
const css = `
/* ── Elevation scale: each level holds its light list and its dark list ── */

/* elevation-0 / dm-elevation-0 */
[data-slot="elevation"][data-level="0"] {
  --elevation--shadow-light: 0px 0px 0px 1px var(--elevation-shadow-color, rgb(0 0 0 / 0.06));
  --elevation--shadow-dark: none;
}

/* elevation-1 / dm-elevation-1 */
[data-slot="elevation"][data-level="1"] {
  --elevation--shadow-light:
    0px 0px 0px 1px var(--elevation-shadow-color, rgb(0 0 0 / 0.06)),
    0px 1px 1px -0.5px var(--elevation-shadow-color, rgb(0 0 0 / 0.06));
  --elevation--shadow-dark: inset 0 0 0 1px var(--elevation-dark-ring-base, rgba(255,255,255,0.02));
}

/* elevation-2 / dm-elevation-2 */
[data-slot="elevation"][data-level="2"] {
  --elevation--shadow-light:
    0px 0px 0px 1px var(--elevation-shadow-color, rgb(0 0 0 / 0.06)),
    0px 1px 1px -0.5px var(--elevation-shadow-color, rgb(0 0 0 / 0.06)),
    0px 3px 3px -1.5px var(--elevation-shadow-color, rgb(0 0 0 / 0.06));
  --elevation--shadow-dark:
    inset 0 1px 0 0 var(--elevation-dark-hi-base, rgba(255,255,255,0.02)),
    inset 0 0 0 1px var(--elevation-dark-ring-base, rgba(255,255,255,0.02)),
          0 1px 1px -0.5px var(--elevation-dark-drop, rgba(0,0,0,0.18));
}

/* elevation-3 / dm-elevation-3 */
[data-slot="elevation"][data-level="3"] {
  --elevation--shadow-light:
    0px 0px 0px 1px var(--elevation-shadow-color, rgb(0 0 0 / 0.06)),
    0px 1px 1px -0.5px var(--elevation-shadow-color, rgb(0 0 0 / 0.06)),
    0px 3px 3px -1.5px var(--elevation-shadow-color, rgb(0 0 0 / 0.06)),
    0px 6px 6px -3px var(--elevation-shadow-color, rgb(0 0 0 / 0.06));
  --elevation--shadow-dark:
    inset 0 1px 0 0 var(--elevation-dark-hi-mid, rgba(255,255,255,0.05)),
    inset 0 0 0 1px var(--elevation-dark-ring-base, rgba(255,255,255,0.02)),
          0 0 0 1px rgba(0,0,0,0.12),
          0 1px 1px -0.5px var(--elevation-dark-drop, rgba(0,0,0,0.18)),
          0 3px 3px -1.5px var(--elevation-dark-drop, rgba(0,0,0,0.18));
}

/* elevation-4 / dm-elevation-4 */
[data-slot="elevation"][data-level="4"] {
  --elevation--shadow-light:
    0px 0px 0px 1px var(--elevation-shadow-color, rgb(0 0 0 / 0.06)),
    0px 1px 1px -0.5px var(--elevation-shadow-color, rgb(0 0 0 / 0.06)),
    0px 3px 3px -1.5px var(--elevation-shadow-color, rgb(0 0 0 / 0.06)),
    0px 6px 6px -3px var(--elevation-shadow-color, rgb(0 0 0 / 0.06)),
    0px 12px 12px -6px var(--elevation-shadow-color, rgb(0 0 0 / 0.06));
  --elevation--shadow-dark:
    inset 0 1px 0 0 var(--elevation-dark-hi-mid, rgba(255,255,255,0.05)),
    inset 0 0 0 1px var(--elevation-dark-ring-mid, rgba(255,255,255,0.04)),
          0 0 0 1px rgba(0,0,0,0.14),
          0 1px 1px -0.5px var(--elevation-dark-drop, rgba(0,0,0,0.18)),
          0 3px 3px -1.5px var(--elevation-dark-drop, rgba(0,0,0,0.18)),
          0 6px 6px -3px var(--elevation-dark-drop, rgba(0,0,0,0.18));
}

/* elevation-5 / dm-elevation-5 */
[data-slot="elevation"][data-level="5"] {
  --elevation--shadow-light:
    0px 0px 0px 1px var(--elevation-shadow-color, rgb(0 0 0 / 0.06)),
    0px 1px 1px -0.5px var(--elevation-shadow-color, rgb(0 0 0 / 0.06)),
    0px 3px 3px -1.5px var(--elevation-shadow-color, rgb(0 0 0 / 0.06)),
    0px 6px 6px -3px var(--elevation-shadow-color, rgb(0 0 0 / 0.06)),
    0px 12px 12px -6px var(--elevation-shadow-color, rgb(0 0 0 / 0.06)),
    0px 24px 24px -12px var(--elevation-shadow-color, rgb(0 0 0 / 0.06));
  --elevation--shadow-dark:
    inset 0 1px 0 0 var(--elevation-dark-hi-high, rgba(255,255,255,0.08)),
    inset 0 0 0 1px var(--elevation-dark-ring-mid, rgba(255,255,255,0.04)),
          0 0 0 1px rgba(0,0,0,0.16),
          0 1px 1px -0.5px var(--elevation-dark-drop, rgba(0,0,0,0.18)),
          0 3px 3px -1.5px var(--elevation-dark-drop, rgba(0,0,0,0.18)),
          0 6px 6px -3px var(--elevation-dark-drop, rgba(0,0,0,0.18)),
          0 12px 12px -6px var(--elevation-dark-drop, rgba(0,0,0,0.18));
}

/* elevation-6 / dm-elevation-6 */
[data-slot="elevation"][data-level="6"] {
  --elevation--shadow-light:
    0px 0px 0px 1px var(--elevation-shadow-color, rgb(0 0 0 / 0.06)),
    0px 1px 1px -0.5px var(--elevation-shadow-color, rgb(0 0 0 / 0.06)),
    0px 3px 3px -1.5px var(--elevation-shadow-color, rgb(0 0 0 / 0.06)),
    0px 6px 6px -3px var(--elevation-shadow-color, rgb(0 0 0 / 0.06)),
    0px 12px 12px -6px var(--elevation-shadow-color, rgb(0 0 0 / 0.06)),
    0px 24px 24px -12px var(--elevation-shadow-color, rgb(0 0 0 / 0.06)),
    0px 48px 48px -24px var(--elevation-shadow-color, rgb(0 0 0 / 0.06));
  --elevation--shadow-dark:
    inset 0 1px 0 0 var(--elevation-dark-hi-high, rgba(255,255,255,0.08)),
    inset 0 0 0 1px var(--elevation-dark-ring-high, rgba(255,255,255,0.06)),
          0 0 0 1px rgba(0,0,0,0.18),
          0 1px 1px -0.5px var(--elevation-dark-drop, rgba(0,0,0,0.18)),
          0 3px 3px -1.5px var(--elevation-dark-drop, rgba(0,0,0,0.18)),
          0 6px 6px -3px var(--elevation-dark-drop, rgba(0,0,0,0.18)),
          0 12px 12px -6px var(--elevation-dark-drop, rgba(0,0,0,0.18)),
          0 24px 24px -12px var(--elevation-dark-drop, rgba(0,0,0,0.18));
}

/* dm-elevation-7 (the light scale stops at 6, so its level 7 repeats level 6) */
[data-slot="elevation"][data-level="7"] {
  --elevation--shadow-light:
    0px 0px 0px 1px var(--elevation-shadow-color, rgb(0 0 0 / 0.06)),
    0px 1px 1px -0.5px var(--elevation-shadow-color, rgb(0 0 0 / 0.06)),
    0px 3px 3px -1.5px var(--elevation-shadow-color, rgb(0 0 0 / 0.06)),
    0px 6px 6px -3px var(--elevation-shadow-color, rgb(0 0 0 / 0.06)),
    0px 12px 12px -6px var(--elevation-shadow-color, rgb(0 0 0 / 0.06)),
    0px 24px 24px -12px var(--elevation-shadow-color, rgb(0 0 0 / 0.06)),
    0px 48px 48px -24px var(--elevation-shadow-color, rgb(0 0 0 / 0.06));
  --elevation--shadow-dark:
    inset 0 1px 0 0 var(--elevation-dark-hi-peak, rgba(255,255,255,0.11)),
    inset 0 0 0 1px var(--elevation-dark-ring-high, rgba(255,255,255,0.06)),
          0 0 0 1px rgba(0,0,0,0.20),
          0 1px 1px -0.5px var(--elevation-dark-drop, rgba(0,0,0,0.18)),
          0 3px 3px -1.5px var(--elevation-dark-drop, rgba(0,0,0,0.18)),
          0 6px 6px -3px var(--elevation-dark-drop, rgba(0,0,0,0.18)),
          0 12px 12px -6px var(--elevation-dark-drop, rgba(0,0,0,0.18)),
          0 24px 24px -12px var(--elevation-dark-drop, rgba(0,0,0,0.18)),
          0 48px 48px -24px var(--elevation-dark-drop, rgba(0,0,0,0.18));
}

/* Labs: pick the list. Light is the default; dark applies for mode="dark",
   and for mode="auto" under a dark theme. */
[data-slot="elevation"] {
  --elevation--edge: var(--elevation-edge-light, rgb(0 0 0 / 0.6));
  box-shadow: var(--elevation--shadow-light);
}

[data-slot="elevation"][data-mode="dark"],
:root[data-theme="dark"] [data-slot="elevation"][data-mode="auto"],
.dark [data-slot="elevation"][data-mode="auto"] {
  --elevation--edge: var(--elevation-edge-dark, rgb(255 255 255 / 0.6));
  box-shadow: var(--elevation--shadow-dark);
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) [data-slot="elevation"][data-mode="auto"] {
    --elevation--edge: var(--elevation-edge-dark, rgb(255 255 255 / 0.6));
    box-shadow: var(--elevation--shadow-dark);
  }
}

@media (prefers-reduced-motion: no-preference) {
  [data-slot="elevation"] {
    transition: box-shadow 200ms ease;
  }
}

/* Labs: contrast on request. The pen's rings are 2% to 6% white or 6% black;
   when asked for more contrast every elevated surface gets a drawn edge. */
@media (prefers-contrast: more) {
  [data-slot="elevation"] {
    outline: 1px solid var(--elevation--edge);
    outline-offset: -1px;
  }
}

/* Labs: forced colors remove shadows, so the edge is a system color. */
@media (forced-colors: active) {
  [data-slot="elevation"]:not([data-level="0"]) {
    outline: 1px solid CanvasText;
    outline-offset: -1px;
  }
}
`;

/** The pen's levels: 0 to 6 on the light scale, 0 to 7 on the dark scale. */
export type ElevationLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** Which scale: pick one outright, or follow the theme. */
export type ElevationMode = "light" | "dark" | "auto";

export type ElevationProps = ComponentProps<"div"> & {
  /**
   * How far the surface lifts. Light: 0 flat ring, 2 card, 3 popover, 5 modal,
   * 6 full overlay. Dark: 3 card, 4 popover, 6 modal, 7 full overlay.
   */
  level?: ElevationLevel;
  /** "light" or "dark" paints that scale; "auto" follows the theme. */
  mode?: ElevationMode;
};

/**
 * A surface with a stacked box-shadow elevation: each step adds one more
 * layer, doubling the offset and blur (1, 3, 6, 12, 24, 48) with a spread of
 * minus half the blur, so the shadow stays tight. On a dark surface the same
 * idea paints light instead: an inset top highlight and an inset ring that
 * strengthen as the surface lifts.
 *
 * It sets only the shadow; give it a size, a radius and a background.
 */
export function Elevation({
  level = 2,
  mode = "auto",
  className,
  children,
  ...props
}: ElevationProps) {
  const clamped = Math.min(7, Math.max(0, Math.round(level))) as ElevationLevel;
  return (
    <>
      <style href="designfrom-elevation" precedence="default">
        {css}
      </style>
      <div
        {...props}
        data-slot="elevation"
        data-level={clamped}
        data-mode={mode}
        className={className}
      >
        {children}
      </div>
    </>
  );
}

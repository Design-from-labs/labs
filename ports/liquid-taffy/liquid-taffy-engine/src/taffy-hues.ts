// ---- upstream: src/components/liquid/hues.ts ----
/* The family's joint colours — ONE table, shared.

   One hue per glyph (circle teal, cross violet, square sky, triangle amber),
   bright enough to carry on the dark frame. The speed dial
   wears them on its satellites; the two dropdowns wear the SAME hues on
   their rows, so "which shape has the finger reached" is one language across
   every liquid surface. Bodies never change colour (see the family rule):
   these hues live only in the seam gradient and the neon a completed merge
   puts under a glyph.

   Labs: the per-shape hues are a neutral set chosen by the owner instead of
   upstream's, so the shape set does not carry a known controller's colour
   identity. Shapes, layout and every other value are unchanged. */

import type { LiquidTheme } from "./taffy-theme";

/* One hue per frame — the frame's own type decides the shape, so a third
   frame could never be added to the family without every motif answering for
   it. The `light` half is held but not worn: the light frame is monochrome
   by rule (see motifHue), and these are the values it would wear the day
   that changes. */
export type BubbleHue = Record<LiquidTheme, string>;

export const SHAPE_HUES = {
  circle: { light: "#0d9488", dark: "#2dd4bf" } satisfies BubbleHue,
  /* The cross is violet, kin to the family's seam violet, vivid enough to
     stand beside the other three. */
  cross: { light: "#7c3aed", dark: "#a78bfa" } satisfies BubbleHue,
  square: { light: "#0284c7", dark: "#38bdf8" } satisfies BubbleHue,
  triangle: { light: "#d97706", dark: "#fbbf24" } satisfies BubbleHue,
} as const;

export type ShapeName = keyof typeof SHAPE_HUES;

/* Only seamHue needs it — kept private so the table stays the file's one
   export surface. */
function mixHex(one: string, two: string, amount: number) {
  const parse = (hex: string) => [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16));
  const [r1, g1, b1] = parse(one);
  const [r2, g2, b2] = parse(two);
  const blend = (a: number, b: number) => Math.round(a + (b - a) * amount);
  return `#${[blend(r1, r2), blend(g1, g2), blend(b1, b2)]
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;
}

/* The colour language belongs to the DARK frame alone. On the light frame
   the family stays monochrome: the GLYPHS remain, but nothing is
   colour-coded. Hovers keep the surface's own ink, joints run the file's
   single seam violet, and the burst flies in the icons' ink.

   `null` means "no motif here"; every consumer falls back to its own ink,
   so the rule lives in ONE place and the two frames can never drift. */
export function motifHue(hue: BubbleHue, theme: LiquidTheme) {
  return theme === "dark" ? hue.dark : null;
}

/* A whisper of white on the dark frame — just enough luminance for a 1px line
   on a near-black rim. Any more and the vivid hues wash out to pastel, which
   is the opposite of what they are here for. */
export function seamHue(hue: string, theme: LiquidTheme) {
  return theme === "dark" ? mixHex(hue, "#ffffff", 0.08) : hue;
}

/* The neon under a lit glyph: the icon's own colour at partial opacity,
   twice — a tight core and a wider bloom. */
export function neonGlow(hue: string) {
  return `drop-shadow(0 0 3px ${hue}e6) drop-shadow(0 0 8px ${hue}80)`;
}

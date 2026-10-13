// ---- upstream: src/components/LiquidMenu/icons.tsx ----
/* The plus is the design's own asset; the item glyphs (circle / cross /
   square / triangle) are the 24px set supplied with the design, rendered at
   12px: 24-box stroke 2 at half size is EXACTLY the plus's 1px line, and the
   20-unit glyph lands at 10px — the same span as the plus's arms. Same
   border, same optical size, one family.

   Labs: this is the default style's glyph file. The `icons` style replaces it
   with icon-library glyphs behind the same exports (ShapeGlyph, CheckGlyph,
   PlusIcon, MorphGlyphs), so every other file is shared. */

import type { Ref } from "react";

export type TaffyShape = "circle" | "cross" | "triangle" | "square";

type IconProps = {
  className?: string;
};

/* The raw 24-box geometry, exported for the row icons' morph
   (taffy-icon-morph.tsx) and the full-set burst: they need the d strings
   themselves, not the components. The components below draw from the SAME
   constants — one geometry, several consumers, no drift. */
export const ICON_PATHS = {
  circle:
    "M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z",
  square:
    "M3 7.8C3 6.11984 3 5.27976 3.32698 4.63803C3.6146 4.07354 4.07354 3.6146 4.63803 3.32698C5.27976 3 6.11984 3 7.8 3H16.2C17.8802 3 18.7202 3 19.362 3.32698C19.9265 3.6146 20.3854 4.07354 20.673 4.63803C21 5.27976 21 6.11984 21 7.8V16.2C21 17.8802 21 18.7202 20.673 19.362C20.3854 19.9265 19.9265 20.3854 19.362 20.673C18.7202 21 17.8802 21 16.2 21H7.8C6.11984 21 5.27976 21 4.63803 20.673C4.07354 20.3854 3.6146 19.9265 3.32698 19.362C3 18.7202 3 17.8802 3 16.2V7.8Z",
  cross: "M4.5 4.5L19.5 19.5M19.5 4.5L4.5 19.5",
  triangle:
    "M2.39019 18.0983L10.6151 3.89171C11.0696 3.10655 11.2969 2.71396 11.5935 2.58211C11.8521 2.4671 12.1474 2.4671 12.4061 2.58211C12.7026 2.71396 12.9299 3.10654 13.3844 3.89171L21.6093 18.0983C22.0655 18.8863 22.2936 19.2803 22.2599 19.6037C22.2305 19.8857 22.0827 20.142 21.8534 20.3088C21.5904 20.5 21.1352 20.5 20.2246 20.5H3.77487C2.86435 20.5 2.40908 20.5 2.14613 20.3088C1.91677 20.142 1.769 19.8857 1.73959 19.6037C1.70588 19.2803 1.93398 18.8863 2.39019 18.0983Z",
  check: "M4.5 12.5L9.5 17.5L19.5 6.5",
} as const;

export function PlusIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path d="M8 3v10M3 8h10" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* Labs: one glyph by name, at any size and stroke — the satellites draw it
   at 12px (stroke 2), the full-set burst at 9 to 18px (stroke 2.4). The
   cross's path spans more of the box than its siblings' (4.5..19.5 against
   their 2..22): two bare diagonals carry far less ink than a closed outline,
   so drawn at the same nominal size the glyph read a step small — the box
   stays the same, only the strokes reach further. */
export function ShapeGlyph({
  shape,
  className,
  size = 12,
  strokeWidth = 2,
}: IconProps & { shape: TaffyShape; size?: number; strokeWidth?: number }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d={ICON_PATHS[shape]}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* The tick a selected row morphs its shape into. */
export function CheckGlyph({ className, size = 12 }: IconProps & { size?: number }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d={ICON_PATHS.check}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* Labs: the row icon's two parts — the resting glyph and the tick — as the
   morph animates them (upstream's IconMorph markup): one 12px svg, two
   paths, each turned and scaled about its own centre. */
export function MorphGlyphs({
  shape,
  shapeRef,
  checkRef,
  className,
}: IconProps & {
  shape: TaffyShape;
  shapeRef: Ref<SVGPathElement>;
  checkRef: Ref<SVGPathElement>;
}) {
  return (
    <svg
      className={className}
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        ref={shapeRef}
        d={ICON_PATHS[shape]}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        ref={checkRef}
        d={ICON_PATHS.check}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

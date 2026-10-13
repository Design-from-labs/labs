// The glyph slots of the liquid surfaces filled from an icon library (the
// "Icon library" style). The default style draws upstream's own glyphs
// instead (decision 0025): they are tuned to the 1px line of the plus and
// to the 12px row, and no library reproduces them, so the shapes here are the
// library's nearest circle, cross, triangle, square, plus and tick.
//
// The exports are the default style's (PlusIcon, ShapeGlyph, CheckGlyph,
// MorphGlyphs, TaffyShape), so every other file is shared.
import {
  Check as LibraryCheck,
  Circle as LibraryCircle,
  Plus as LibraryPlus,
  Square as LibrarySquare,
  Triangle as LibraryTriangle,
  X as LibraryCross,
} from "lucide-react";
import type { Ref } from "react";

export type TaffyShape = "circle" | "cross" | "triangle" | "square";

type IconProps = {
  className?: string;
};

const SHAPES = {
  circle: LibraryCircle,
  cross: LibraryCross,
  triangle: LibraryTriangle,
  square: LibrarySquare,
} as const;

export function PlusIcon({ className }: IconProps) {
  return <LibraryPlus className={className} size={16} strokeWidth={1.5} aria-hidden="true" />;
}

/* One glyph by name, at any size and stroke: the satellites draw it at 12px,
   the full-set burst at 9 to 18px. */
export function ShapeGlyph({
  shape,
  className,
  size = 12,
  strokeWidth = 2,
}: IconProps & { shape: TaffyShape; size?: number; strokeWidth?: number }) {
  const Icon = SHAPES[shape];
  return <Icon className={className} size={size} strokeWidth={strokeWidth} aria-hidden="true" />;
}

/* The tick a selected row morphs its shape into. */
export function CheckGlyph({ className, size = 12 }: IconProps & { size?: number }) {
  return <LibraryCheck className={className} size={size} aria-hidden="true" />;
}

/* The row icon's two parts, as the morph animates them: one 12px svg with the
   resting glyph and the tick, each in a group the timeline turns and scales
   about its own centre. The refs are typed for the default style's paths; a
   group takes them the same way. */
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
  const Icon = SHAPES[shape];
  return (
    <svg
      className={className}
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <g ref={shapeRef as unknown as Ref<SVGGElement>}>
        <Icon size={24} />
      </g>
      <g ref={checkRef as unknown as Ref<SVGGElement>}>
        <LibraryCheck size={24} />
      </g>
    </svg>
  );
}

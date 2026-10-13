"use client";

import * as React from "react";

import {
  ScrollCarousel,
  type ScrollCarouselImage,
} from "@/components/ui/scroll-carousel";

const TOTAL = 16;

/**
 * Original placeholder art for picture `index`: a gradient whose hue steps
 * round the wheel, with a soft disc. Generated here so the gallery ships no
 * photographs (the pen loaded random photos from a photo service).
 */
function placeholder(index: number): string {
  const hue = Math.round((index * 360) / TOTAL);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue} 70% 62%)"/><stop offset="1" stop-color="hsl(${(hue + 50) % 360} 65% 32%)"/></linearGradient></defs><rect width="300" height="300" fill="url(#g)"/><circle cx="210" cy="96" r="44" fill="hsl(${(hue + 180) % 360} 80% 85% / 0.55)"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const IMAGES: ScrollCarouselImage[] = Array.from({ length: TOTAL }, (_, i) => ({
  src: placeholder(i),
  alt: `Gradient ${i + 1} of ${TOTAL}`,
}));

// The pen's page backdrop: a grid of hairlines that fades out toward the
// lower end.
const GRID = {
  "--size": "60px",
  "--line": "color-mix(in lch, canvasText 35%, hsl(0 0% 100% / 0.25))",
  background:
    "linear-gradient(90deg, var(--line) 1px, transparent 1px var(--size)) 50% 50% / var(--size) var(--size), linear-gradient(var(--line) 1px, transparent 1px var(--size)) 50% 50% / var(--size) var(--size)",
  WebkitMask: "linear-gradient(-25deg, transparent 65%, white)",
  mask: "linear-gradient(-25deg, transparent 65%, white)",
} as React.CSSProperties;

export default function ScrollCarouselDemo() {
  const root = React.useRef<HTMLDivElement>(null);
  const [wall, setWall] = React.useState(false);
  React.useEffect(() => {
    // On the gallery wall nobody can scroll, so the ring turns by itself
    // (the wall pauses it offscreen, in a hidden tab and under reduced motion).
    setWall(root.current?.closest("[data-tile]") != null);
  }, []);
  return (
    <div
      ref={root}
      className="relative h-[420px] w-[40rem] max-w-full overflow-hidden rounded-xl"
      style={{ colorScheme: "dark only", background: "canvas" }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={GRID}
      />
      <ScrollCarousel
        images={IMAGES}
        label="Gradient gallery"
        scrollDriven={!wall}
      />
    </div>
  );
}

"use client";

import {
  FoldCarousel,
  FoldCarouselFrame,
  FoldCarouselNext,
  FoldCarouselPrevious,
} from "@/components/ui/fold-carousel";

// Original art: four abstract landscapes as inline SVG, so the demo needs no
// image files.
function art(hue: number, sun: number) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="hsl(${hue} 65% 74%)"/><stop offset="1" stop-color="hsl(${(hue + 35) % 360} 55% 42%)"/></linearGradient></defs><rect width="200" height="100" fill="url(#s)"/><circle cx="${sun}" cy="32" r="13" fill="hsl(${(hue + 180) % 360} 85% 84%)"/><path d="M0 68 Q50 44 100 64 T200 56 V100 H0Z" fill="hsl(${(hue + 200) % 360} 35% 30%)"/><path d="M0 80 Q60 64 120 78 T200 74 V100 H0Z" fill="hsl(${(hue + 220) % 360} 40% 18%)"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const SLIDES = [
  { src: art(28, 150), alt: "An amber dusk over low hills" },
  { src: art(200, 52), alt: "A blue morning over a ridge" },
  { src: art(140, 110), alt: "A green valley at noon" },
  { src: art(300, 168), alt: "A violet night over the dunes" },
].map(({ src, alt }) => <img key={src} src={src} alt={alt} />);

export default function FoldCarouselDemo() {
  return (
    <FoldCarousel
      slides={SLIDES}
      aria-label="Landscapes"
      className="flex flex-col items-center gap-12 py-8"
    >
      <FoldCarouselFrame panelWidth="min(12rem, 40vw)" />
      <div className="flex gap-2">
        <FoldCarouselPrevious />
        <FoldCarouselNext />
      </div>
    </FoldCarousel>
  );
}

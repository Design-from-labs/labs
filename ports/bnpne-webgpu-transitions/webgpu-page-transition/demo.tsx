"use client";

import * as React from "react";

import {
  WebGPUPageTransition,
  type WebGPUPageTransitionView,
} from "@/components/ui/webgpu-page-transition";

// Original art: five abstract compositions as inline SVG (with a size, so
// they rasterize sharp as textures), so the demo needs no image files.
function art(i: number, width: number, height: number) {
  const hue = (i * 67 + 20) % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue} 60% 80%)"/><stop offset="1" stop-color="hsl(${(hue + 60) % 360} 50% 36%)"/></linearGradient></defs><rect width="${width}" height="${height}" fill="url(#g)"/><circle cx="${width * 0.62}" cy="${height * 0.34}" r="${Math.min(width, height) * 0.24}" fill="hsl(${(hue + 160) % 360} 75% 64%)" opacity=".85"/><rect x="${width * 0.12}" y="${height * 0.58}" width="${width * 0.56}" height="${height * 0.2}" rx="${height * 0.04}" fill="hsl(${(hue + 220) % 360} 55% 42%)" opacity=".85"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const SIZES: [number, number][] = [
  [600, 900],
  [900, 600],
  [560, 920],
  [600, 800],
  [960, 580],
];
const CAPTIONS = ["Dune", "Harbour", "Spire", "Orchard", "Delta"];
const FACTS = [
  "A study in warm sand tones: one circle, one bar, and the light between them.",
  "Wide and low, like a quay at first light, with the colour pooling at the edge.",
  "Tall and narrow; the circle sits high, so the eye climbs to meet it.",
  "Softer greens, stacked close, the way rows of trees fold into each other.",
  "The widest frame: colour fanning out where a river meets the sea.",
];
const IMAGES = SIZES.map(([width, height], i) => ({
  src: art(i, width, height),
  alt: "",
  width,
  height,
  caption: CAPTIONS[i],
  fact: FACTS[i],
}));

const TOUR: WebGPUPageTransitionView[] = [
  { page: "inner", image: 2 },
  { page: "main" },
  { page: "index" },
  { page: "main" },
];

/**
 * On the specimen wall only, step through the views on a timer, holding while
 * the wall marks the tile paused (off screen, hidden tab, reduced motion, the
 * visitor's pause).
 */
function useWallTour(
  root: React.RefObject<HTMLDivElement | null>,
  setView: (view: WebGPUPageTransitionView) => void,
) {
  React.useEffect(() => {
    let timer = 0;
    let step = 0;
    const tick = () => {
      const el = root.current;
      if (!el?.closest("[data-specimen]")) {
        return;
      }
      if (el.closest("[data-loop-paused]")) {
        timer = window.setTimeout(tick, 250);
        return;
      }
      setView(TOUR[step % TOUR.length]);
      step += 1;
      timer = window.setTimeout(tick, 2800);
    };
    timer = window.setTimeout(tick, 1800);
    return () => window.clearTimeout(timer);
  }, [root, setView]);
}

export default function WebGPUPageTransitionDemo() {
  const root = React.useRef<HTMLDivElement>(null);
  const [view, setView] = React.useState<WebGPUPageTransitionView>({
    page: "main",
  });
  useWallTour(root, setView);
  return (
    <WebGPUPageTransition
      ref={root}
      images={IMAGES}
      view={view}
      onViewChange={setView}
      className="aspect-[16/10] h-auto w-full max-w-3xl rounded-lg border"
    />
  );
}

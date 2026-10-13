"use client";

import {
  ViscoseCarousel,
  type ViscoseCarouselItem,
} from "@/components/ui/viscose-carousel";

// Eighteen invented projects. Neighbours melt into each other, so the tones
// run dark, light, mid as the hues walk the colour wheel.
const PROJECTS: [string, string, string][] = [
  ["Emberline", "Photography", "2026"],
  ["Rosefold", "Architecture", "2025"],
  ["Ochre Study", "Campaign", "2024"],
  ["Fernhollow", "Editorial", "2026"],
  ["Saltmere", "Photography", "2023"],
  ["Dune Notes", "Film", "2025"],
  ["Tidepool", "Art Direction", "2024"],
  ["Pewter Hours", "Editorial", "2025"],
  ["Gilt Room", "Architecture", "2023"],
  ["Mossgarden", "Film", "2024"],
  ["Paper Sun", "Motion", "2026"],
  ["Cobalt Drift", "Photography", "2025"],
  ["Lantern", "Documentary", "2024"],
  ["Slate Weather", "Editorial", "2023"],
  ["Amberfall", "Photography", "2026"],
  ["Driftglass", "Campaign", "2025"],
  ["Kiln", "Photography", "2024"],
  ["Afterglow", "Architecture", "2026"],
];

/** Original abstract art for card i, as an SVG data URL (1200 x 800). */
function art(i: number): string {
  const hue = (8 + i * 21) % 360;
  const light = [20, 68, 42][i % 3];
  const c = (shift: number, sat: number, l: number) =>
    `hsl(${(hue + shift + 360) % 360} ${sat}% ${Math.max(4, Math.min(94, l))}%)`;
  const r = (v: number) => v.toFixed(1);
  let shapes = "";
  switch (i % 6) {
    case 0: {
      // A low sun behind a horizon.
      shapes = `<radialGradient id="s" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${c(18, 80, light + 30)}"/><stop offset="1" stop-color="${c(8, 70, light + 8)}"/></radialGradient><circle cx="${r(420 + i * 9)}" cy="430" r="230" fill="url(#s)"/><rect y="520" width="1200" height="280" fill="${c(-14, 40, light - 8)}"/>`;
      break;
    }
    case 1: {
      // Diagonal bands.
      for (let k = 0; k < 6; k++) {
        const x = -400 + k * 260;
        shapes += `<path d="M${x} 800 L${x + 400} 0 L${x + 520} 0 L${x + 120} 800 Z" fill="${c(k * 6, 50, light + (k % 2 ? 14 : -6))}" fill-opacity="0.85"/>`;
      }
      break;
    }
    case 2: {
      // Rings from a corner.
      for (let k = 7; k > 0; k--) {
        shapes += `<circle cx="980" cy="760" r="${k * 120}" fill="${c(k * 4, 45, light + (k % 2 ? 12 : -4))}"/>`;
      }
      break;
    }
    case 3: {
      // An arch with its shadow.
      shapes = `<rect x="0" y="560" width="1200" height="240" fill="${c(-10, 30, light - 10)}"/><path d="M430 640 L430 330 A170 170 0 0 1 770 330 L770 640 Z" fill="${c(20, 55, light + 22)}"/><path d="M770 640 L770 330 A170 170 0 0 0 690 186 L690 640 Z" fill="${c(0, 40, light + 6)}"/>`;
      break;
    }
    case 4: {
      // Layered hills.
      for (let k = 0; k < 4; k++) {
        const y = 380 + k * 110;
        shapes += `<path d="M0 ${y} C300 ${y - 120} 520 ${y + 80} 800 ${y - 40} S1100 ${y - 60} 1200 ${y} L1200 800 L0 800 Z" fill="${c(-k * 8, 45, light + 14 - k * 9)}"/>`;
      }
      break;
    }
    default: {
      // A field of dots.
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 6; col++) {
          shapes += `<circle cx="${150 + col * 180}" cy="${130 + row * 180}" r="${40 + ((row + col) % 3) * 18}" fill="${c((row + col) * 7, 55, light + 18)}" fill-opacity="${(0.45 + ((row * 6 + col) % 5) * 0.12).toFixed(2)}"/>`;
        }
      }
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800"><defs><linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c(-8, 38, light + 10)}"/><stop offset="1" stop-color="${c(10, 46, light - 10)}"/></linearGradient></defs><rect width="1200" height="800" fill="url(#b)"/>${shapes}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export const ITEMS: ViscoseCarouselItem[] = PROJECTS.map(
  ([title, discipline, year], i) => ({
    title,
    discipline,
    year,
    image: art(i),
  }),
);

export default function ViscoseCarouselDemo() {
  return (
    <ViscoseCarousel
      items={ITEMS}
      className="h-dvh max-h-[900px] min-h-[560px] w-full"
    />
  );
}

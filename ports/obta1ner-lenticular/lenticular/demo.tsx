"use client";

import { Lenticular } from "@/components/ui/lenticular";

// Three original frames (sun, moon, star) as inline SVG, so the demo needs no
// image files.
const FRAMES = [
  `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="640" viewBox="0 0 480 640"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd36e"/><stop offset="1" stop-color="#ff6f61"/></linearGradient></defs><rect width="480" height="640" fill="url(#g)"/><line x1="390.0" y1="300.0" x2="445.0" y2="300.0" stroke="#fff7d6" stroke-width="22" stroke-linecap="round"/><line x1="369.9" y1="375.0" x2="417.5" y2="402.5" stroke="#fff7d6" stroke-width="22" stroke-linecap="round"/><line x1="315.0" y1="429.9" x2="342.5" y2="477.5" stroke="#fff7d6" stroke-width="22" stroke-linecap="round"/><line x1="240.0" y1="450.0" x2="240.0" y2="505.0" stroke="#fff7d6" stroke-width="22" stroke-linecap="round"/><line x1="165.0" y1="429.9" x2="137.5" y2="477.5" stroke="#fff7d6" stroke-width="22" stroke-linecap="round"/><line x1="110.1" y1="375.0" x2="62.5" y2="402.5" stroke="#fff7d6" stroke-width="22" stroke-linecap="round"/><line x1="90.0" y1="300.0" x2="35.0" y2="300.0" stroke="#fff7d6" stroke-width="22" stroke-linecap="round"/><line x1="110.1" y1="225.0" x2="62.5" y2="197.5" stroke="#fff7d6" stroke-width="22" stroke-linecap="round"/><line x1="165.0" y1="170.1" x2="137.5" y2="122.5" stroke="#fff7d6" stroke-width="22" stroke-linecap="round"/><line x1="240.0" y1="150.0" x2="240.0" y2="95.0" stroke="#fff7d6" stroke-width="22" stroke-linecap="round"/><line x1="315.0" y1="170.1" x2="342.5" y2="122.5" stroke="#fff7d6" stroke-width="22" stroke-linecap="round"/><line x1="369.9" y1="225.0" x2="417.5" y2="197.5" stroke="#fff7d6" stroke-width="22" stroke-linecap="round"/><circle cx="240" cy="300" r="120" fill="#fff7d6"/><rect x="40" y="560" width="400" height="28" rx="14" fill="#ffffff" opacity="0.55"/></svg>`,
  `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="640" viewBox="0 0 480 640"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6f7dff"/><stop offset="1" stop-color="#23255f"/></linearGradient></defs><rect width="480" height="640" fill="url(#g)"/><circle cx="240" cy="300" r="150" fill="#f4f1ff"/><circle cx="300" cy="250" r="140" fill="#4b52b8"/><rect x="40" y="560" width="400" height="28" rx="14" fill="#ffffff" opacity="0.35"/></svg>`,
  `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="640" viewBox="0 0 480 640"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a1f55"/><stop offset="1" stop-color="#0e0b24"/></linearGradient></defs><rect width="480" height="640" fill="url(#g)"/><polygon points="240.0,120.0 287.0,245.3 420.7,251.3 316.1,334.7 351.7,463.7 240.0,390.0 128.3,463.7 163.9,334.7 59.3,251.3 193.0,245.3" fill="#ffe27a" stroke="#fff6c8" stroke-width="12" stroke-linejoin="round"/><rect x="40" y="560" width="400" height="28" rx="14" fill="#ffffff" opacity="0.2"/></svg>`,
].map((svg) => `data:image/svg+xml,${encodeURIComponent(svg)}`);

export default function LenticularDemo() {
  return (
    <figure className="flex flex-col items-center gap-3">
      <Lenticular
        images={FRAMES}
        className="max-h-72 overflow-hidden rounded-xl"
        aria-label="A lenticular card that turns from a sun to a moon to a star"
      />
      <figcaption className="max-w-xs text-balance text-center text-muted-foreground text-xs">
        Move the pointer across the window, tilt your phone, or focus the card
        and use the arrow keys.
      </figcaption>
    </figure>
  );
}

"use client";

import { HoloSticker } from "@/components/ui/holo-sticker";

// Original artwork (a smiling star) as an inline SVG, so the demo needs no
// image files.
const ART = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><polygon points="256.0,36.0 320.3,100.8 411.6,100.4 411.2,191.7 476.0,256.0 411.2,320.3 411.6,411.6 320.3,411.2 256.0,476.0 191.7,411.2 100.4,411.6 100.8,320.3 36.0,256.0 100.8,191.7 100.4,100.4 191.7,100.8" fill="#ff5fa2" stroke="#ff5fa2" stroke-width="36" stroke-linejoin="round"/><circle cx="256" cy="256" r="128" fill="#ffd84d"/><circle cx="212" cy="232" r="18" fill="#2b1d3a"/><circle cx="300" cy="232" r="18" fill="#2b1d3a"/><path d="M196 284 Q256 344 316 284" fill="none" stroke="#2b1d3a" stroke-width="18" stroke-linecap="round"/><circle cx="180" cy="280" r="14" fill="#ff8fb8"/><circle cx="332" cy="280" r="14" fill="#ff8fb8"/></svg>`,
)}`;

export default function HoloStickerDemo() {
  return (
    <HoloSticker
      src={ART}
      alt="A smiling star sticker on holographic foil"
      className="size-64 max-w-full"
    />
  );
}

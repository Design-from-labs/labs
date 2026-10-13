"use client";

import * as React from "react";

import { ImageFx, type ImageFxPreset } from "@/components/ui/image-fx";

// Original pictures as inline SVG, so the demo needs no image files.
const svg = (body: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="560" viewBox="0 0 640 560">${body}</svg>`,
  )}`;

const IMAGES = [
  // Dusk over layered hills.
  svg(
    `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a2f6b"/><stop offset=".55" stop-color="#d9677b"/><stop offset="1" stop-color="#f6c48a"/></linearGradient></defs><rect width="640" height="560" fill="url(#s)"/><circle cx="420" cy="300" r="74" fill="#ffe2a8"/><path d="M0 360 Q160 290 320 350 T640 330 V560 H0Z" fill="#7a3f6d"/><path d="M0 420 Q200 360 380 420 T640 410 V560 H0Z" fill="#4b2a55"/><path d="M0 480 Q240 440 460 486 T640 470 V560 H0Z" fill="#26183a"/>`,
  ),
  // A tide pool of overlapping circles.
  svg(
    `<rect width="640" height="560" fill="#0f3d3e"/><circle cx="190" cy="210" r="150" fill="#1f7a72"/><circle cx="430" cy="330" r="190" fill="#2fa38f" fill-opacity=".85"/><circle cx="300" cy="120" r="80" fill="#f2d16b"/><circle cx="520" cy="130" r="46" fill="#f08a5d"/><circle cx="140" cy="440" r="96" fill="#b8e0d2" fill-opacity=".8"/>`,
  ),
  // Paper shapes on a warm desk.
  svg(
    `<rect width="640" height="560" fill="#efe4d2"/><rect x="70" y="80" width="250" height="300" rx="18" fill="#e4572e" transform="rotate(-8 195 230)"/><rect x="300" y="160" width="270" height="270" rx="135" fill="#29335c"/><path d="M180 470 L330 250 L480 470Z" fill="#f3a712"/><rect x="420" y="60" width="140" height="90" rx="12" fill="#669bbc"/>`,
  ),
];

const PRESETS: { value: ImageFxPreset; label: string }[] = [
  { value: "pixels-organic", label: "Organic" },
  { value: "pixels-mechanic", label: "Mechanic" },
  { value: "sweep-gradient", label: "Sweep" },
];

const button =
  "rounded-md border bg-background px-2.5 py-1 font-medium text-foreground text-xs shadow-xs outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring aria-pressed:bg-foreground aria-pressed:text-background";

export default function ImageFxDemo() {
  const [preset, setPreset] = React.useState<ImageFxPreset>("pixels-organic");
  const [paused, setPaused] = React.useState(false);
  return (
    <div className="flex w-full max-w-xs flex-col items-center gap-3">
      <ImageFx
        preset={preset}
        images={IMAGES}
        autoReveal
        revealDelayRange={[2, 4]}
        revealHoldMs={[750, 1250]}
        paused={paused}
        className="h-[280px] w-full max-w-[320px] rounded-2xl"
      />
      <div className="flex flex-wrap items-center justify-center gap-2">
        {PRESETS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            className={button}
            aria-pressed={preset === value}
            onClick={() => setPreset(value)}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          className={button}
          onClick={() => setPaused((p) => !p)}
        >
          {paused ? "Play" : "Pause"}
        </button>
      </div>
    </div>
  );
}

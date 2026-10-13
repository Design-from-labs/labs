"use client";

import * as React from "react";

import { HoloFoil, type HoloFoilPreset } from "@/components/ui/holo-foil";

const PRESETS: { value: HoloFoilPreset; label: string }[] = [
  { value: "holo", label: "Holo" },
  { value: "chrome", label: "Chrome" },
  { value: "black-cloth", label: "Black cloth" },
];

export default function HoloFoilDemo() {
  const [preset, setPreset] = React.useState<HoloFoilPreset>("holo");
  return (
    <div className="flex w-full max-w-xl flex-col gap-3">
      <HoloFoil
        preset={preset}
        className="rounded-lg"
        aria-label="A draped sheet of holographic foil"
      />
      <fieldset className="flex flex-wrap items-center gap-2">
        <legend className="sr-only">Finish</legend>
        {PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            aria-pressed={preset === p.value}
            onClick={() => setPreset(p.value)}
            className="rounded-md border bg-background px-2.5 py-1 font-medium text-foreground text-xs shadow-xs outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring aria-pressed:bg-foreground aria-pressed:text-background"
          >
            {p.label}
          </button>
        ))}
      </fieldset>
    </div>
  );
}

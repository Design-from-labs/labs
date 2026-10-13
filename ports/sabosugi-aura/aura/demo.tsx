"use client";

import * as React from "react";

import { Aura } from "@/components/ui/aura";

const button =
  "rounded-md border border-white/20 bg-black/60 px-2.5 py-1 font-medium text-white text-xs outline-none transition-colors hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-ring aria-pressed:bg-white aria-pressed:text-black";

const TINTS = [
  { name: "Spectrum", value: "#ffffff" },
  { name: "Ice", value: "#7fe3ff" },
  { name: "Ember", value: "#ff9a5a" },
] as const;

export default function AuraDemo() {
  const [playing, setPlaying] = React.useState(true);
  const [tint, setTint] = React.useState<string>(TINTS[0].value);
  return (
    <div className="flex w-full max-w-xl flex-col gap-3">
      <Aura
        playing={playing}
        tint={tint}
        className="rounded-lg"
        aria-label="A fan of glowing, winding light lines on a dark stage"
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={button}
          onClick={() => setPlaying((p) => !p)}
        >
          {playing ? "Pause" : "Play"}
        </button>
        {TINTS.map((t) => (
          <button
            key={t.value}
            type="button"
            className={button}
            aria-pressed={tint === t.value}
            onClick={() => setTint(t.value)}
          >
            {t.name}
          </button>
        ))}
      </div>
    </div>
  );
}

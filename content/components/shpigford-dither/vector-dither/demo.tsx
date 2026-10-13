"use client";

import * as React from "react";

import { VectorDither } from "@/components/ui/vector-dither";

const PRESETS = [
  { name: "bw", label: "B/W" },
  { name: "green", label: "Green" },
  { name: "neon", label: "Neon" },
  { name: "sepia", label: "Sepia" },
] as const;

const PATTERNS = [
  ["bayer2", "Bayer 2x2"],
  ["bayer4", "Bayer 4x4"],
  ["bayer8", "Bayer 8x8"],
  ["halftone", "Halftone"],
  ["lines", "Lines"],
  ["crosses", "Crosses"],
  ["dots", "Dots"],
  ["grid", "Grid"],
  ["scales", "Scales"],
] as const;

type Pattern = (typeof PATTERNS)[number][0];

export default function VectorDitherDemo() {
  const [palette, setPalette] =
    React.useState<(typeof PRESETS)[number]["name"]>("green");
  const [pattern, setPattern] = React.useState<Pattern>("bayer4");
  const id = React.useId();
  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      {/* A 320 px linear gradient at 45 degrees (upstream's default source,
          smaller so the page stays light): 40 x 40 cells. */}
      <VectorDither
        width={320}
        palette={palette}
        pattern={pattern}
        alt="A diagonal gradient dithered into square cells"
        className="overflow-hidden rounded-xl"
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <fieldset
          aria-label="Palette"
          className="m-0 flex min-w-0 flex-wrap gap-1.5 border-0 p-0"
        >
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              aria-pressed={palette === preset.name}
              onClick={() => setPalette(preset.name)}
              className="rounded-md border border-border bg-background px-2.5 py-1 text-foreground text-xs outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring aria-pressed:border-foreground aria-pressed:bg-foreground aria-pressed:text-background motion-reduce:transition-none"
            >
              {preset.label}
            </button>
          ))}
        </fieldset>
        <div className="flex items-center gap-2 text-xs">
          <label htmlFor={id} className="text-muted-foreground">
            Pattern
          </label>
          <select
            id={id}
            value={pattern}
            onChange={(event) => setPattern(event.target.value as Pattern)}
            className="rounded-md border border-border bg-background px-2 py-1 text-foreground text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {PATTERNS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

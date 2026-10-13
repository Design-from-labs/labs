"use client";

import * as React from "react";

import { IridescentRibbon } from "@/components/ui/iridescent-ribbon";

const button =
  "rounded-md border bg-background px-2.5 py-1 font-medium text-foreground text-xs shadow-xs outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring aria-pressed:bg-foreground aria-pressed:text-background";

export default function IridescentRibbonDemo() {
  const [playing, setPlaying] = React.useState(true);
  const [sequence, setSequence] = React.useState<"full" | "wave">("full");
  return (
    <div className="flex w-full max-w-xl flex-col gap-3">
      <IridescentRibbon
        playing={playing}
        sequence={sequence}
        className="rounded-lg"
        aria-label="An iridescent light ribbon flowing across a dark stage"
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={button}
          onClick={() => setPlaying((p) => !p)}
        >
          {playing ? "Pause" : "Play"}
        </button>
        <button
          type="button"
          className={button}
          aria-pressed={sequence === "full"}
          onClick={() => setSequence("full")}
        >
          Full sequence
        </button>
        <button
          type="button"
          className={button}
          aria-pressed={sequence === "wave"}
          onClick={() => setSequence("wave")}
        >
          Wave loop
        </button>
      </div>
    </div>
  );
}

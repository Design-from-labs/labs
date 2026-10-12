"use client";

import * as React from "react";

import { Ripple } from "@/components/ui/ripple";

export default function RippleDemo() {
  const [paused, setPaused] = React.useState(false);
  return (
    <div className="relative w-80 max-w-full">
      <Ripple paused={paused} aria-label="Ripples spreading from the center" />
      <button
        type="button"
        aria-pressed={paused}
        onClick={() => setPaused((p) => !p)}
        className="absolute end-2 bottom-2 rounded-md border bg-background px-2.5 py-1 font-medium text-foreground text-xs shadow-xs outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
      >
        {paused ? "Play" : "Pause"}
      </button>
    </div>
  );
}

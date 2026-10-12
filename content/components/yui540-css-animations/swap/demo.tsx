"use client";

import * as React from "react";

import { Swap } from "@/components/ui/swap";

export default function SwapDemo() {
  const [run, setRun] = React.useState(0);
  return (
    <div className="relative w-80 max-w-full">
      <Swap
        key={run}
        aria-label="A plus tile and a minus tile swapping places"
      />
      <button
        type="button"
        onClick={() => setRun((n) => n + 1)}
        className="absolute end-2 bottom-2 rounded-md border bg-background px-2.5 py-1 font-medium text-foreground text-xs shadow-xs outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
      >
        Replay
      </button>
    </div>
  );
}

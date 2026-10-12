"use client";

import * as React from "react";

import { ClatterShake } from "@/components/ui/clatter-shake";

export default function ClatterShakeDemo() {
  const [run, setRun] = React.useState(0);
  return (
    <div className="relative w-80 max-w-full">
      <ClatterShake key={run} aria-label="A hanging tag swinging to a stop" />
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

"use client";

import * as React from "react";

import { BorderBeam } from "@/components/ui/border-beam";

export default function BorderBeamDemo() {
  const [active, setActive] = React.useState(true);
  return (
    <div className="flex w-full max-w-md flex-col items-center gap-4">
      <BorderBeam
        size="md"
        colorVariant="colorful"
        theme="auto"
        active={active}
      >
        <div className="w-full min-w-72 rounded-2xl border bg-card p-4 text-card-foreground">
          <p className="font-medium text-sm">Generating previews</p>
          <ul className="mt-3 space-y-2 text-muted-foreground text-sm">
            <li>Rendering the gallery tiles</li>
            <li>Compressing the stills</li>
            <li>Writing the registry items</li>
          </ul>
        </div>
      </BorderBeam>
      <button
        type="button"
        aria-pressed={active}
        onClick={() => setActive((value) => !value)}
        className="rounded-md border bg-background px-2.5 py-1 font-medium text-foreground text-xs shadow-xs outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
      >
        {active ? "Stop the beam" : "Start the beam"}
      </button>
    </div>
  );
}

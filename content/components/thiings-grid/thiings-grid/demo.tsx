"use client";

import ThiingsGrid, { type ItemConfig } from "@/components/thiings-grid";

// Neutral sample cells: shapes from the shared tokens, no images or brands.
const shapes = ["rounded-full", "rounded-md", "rounded-none", "rounded-xl"];

function Cell({ gridIndex, isMoving }: ItemConfig) {
  return (
    <div
      className={`absolute inset-2 flex flex-col items-center justify-center gap-1.5 rounded-xl border bg-card text-card-foreground transition-shadow motion-reduce:transition-none ${
        isMoving ? "shadow-lg" : "shadow-sm"
      }`}
    >
      <span
        aria-hidden="true"
        className={`size-6 bg-muted-foreground/25 ${shapes[gridIndex % shapes.length]}`}
      />
      <span className="font-mono text-muted-foreground text-xs tabular-nums">
        {gridIndex}
      </span>
    </div>
  );
}

export default function ThiingsGridDemo() {
  return (
    <div className="relative h-96 w-full overflow-hidden rounded-lg border bg-background">
      <ThiingsGrid gridSize={112} label="Sample grid" renderItem={Cell} />
    </div>
  );
}

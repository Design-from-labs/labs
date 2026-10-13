"use client";

import * as React from "react";
import { Handwriting } from "@/components/ui/handwriting";

export default function HandwritingDemo() {
  const [run, setRun] = React.useState(0);
  // The strokes are drawn on a canvas in the browser. The gallery tile is
  // rendered on the server and never hydrated, so it shows the words as text.
  const [hydrated, setHydrated] = React.useState(false);
  React.useEffect(() => setHydrated(true), []);

  return (
    <div className="flex flex-col items-center gap-4">
      {hydrated ? (
        <Handwriting key={run} className="text-6xl text-foreground">
          Design From Labs
        </Handwriting>
      ) : (
        <p className="font-serif text-6xl text-foreground italic">
          Design From Labs
        </p>
      )}
      <button
        type="button"
        onClick={() => setRun((current) => current + 1)}
        className="inline-flex h-8 items-center rounded-full border border-border bg-background px-3 font-medium text-foreground text-xs transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Write it again
      </button>
    </div>
  );
}

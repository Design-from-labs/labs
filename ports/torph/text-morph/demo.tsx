"use client";

import * as React from "react";
import { TextMorph } from "@/components/ui/text-morph";

const WORDS = [
  "Design From Labs",
  "Design from scratch",
  "Labs",
  "Hello, world",
];
const TOTALS = ["1,204", "1,318", "9,847.50", "986"];

export default function TextMorphDemo() {
  const [index, setIndex] = React.useState(0);
  const root = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const id = window.setInterval(() => {
      // On the gallery wall the tile pauses offscreen, in a hidden tab, under
      // reduced motion and when the visitor pauses animations.
      if (root.current?.closest("[data-loop-paused]")) {
        return;
      }
      setIndex((current) => (current + 1) % WORDS.length);
    }, 1800);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div ref={root} className="flex flex-col items-center gap-6 text-center">
      <p className="font-medium text-4xl text-foreground tracking-tight">
        <TextMorph>{WORDS[index]}</TextMorph>
      </p>
      <p className="font-mono text-2xl text-muted-foreground tabular-nums">
        <TextMorph>{TOTALS[index]}</TextMorph>
      </p>
    </div>
  );
}

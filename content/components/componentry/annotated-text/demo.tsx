"use client";

import * as React from "react";
import { AnnotatedText } from "@/components/ui/annotated-text";

const MARKS = [
  "wavy",
  "underline",
  "doubleUnderline",
  "dottedUnderline",
  "line",
  "arrow",
  "highlight",
  "circle",
  "box",
  "bracket",
  "strikethrough",
  "crossOut",
] as const;

export default function AnnotatedTextDemo() {
  // Each new key remounts the marks, so they draw again.
  const [round, setRound] = React.useState(0);
  const root = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const id = window.setInterval(() => {
      // On the gallery wall the tile pauses offscreen, in a hidden tab, under
      // reduced motion and when the visitor pauses animations.
      if (root.current?.closest("[data-loop-paused]")) {
        return;
      }
      setRound((current) => current + 1);
    }, 4800);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      ref={root}
      className="flex min-h-full w-full items-center justify-center px-6 py-16"
    >
      {/* Columns sized to their words, so long names never overlap in a narrow
          tile; the wall scales the grid down instead. */}
      <div
        key={round}
        className="grid grid-cols-[repeat(2,max-content)] items-center justify-items-center gap-x-8 gap-y-7 text-base sm:gap-x-16 sm:gap-y-12 sm:text-xl"
      >
        {MARKS.map((variant, index) => (
          <AnnotatedText key={variant} variant={variant} delay={index * 0.08}>
            {variant}
          </AnnotatedText>
        ))}
      </div>
    </div>
  );
}

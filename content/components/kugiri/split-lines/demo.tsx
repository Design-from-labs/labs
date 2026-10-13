"use client";

import * as React from "react";
import { SplitLines, type TextSplit } from "@/components/ui/split-lines";

const REPLAY_MS = 4200;

/** Each line rises out of its mask, staggered by its index (Web Animations). */
function reveal(split: TextSplit) {
  for (const [index, line] of split.lines.entries()) {
    line.animate(
      [
        { transform: "translateY(100%)", opacity: 0 },
        { transform: "none", opacity: 1 },
      ],
      {
        duration: 900,
        delay: index * 110,
        easing: "cubic-bezier(0.23, 1, 0.32, 1)",
        fill: "backwards",
      },
    );
  }
}

export default function SplitLinesDemo() {
  const root = React.useRef<HTMLDivElement>(null);
  const splits = React.useRef<TextSplit[]>([]);

  const onSplit = React.useCallback(
    (split: TextSplit, { resplit }: { resplit: boolean }) => {
      splits.current = [
        ...splits.current.filter((s) => s.lines[0]?.isConnected),
        split,
      ];
      // A re-split after a resize shows the lines at rest; only the first
      // split reveals.
      if (!resplit && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
        reveal(split);
      }
    },
    [],
  );

  React.useEffect(() => {
    const id = window.setInterval(() => {
      // On the gallery wall the tile pauses offscreen, in a hidden tab, under
      // reduced motion and when the visitor pauses animations.
      if (
        root.current?.closest("[data-loop-paused]") ||
        matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        return;
      }
      for (const split of splits.current) {
        reveal(split);
      }
    }, REPLAY_MS);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div ref={root} className="flex max-w-md flex-col gap-5">
      <SplitLines
        lang="en"
        className="hyphens-auto font-serif text-4xl text-foreground leading-[1.1]"
        options={{ type: ["lines"], mask: { lines: "0.25em" } }}
        onSplit={onSplit}
      >
        Internationalization needs extraordinarily considerate line breaking.
      </SplitLines>
      <SplitLines
        lang="ja"
        className="text-lg text-muted-foreground leading-relaxed"
        options={{ type: ["lines"], mask: { lines: "0.25em" } }}
        onSplit={onSplit}
      >
        日本語の文章には単語の間に空白がありません。行はブラウザが改行した位置で分かれます。
      </SplitLines>
    </div>
  );
}

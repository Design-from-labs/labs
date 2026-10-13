"use client";

import * as React from "react";

import { Paper, type PaperHandle } from "@/components/ui/paper";

/**
 * On the specimen wall, hold the unrolling still while the wall marks the
 * tile paused (off screen, hidden tab, reduced motion, the visitor's pause).
 * The canvas itself already stops drawing off screen and in hidden tabs.
 */
function useWallPause(
  root: React.RefObject<HTMLDivElement | null>,
  paper: React.RefObject<PaperHandle | null>,
) {
  React.useEffect(() => {
    const el = root.current;
    if (!el?.closest("[data-specimen]")) {
      return;
    }
    const timer = window.setInterval(() => {
      const handle = paper.current;
      if (!handle) return;
      const paused = el.closest("[data-loop-paused]") !== null;
      if (paused && handle.playing) handle.pause();
      else if (!paused && !handle.playing) handle.play();
    }, 250);
    return () => window.clearInterval(timer);
  }, [root, paper]);
}

export default function PaperDemo() {
  const root = React.useRef<HTMLDivElement>(null);
  const paper = React.useRef<PaperHandle>(null);
  useWallPause(root, paper);
  return (
    <div ref={root} className="h-96 w-64 max-w-full">
      <Paper
        ref={paper}
        preset="receipt-unroll"
        content={{
          type: "receipt",
          store: "Labs Stationery",
          address: "12 Margin Lane",
          items: [
            { name: "Folded corner", price: 4 },
            { name: "Deckle edge", price: 6.5 },
            { name: "One crease", price: 1.25 },
          ],
          timestamp: "13.10.2026 09:30",
        }}
        autoplay
        interactive
      />
    </div>
  );
}

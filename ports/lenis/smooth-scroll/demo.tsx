"use client";

import * as React from "react";

import {
  type LenisRef,
  SmoothScroll,
  useSmoothScroll,
} from "@/components/ui/smooth-scroll";

const ROWS = [
  "Wheel input",
  "Interpolated",
  "Every frame",
  "Toward the target",
  "Native scroll",
  "Underneath",
  "Anchors work",
  "Keyboard works",
  "Sticky works",
  "Reduced motion",
  "Tracks one to one",
  "Back to the top",
];

/** A thin bar that follows the scroll progress Lenis reports. */
function Progress() {
  const [progress, setProgress] = React.useState(0);
  useSmoothScroll((lenis) => setProgress(lenis.progress || 0));
  return (
    <div className="sticky top-0 z-10 h-1 bg-border">
      <div
        className="h-full origin-[0_50%] bg-foreground rtl:origin-[100%_50%]"
        style={{ transform: `scaleX(${progress})` }}
      />
    </div>
  );
}

/**
 * On the specimen wall only, scroll the container down and back up through
 * Lenis, so the smoothing shows. Holds still while the wall marks the tile
 * paused (off screen, hidden tab, reduced motion, the visitor's pause).
 */
function useWallScroll(lenisRef: React.RefObject<LenisRef | null>) {
  React.useEffect(() => {
    let timer = 0;
    let down = true;
    const step = () => {
      const lenis = lenisRef.current?.lenis;
      const wrapper = lenisRef.current?.wrapper;
      if (!lenis || !wrapper) {
        timer = window.setTimeout(step, 250);
        return;
      }
      if (!wrapper.closest("[data-specimen]")) {
        return;
      }
      if (wrapper.closest("[data-loop-paused]")) {
        timer = window.setTimeout(step, 250);
        return;
      }
      lenis.scrollTo(down ? lenis.limit : 0, { duration: 2.4 });
      down = !down;
      timer = window.setTimeout(step, 3200);
    };
    timer = window.setTimeout(step, 600);
    return () => window.clearTimeout(timer);
  }, [lenisRef]);
}

export default function SmoothScrollDemo() {
  const lenisRef = React.useRef<LenisRef>(null);
  useWallScroll(lenisRef);
  return (
    <SmoothScroll
      ref={lenisRef}
      options={{ lerp: 0.08, wheelMultiplier: 1.4 }}
      className="h-80 w-72 max-w-full overflow-y-auto rounded-lg border bg-card text-card-foreground"
      tabIndex={0}
      role="region"
      aria-label="Smooth scrolling list"
    >
      <Progress />
      <ol className="flex flex-col gap-2 p-3">
        {ROWS.map((row, i) => (
          <li
            key={row}
            className="flex items-baseline gap-3 rounded-md bg-muted px-3 py-4"
          >
            <span className="font-mono text-muted-foreground text-xs tabular-nums">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="font-medium text-sm">{row}</span>
          </li>
        ))}
      </ol>
    </SmoothScroll>
  );
}

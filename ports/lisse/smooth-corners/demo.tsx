"use client";

import { useEffect, useId, useRef, useState } from "react";
import { SmoothCorners } from "@/components/ui/smooth-corners";

const PERIOD = 4000;

/**
 * Corner smoothing in motion: the card's corners sweep from a plain arc
 * (smoothing 0) to a full squircle (1) and back, over a dashed outline of the
 * arc. The bubble's corners are logical, so its tail flips in right-to-left.
 */
export default function SmoothCornersDemo() {
  const root = useRef<HTMLDivElement>(null);
  const id = useId();
  const [smoothing, setSmoothing] = useState(0.6);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!playing) {
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPlaying(false);
      return;
    }
    let frame = 0;
    let last = performance.now();
    let elapsed = 0;
    const tick = (now: number) => {
      const delta = Math.min(now - last, 100);
      last = now;
      // The specimen wall pauses loops offscreen, in hidden tabs and on
      // request (contract 4.3).
      if (!root.current?.closest("[data-loop-paused]")) {
        elapsed += delta;
        const phase = (elapsed % PERIOD) / PERIOD;
        const next =
          Math.round((0.5 - 0.5 * Math.cos(phase * 2 * Math.PI)) * 100) / 100;
        setSmoothing((current) => (current === next ? current : next));
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  return (
    <div ref={root} className="flex w-full flex-col items-center gap-5 p-6">
      <div className="flex items-end gap-6">
        <div className="relative size-36">
          <SmoothCorners
            corners={{ radius: 48, smoothing }}
            className="grid size-36 place-items-center bg-primary font-mono text-primary-foreground text-sm tabular-nums"
          >
            {smoothing.toFixed(2)}
          </SmoothCorners>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-[48px] border border-muted-foreground/60 border-dashed"
          />
        </div>
        <SmoothCorners
          corners={{
            topStart: 22,
            topEnd: 22,
            bottomEnd: 22,
            bottomStart: { radius: 4, smoothing: 0 },
          }}
          className="max-w-32 bg-muted px-4 py-3 text-muted-foreground text-sm"
        >
          {/* Latin text keeps its punctuation in a right-to-left page (P-036). */}
          <span dir="auto">Smooth, not round.</span>
        </SmoothCorners>
      </div>
      <div className="flex w-full max-w-72 items-center gap-3">
        <label htmlFor={id} className="text-muted-foreground text-sm">
          Smoothing
        </label>
        <input
          id={id}
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={smoothing}
          onChange={(event) => {
            setPlaying(false);
            setSmoothing(Number(event.target.value));
          }}
          className="min-w-0 flex-1 accent-primary"
        />
        <button
          type="button"
          aria-pressed={!playing}
          onClick={() => setPlaying((value) => !value)}
          className="rounded-md border px-2 py-1 text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:bg-muted"
        >
          Pause
        </button>
      </div>
    </div>
  );
}

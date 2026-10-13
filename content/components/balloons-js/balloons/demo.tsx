"use client";

import * as React from "react";
import { useBalloons } from "@/components/ui/balloons";

const button =
  "inline-flex h-9 items-center justify-center rounded-full px-4 font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** Every balloon of a release has left the stage by then. */
const VISIBLE_MS = 6000;

export default function BalloonsDemo() {
  const stage = React.useRef<HTMLDivElement>(null);
  const { release, releaseText } = useBalloons({ containerRef: stage });
  const last = React.useRef<{ controller: AbortController; at: number }[]>([]);

  // The gallery pauses this demo (offscreen, reduced motion, "Pause
  // animations"): a scripted press then starts nothing.
  const paused = () => stage.current?.closest("[data-loop-paused]") != null;

  // A balloons release keeps animating for about 30 s after its balloons
  // leave the stage; end the ones already out of sight before another.
  // (Text balloons end on their own once the last letter is gone.)
  const signal = () => {
    const now = performance.now();
    last.current = last.current.filter((run) => {
      if (now - run.at < VISIBLE_MS) return true;
      run.controller.abort();
      return false;
    });
    const controller = new AbortController();
    last.current.push({ controller, at: now });
    return controller.signal;
  };

  const onBalloons = () => {
    if (!paused()) release({ signal: signal() });
  };
  const onText = () => {
    if (paused()) return;
    const size = Math.min((stage.current?.clientWidth ?? 320) / 5, 96);
    releaseText([
      { text: "HOORAY", color: "#FA4616EE", fontSize: size },
      { text: "YOU DID IT", color: "#1754D8EE", fontSize: size * 0.7 },
    ]);
  };

  return (
    <div
      ref={stage}
      className="relative flex h-80 w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-xl border border-border bg-background px-4 text-center"
    >
      <p className="font-semibold text-foreground text-xl tracking-tight">
        Project shipped
      </p>
      <p className="max-w-64 text-muted-foreground text-sm">
        Celebrate a finished task with balloons that float up and away.
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={onBalloons}
          className={`${button} bg-primary text-primary-foreground hover:bg-primary/90`}
        >
          Release balloons
        </button>
        <button
          type="button"
          onClick={onText}
          className={`${button} border border-border bg-background text-foreground hover:bg-muted`}
        >
          Text balloons
        </button>
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import {
  RoughNotation,
  RoughNotationGroup,
} from "@/components/ui/rough-annotation";

const RED = "oklch(0.58 0.22 27)";
const BLUE = "oklch(0.56 0.18 255)";
const GREEN = "oklch(0.52 0.15 150)";

// How long the marks take to draw (six annotations, 800 ms each) plus a pause.
const REPLAY_EVERY = 8500;

export default function RoughAnnotationDemo() {
  const root = React.useRef<HTMLDivElement>(null);
  const [show, setShow] = React.useState(true);
  const timers = React.useRef<number[]>([]);

  const replay = React.useCallback(() => {
    for (const timer of timers.current) {
      window.clearTimeout(timer);
    }
    setShow(false);
    timers.current = [window.setTimeout(() => setShow(true), 400)];
  }, []);

  React.useEffect(() => {
    const pending = timers.current;
    // On the gallery wall the marks redraw on their own, and stop while the
    // tile is paused (offscreen, a hidden tab, reduced motion or the toggle).
    const onWall = root.current?.closest("[data-loop]");
    const interval = onWall
      ? window.setInterval(() => {
          if (!root.current?.closest("[data-loop-paused]")) {
            replay();
          }
        }, REPLAY_EVERY)
      : 0;
    return () => {
      window.clearInterval(interval);
      for (const timer of pending) {
        window.clearTimeout(timer);
      }
    };
  }, [replay]);

  return (
    <div
      ref={root}
      className="flex w-full max-w-lg flex-col gap-5 rounded-xl border border-border bg-card p-6 text-card-foreground"
    >
      <RoughNotationGroup show={show}>
        <p className="text-lg leading-10">
          Good notes are easy to{" "}
          <RoughNotation as="em" type="underline" strokeWidth={2} color={RED}>
            scan
          </RoughNotation>
          . Put a{" "}
          <RoughNotation as="strong" type="box" color={BLUE} padding={[4, 3]}>
            box
          </RoughNotation>{" "}
          around the deadline,{" "}
          <RoughNotation
            as="strong"
            type="circle"
            color={GREEN}
            padding={[6, 5]}
          >
            circle
          </RoughNotation>{" "}
          the owner,{" "}
          <RoughNotation as="mark" type="highlight">
            highlight
          </RoughNotation>{" "}
          what changed, and{" "}
          <RoughNotation as="del" type="strike-through" color={RED}>
            cross out
          </RoughNotation>{" "}
          what no longer holds.
        </p>
        <RoughNotation
          as="p"
          type="bracket"
          brackets="end"
          color={BLUE}
          padding={[2, 4]}
          className="me-4 text-muted-foreground text-sm leading-6"
        >
          Brackets suit a whole paragraph: the mark follows the block, not the
          words.
        </RoughNotation>
      </RoughNotationGroup>
      <button
        type="button"
        onClick={replay}
        className="self-start rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Replay
      </button>
    </div>
  );
}

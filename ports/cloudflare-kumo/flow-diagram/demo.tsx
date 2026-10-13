"use client";

import { useEffect, useRef } from "react";
import { Flow } from "@/components/ui/flow-diagram";

/** Pan speed of the wall loop, in pixels per second. */
const LOOP_SPEED = 48;
/** One sweep of the wall loop (there, then back), in milliseconds. */
const LOOP_SWEEP = 6000;

/**
 * On the specimen wall only, pans the canvas back and forth by sending it the
 * same wheel events a trackpad would, so the component's own panning runs.
 * It skips every frame while the tile is paused (offscreen, a hidden tab,
 * reduced motion or the "Pause animations" toggle); on the component page it
 * does nothing.
 */
function useWallPan(root: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const el = root.current;
    if (!el?.closest("[data-specimen]")) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let last = performance.now();
    let elapsed = 0;
    const tick = (now: number) => {
      const dt = Math.min(now - last, 64);
      last = now;
      if (!el.closest("[data-loop-paused]") && !reduce.matches) {
        elapsed += dt;
        const forward = elapsed % (2 * LOOP_SWEEP) < LOOP_SWEEP;
        const canvas = el.querySelector('[role="group"]');
        canvas?.dispatchEvent(
          new WheelEvent("wheel", {
            deltaX: ((forward ? 1 : -1) * LOOP_SPEED * dt) / 1000,
            cancelable: true,
          }),
        );
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [root]);
}

export default function FlowDiagramDemo() {
  const root = useRef<HTMLDivElement>(null);
  useWallPan(root);

  return (
    <div ref={root} className="flex w-full text-sm">
      <Flow
        aria-label="Request pipeline"
        padding={{ y: 24 }}
        className="rounded-lg border"
      >
        <Flow.Node>Request</Flow.Node>
        <Flow.Node>Authenticate</Flow.Node>
        <Flow.Parallel>
          <Flow.Node>Validate input</Flow.Node>
          <Flow.Node>Check rate limit</Flow.Node>
        </Flow.Parallel>
        <Flow.Node>Transform</Flow.Node>
        <Flow.Parallel>
          <Flow.Node>Write to database</Flow.Node>
          <Flow.Node>Update cache</Flow.Node>
          <Flow.Node disabled>Send notification</Flow.Node>
        </Flow.Parallel>
        <Flow.Node>Respond</Flow.Node>
        <Flow.Node>Log</Flow.Node>
      </Flow>
    </div>
  );
}

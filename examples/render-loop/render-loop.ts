"use client";

import * as React from "react";

import { useReducedMotion } from "@/hooks/use-reduced-motion";

/**
 * The drawing context a loop asks the canvas for. Three.js renderers take the
 * WebGL context this loop created (`new WebGLRenderer({ canvas, context })`),
 * so support is detected in one place.
 */
export type RenderLoopContext = "webgl2" | "webgl" | "2d";

/**
 * Where a loop stands. Components show their static fallback for every status
 * except "ready".
 * - "pending": the server render and the first client render, before setup.
 * - "ready": a frame is on the canvas; drawing continues while it is useful.
 * - "unsupported": the context could not be created or setup threw.
 * - "reduced-motion": the user prefers reduced motion, so nothing is drawn.
 * - "lost": the WebGL context was lost and has not been restored yet.
 */
export type RenderLoopStatus =
  | "pending"
  | "ready"
  | "unsupported"
  | "reduced-motion"
  | "lost";

export interface RenderLoopSize {
  /** The canvas box in CSS pixels. */
  width: number;
  height: number;
  /** The device pixel ratio in use, clamped to `maxDpr`. */
  dpr: number;
}

export interface RenderLoopFrame extends RenderLoopSize {
  /** Seconds the loop has been drawing; time spent paused is not counted. */
  time: number;
  /** Seconds since the previous frame, at most 0.1 (0 on the first frame). */
  delta: number;
}

export interface RenderLoopOptions<Handle> {
  /** The context to create. Failure to create it reports "unsupported". */
  context: RenderLoopContext;
  /** Attributes for `getContext` (alpha, antialias, preserveDrawingBuffer...). */
  contextAttributes?: WebGLContextAttributes | CanvasRenderingContext2DSettings;
  /** Upper bound for the device pixel ratio. Default 2. */
  maxDpr?: number;
  /**
   * Draw every animation frame (true, the default) or only after
   * `invalidate()` and after a resize (false, for still or input-driven
   * pictures).
   */
  continuous?: boolean;
  /**
   * Skip drawing when the user prefers reduced motion and report
   * "reduced-motion", so the component shows its static fallback. Default
   * true.
   */
  respectReducedMotion?: boolean;
  /** Create the drawing state. Throwing reports "unsupported". */
  setup: (canvas: HTMLCanvasElement, context: RenderingContext) => Handle;
  /**
   * Size the drawing buffer. The default sets `canvas.width` and
   * `canvas.height` to the CSS size times the clamped pixel ratio.
   */
  resize?: (handle: Handle, size: RenderLoopSize) => void;
  /** Draw one frame. */
  render: (handle: Handle, frame: RenderLoopFrame) => void;
  /** Release the drawing state (on unmount and before a context restore). */
  dispose?: (handle: Handle) => void;
}

export interface RenderLoop<Handle> {
  status: RenderLoopStatus;
  /** Ask for one more frame (needed when `continuous` is false). */
  invalidate: () => void;
  /** The value `setup` returned, while the loop is alive. */
  handle: React.RefObject<Handle | null>;
}

function createContext(
  canvas: HTMLCanvasElement,
  type: RenderLoopContext,
  attributes: RenderLoopOptions<unknown>["contextAttributes"],
): RenderingContext | null {
  try {
    if (type === "2d") {
      return canvas.getContext(
        "2d",
        attributes as CanvasRenderingContext2DSettings,
      );
    }
    return canvas.getContext(type, attributes as WebGLContextAttributes);
  } catch {
    return null;
  }
}

/** The device pixel ratio, clamped to `maxDpr` (default 2). */
export function clampDpr(maxDpr = 2): number {
  if (typeof window === "undefined") {
    return 1;
  }
  return Math.max(1, Math.min(window.devicePixelRatio || 1, maxDpr));
}

/**
 * Runs a canvas drawing loop with the lifecycle every WebGL (or 2D) effect
 * needs: one context, a device pixel ratio capped at `maxDpr`, a
 * ResizeObserver, no drawing while the canvas is off screen
 * (IntersectionObserver) or the tab is hidden, a reduced-motion gate, and
 * WebGL context loss and restore. Server rendering returns "pending" and
 * touches nothing.
 */
export function useRenderLoop<Handle>(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  options: RenderLoopOptions<Handle>,
): RenderLoop<Handle> {
  const reduceMotion = useReducedMotion();
  const [status, setStatus] = React.useState<RenderLoopStatus>("pending");
  const optionsRef = React.useRef(options);
  optionsRef.current = options;
  const handle = React.useRef<Handle | null>(null);
  const invalidateRef = React.useRef<() => void>(() => {});
  const invalidate = React.useCallback(() => invalidateRef.current(), []);

  const { context: contextType, maxDpr = 2 } = options;
  const gated = (options.respectReducedMotion ?? true) && reduceMotion;

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    // Read the media query here too: during hydration the hook still returns
    // the server value (false), and a WebGL setup (shader compiles, an
    // environment map) only to be thrown away a frame later is not free.
    const prefersReduced =
      (optionsRef.current.respectReducedMotion ?? true) &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (gated || prefersReduced) {
      setStatus("reduced-motion");
      return;
    }
    const context = createContext(
      canvas,
      contextType,
      optionsRef.current.contextAttributes,
    );
    if (!context) {
      setStatus("unsupported");
      return;
    }
    const isWebGL = contextType !== "2d";

    let current: Handle | null = null;
    let raf = 0;
    let onScreen = true;
    let pageVisible = !document.hidden;
    let lost = false;
    let dirty = true;
    let shown = false;
    let last = -1;
    let elapsed = 0;
    let size: RenderLoopSize = { width: 0, height: 0, dpr: clampDpr(maxDpr) };

    const create = () => {
      try {
        current = optionsRef.current.setup(canvas, context);
        handle.current = current;
        return true;
      } catch (error) {
        console.warn("render-loop: setup failed", error);
        current = null;
        handle.current = null;
        setStatus("unsupported");
        return false;
      }
    };
    const release = () => {
      if (current !== null) {
        try {
          optionsRef.current.dispose?.(current);
        } catch {
          // Disposing a lost context can throw; nothing is left to free.
        }
      }
      current = null;
      handle.current = null;
    };

    const applySize = () => {
      if (current === null) {
        return;
      }
      const resize = optionsRef.current.resize;
      if (resize) {
        resize(current, size);
      } else {
        const width = Math.round(size.width * size.dpr);
        const height = Math.round(size.height * size.dpr);
        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
        }
      }
    };
    const measure = () => {
      const next = {
        width: canvas.clientWidth,
        height: canvas.clientHeight,
        dpr: clampDpr(maxDpr),
      };
      if (
        next.width === size.width &&
        next.height === size.height &&
        next.dpr === size.dpr
      ) {
        return;
      }
      size = next;
      applySize();
      dirty = true;
      schedule();
    };

    const tick = (now: number) => {
      raf = 0;
      if (current === null || lost || !onScreen || !pageVisible) {
        return;
      }
      if (size.width === 0 || size.height === 0) {
        return;
      }
      const delta = last < 0 ? 0 : Math.min((now - last) / 1000, 0.1);
      last = now;
      elapsed += delta;
      dirty = false;
      optionsRef.current.render(current, { ...size, time: elapsed, delta });
      if (!shown) {
        shown = true;
        setStatus("ready");
      }
      if (optionsRef.current.continuous ?? true) {
        schedule();
      } else {
        // An on-demand frame: the next one starts a new delta.
        last = -1;
      }
    };
    function schedule() {
      if (raf !== 0 || current === null || lost || !onScreen || !pageVisible) {
        return;
      }
      if (!(optionsRef.current.continuous ?? true) && !dirty) {
        return;
      }
      raf = requestAnimationFrame(tick);
    }
    const pause = () => {
      if (raf !== 0) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
      // The next frame starts a new delta, so paused time is not counted.
      last = -1;
    };
    invalidateRef.current = () => {
      dirty = true;
      schedule();
    };

    const onVisibility = () => {
      pageVisible = !document.hidden;
      if (pageVisible) {
        schedule();
      } else {
        pause();
      }
    };
    const onLost = (event: Event) => {
      // Asking for a restore: without preventDefault the context stays lost.
      event.preventDefault();
      lost = true;
      pause();
      setStatus("lost");
    };
    const onRestored = () => {
      release();
      if (!create()) {
        return;
      }
      lost = false;
      shown = false;
      applySize();
      dirty = true;
      schedule();
    };

    if (!create()) {
      return;
    }
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(canvas);
    const intersectionObserver = new IntersectionObserver((entries) => {
      const entry = entries[entries.length - 1];
      onScreen = entry ? entry.isIntersecting : true;
      if (onScreen) {
        schedule();
      } else {
        pause();
      }
    });
    intersectionObserver.observe(canvas);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("resize", measure);
    if (isWebGL) {
      canvas.addEventListener("webglcontextlost", onLost);
      canvas.addEventListener("webglcontextrestored", onRestored);
    }
    measure();
    schedule();

    return () => {
      pause();
      invalidateRef.current = () => {};
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("resize", measure);
      if (isWebGL) {
        canvas.removeEventListener("webglcontextlost", onLost);
        canvas.removeEventListener("webglcontextrestored", onRestored);
      }
      release();
      setStatus("pending");
    };
  }, [canvasRef, contextType, maxDpr, gated]);

  return { status, invalidate, handle };
}

"use client";

import type { RefObject } from "react";
import { useCallback, useEffect, useRef } from "react";
import { type BalloonsOptions, balloons } from "./balloons-core";
import {
  BALLOONS_FONT_FALLBACK,
  balloonFontFace,
  type TextBalloonsOptions,
  textBalloons,
} from "./balloons-text";

// The React entry: upstream's imperative balloons() and textBalloons(), plus
// a hook that ties releases to a component (contained in an element when
// given one, and stopped when the component unmounts).

export {
  BALLOONS_FONT_FALLBACK,
  type BalloonsOptions,
  balloonFontFace,
  balloons,
  type TextBalloonsOptions,
  textBalloons,
};

/** One line of text balloons: its text, color and font size in pixels. */
export interface TextBalloon {
  text: string;
  color: string;
  fontSize: number;
}

export interface UseBalloonsOptions
  extends Omit<TextBalloonsOptions, "container" | "signal"> {
  /** Contain every release in this element instead of the viewport. */
  containerRef?: RefObject<HTMLElement | null>;
}

type CallOptions = Omit<TextBalloonsOptions, "container">;

/** A signal that aborts when either does. */
function anySignal(a: AbortSignal, b?: AbortSignal) {
  if (!b) return a;
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (a.aborted || b.aborted) abort();
  a.addEventListener("abort", abort, { once: true });
  b.addEventListener("abort", abort, { once: true });
  return controller.signal;
}

/**
 * `release()` and `releaseText(lines)` start the effects (each returns a
 * promise that resolves when it ends); `stop()` ends every release at once.
 * Releases still running when the component unmounts are stopped.
 */
export function useBalloons(options: UseBalloonsOptions = {}) {
  const controllers = useRef(new Set<AbortController>());
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const stop = useCallback(() => {
    for (const controller of controllers.current) controller.abort();
    controllers.current.clear();
  }, []);

  useEffect(() => stop, [stop]);

  const start = useCallback(
    (run: (options: TextBalloonsOptions) => Promise<void>, call?: CallOptions) => {
      const controller = new AbortController();
      controllers.current.add(controller);
      const { containerRef, ...shared } = optionsRef.current;
      return run({
        ...shared,
        ...call,
        container: containerRef?.current ?? null,
        signal: anySignal(controller.signal, call?.signal),
      }).finally(() => controllers.current.delete(controller));
    },
    [],
  );

  const release = useCallback(
    (call?: Omit<CallOptions, "fontFace">) => start(balloons, call),
    [start],
  );
  const releaseText = useCallback(
    (lines: TextBalloon[], call?: CallOptions) =>
      start((resolved) => textBalloons(lines, resolved), call),
    [start],
  );

  return { release, releaseText, stop };
}

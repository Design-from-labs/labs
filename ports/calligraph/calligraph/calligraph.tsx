"use client";

import type { Transition } from "motion/react";
import { MotionConfig, motion, useReducedMotion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { type Animation, animations } from "@/lib/calligraph-core";
import {
  NumberRenderer,
  SlotsRenderer,
  TextRenderer,
} from "./calligraph-renderers";

// ---- upstream: packages/calligraph/src/index.tsx ----
export type CalligraphProps = Omit<
  React.ComponentPropsWithoutRef<"span">,
  "children"
> & {
  children?: string | number;
  variant?: "text" | "number" | "slots";
  animation?: Animation;
  as?: React.ElementType;
  drift?: { x?: number; y?: number };
  trend?: 1 | -1 | 0;
  stagger?: number;
  initial?: boolean;
  onComplete?: () => void;
  autoSize?: boolean;
  /**
   * Labs: when the user prefers reduced motion, show each change at once
   * (no movement, no fade). Default true.
   */
  respectReducedMotion?: boolean;
};

// Labs: the transition used under reduced motion.
const INSTANT: Transition = { duration: 0 };

const useIsomorphicLayoutEffect =
  typeof useLayoutEffect === "undefined" ? useEffect : useLayoutEffect;

function AutoSizeWrapper({
  children,
  transition,
}: {
  children: React.ReactNode;
  transition: Transition;
}) {
  const elementRef = useRef<HTMLElement | null>(null);
  const [width, setWidth] = useState(0);

  useIsomorphicLayoutEffect(() => {
    const element = elementRef.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.ceil(entry.contentRect.width));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <motion.span
      animate={{ width: width > 0 ? width : "auto" }}
      transition={transition}
      style={{ display: "inline-flex" }}
    >
      <span ref={elementRef} style={{ display: "inline-flex" }}>
        {children}
      </span>
    </motion.span>
  );
}

/**
 * Calligraph — {@link https://calligraph.raphaelsalaja.com | Documentation}
 *
 * Fluid text and number transitions powered by Motion.
 *
 * @param props.variant - `"text"` for LCS character diffing, `"number"` for
 * rolling vertical digits, `"slots"` for slot-machine digit spin.
 * Defaults to `"text"`.
 *
 * @param props.animation - Spring preset: `"smooth"`, `"snappy"`, or
 * `"bouncy"`. Defaults to `"smooth"` for text, `"snappy"` for number.
 *
 * @param props.as - Wrapper element type. Defaults to `"span"`.
 *
 * @param props.drift - Maximum spread in pixels for entering/exiting
 * characters. `{ x, y }` — scaled by the fraction of characters that changed.
 * Only applies to `variant="text"`. Defaults to `{ x: 15, y: 0 }`.
 *
 * @param props.trend - Vertical animation direction for entering/exiting
 * characters. `1` = enter from below, `-1` = enter from above, `0` = no
 * vertical trend. Only applies to `variant="text"`. Defaults to `0`.
 *
 * @param props.stagger - Seconds of delay spread across characters.
 * Defaults to `0.02`.
 *
 * @param props.initial - When `true`, characters animate in on first mount.
 * Defaults to `false`.
 *
 * @param props.onComplete - Fired when the last character finishes animating.
 *
 * @param props.autoSize - When `true`, the wrapper animates its width to
 * match content. Defaults to `true`.
 *
 * @param props.respectReducedMotion - Labs: when `true`, a user who prefers
 * reduced motion sees each change at once. Defaults to `true`.
 */
export function Calligraph(props: CalligraphProps) {
  const {
    children,
    variant = "text",
    animation,
    as: Component = "span",
    drift: { x: driftX = 15, y: driftY = 0 } = {},
    trend = 0,
    stagger = 0.02,
    initial: animateInitial = false,
    onComplete,
    autoSize = true,
    respectReducedMotion = true,
    style,
    ...rest
  } = props;

  // Labs: reduced motion makes every transition instant (null on the server).
  const reducedMotion = useReducedMotion() === true && respectReducedMotion;

  const transition: Transition = reducedMotion
    ? INSTANT
    : animations[animation ?? (variant === "number" ? "snappy" : "default")];

  const rendererProps = {
    text: String(children ?? ""),
    transition,
    // Labs: no per-digit delay under reduced motion, so every glyph swaps at once.
    stagger: reducedMotion ? 0 : stagger,
    animateInitial,
    onComplete,
  };

  const content: React.ReactNode =
    variant === "number" ? (
      <NumberRenderer {...rendererProps} instant={reducedMotion} />
    ) : variant === "slots" ? (
      <SlotsRenderer {...rendererProps} />
    ) : (
      <TextRenderer
        {...rendererProps}
        driftX={driftX}
        driftY={driftY}
        trend={trend}
      />
    );

  // Labs: the value is kept once as visually hidden text (every glyph is
  // aria-hidden), `dir` keeps the glyphs in reading order inside a
  // right-to-left page (numbers are always left to right), and under reduced
  // motion MotionConfig also skips the per-glyph transitions that set their
  // own `delay`.
  const body = (
    <Component
      dir={variant === "text" ? "auto" : "ltr"}
      {...rest}
      style={{ display: "inline-flex", position: "relative", ...style }}
    >
      <span className="sr-only">{rendererProps.text}</span>
      {autoSize ? (
        <AutoSizeWrapper transition={transition}>{content}</AutoSizeWrapper>
      ) : (
        content
      )}
    </Component>
  );

  return reducedMotion ? (
    <MotionConfig reducedMotion="always">{body}</MotionConfig>
  ) : (
    body
  );
}

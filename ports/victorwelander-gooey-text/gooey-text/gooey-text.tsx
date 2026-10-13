"use client";

import * as React from "react";

import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

/*
 * Ported from Victor Welander's "Gooey Text Morphing"
 * (https://21st.dev/@victorwelander/components/gooey-text-morphing), saved
 * verbatim in this repository and pinned by the git tree hash of that
 * snapshot (sources.yaml).
 *
 * Two copies of the text cross-fade with a growing blur, and an SVG colour
 * matrix thresholds their alpha (alpha x 255 - 140), so the blurred edges
 * merge into one gooey shape instead of a soft dissolve.
 *
 * Changes from upstream (each one is listed in
 * docs/evidence/ports/gooey-text/fidelity.md):
 * - The loop is cancelled on unmount (upstream's keeps running, and under
 *   React StrictMode runs twice), pauses off screen, in a paused specimen
 *   (`data-loop-paused`) and with `paused`, and resumes where it stopped. It
 *   times frames with performance.now() instead of new Date().
 * - The words are compared by value, so an inline `texts` array does not
 *   restart the morph on every render.
 * - The first word is in the server render (upstream starts empty for
 *   `cooldownTime`).
 * - The filter id is unique per instance (upstream: "threshold").
 * - The morphing copies are aria-hidden; screen readers get every word once,
 *   in a visually hidden span (or `label`).
 * - Reduced motion: the words swap at the same rhythm with no blur or fade.
 */

export interface GooeyTextProps {
  /** The words or phrases to morph through, in order. */
  texts: string[];
  /** Seconds one morph takes. */
  morphTime?: number;
  /** Seconds a word holds before the next morph. */
  cooldownTime?: number;
  className?: string;
  /** Classes for both text copies (size, weight, colour). */
  textClassName?: string;
  /** What screen readers read instead of the moving words. Default: every word, comma separated. */
  label?: string;
  /** Stop the morph where it is. */
  paused?: boolean;
}

const SEPARATOR = "\u0000";

export function GooeyText({
  texts,
  morphTime = 1,
  cooldownTime = 0.25,
  className,
  textClassName,
  label,
  paused = false,
}: GooeyTextProps) {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const text1Ref = React.useRef<HTMLSpanElement>(null);
  const text2Ref = React.useRef<HTMLSpanElement>(null);
  const filterId = `gooey-text-threshold-${React.useId().replace(/[^\w-]/g, "")}`;
  const reducedMotion = useReducedMotion();
  const pausedRef = React.useRef(paused);
  React.useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  // The same words in a new array are the same words.
  const key = texts.join(SEPARATOR);
  const words = React.useMemo(() => key.split(SEPARATOR), [key]);

  React.useEffect(() => {
    let textIndex = words.length - 1;
    let time = performance.now();
    let morph = 0;
    let cooldown = cooldownTime;
    let frame = 0;
    let onScreen = true;

    const setMorph = (fraction: number) => {
      if (text1Ref.current && text2Ref.current) {
        if (reducedMotion) {
          // A plain swap at the end of the morph: no blur, no fade.
          text2Ref.current.style.filter = "";
          text1Ref.current.style.filter = "";
          text2Ref.current.style.opacity = fraction >= 1 ? "100%" : "0%";
          text1Ref.current.style.opacity = fraction >= 1 ? "0%" : "100%";
          return;
        }
        text2Ref.current.style.filter = `blur(${Math.min(8 / fraction - 8, 100)}px)`;
        text2Ref.current.style.opacity = `${fraction ** 0.4 * 100}%`;

        fraction = 1 - fraction;
        text1Ref.current.style.filter = `blur(${Math.min(8 / fraction - 8, 100)}px)`;
        text1Ref.current.style.opacity = `${fraction ** 0.4 * 100}%`;
      }
    };

    const doCooldown = () => {
      morph = 0;
      if (text1Ref.current && text2Ref.current) {
        text2Ref.current.style.filter = "";
        text2Ref.current.style.opacity = "100%";
        text1Ref.current.style.filter = "";
        text1Ref.current.style.opacity = "0%";
      }
    };

    const doMorph = () => {
      morph -= cooldown;
      cooldown = 0;
      let fraction = morph / morphTime;

      if (fraction > 1) {
        cooldown = cooldownTime;
        fraction = 1;
      }

      setMorph(fraction);
    };

    function animate() {
      frame = requestAnimationFrame(animate);
      const newTime = performance.now();
      if (
        !onScreen ||
        pausedRef.current ||
        rootRef.current?.closest("[data-loop-paused]")
      ) {
        // Paused: let the time pass without counting it.
        time = newTime;
        return;
      }
      const shouldIncrementIndex = cooldown > 0;
      const dt = (newTime - time) / 1000;
      time = newTime;

      cooldown -= dt;

      if (cooldown <= 0) {
        if (shouldIncrementIndex) {
          textIndex = (textIndex + 1) % words.length;
          if (text1Ref.current && text2Ref.current) {
            text1Ref.current.textContent = words[textIndex % words.length];
            text2Ref.current.textContent =
              words[(textIndex + 1) % words.length];
          }
        }
        doMorph();
      } else {
        doCooldown();
      }
    }

    const observer =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(([entry]) => {
            onScreen = entry?.isIntersecting ?? true;
          });
    if (rootRef.current) {
      observer?.observe(rootRef.current);
    }

    animate();

    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [words, morphTime, cooldownTime, reducedMotion]);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <svg className="absolute h-0 w-0" aria-hidden="true" focusable="false">
        <defs>
          <filter id={filterId}>
            <feColorMatrix
              in="SourceGraphic"
              type="matrix"
              values="1 0 0 0 0
                      0 1 0 0 0
                      0 0 1 0 0
                      0 0 0 255 -140"
            />
          </filter>
        </defs>
      </svg>

      <div
        aria-hidden="true"
        className="flex items-center justify-center"
        style={{ filter: `url(#${filterId})` }}
      >
        <span
          ref={text1Ref}
          className={cn(
            "absolute inline-block select-none text-center text-6xl md:text-[60pt]",
            "text-foreground",
            textClassName,
          )}
        />
        <span
          ref={text2Ref}
          className={cn(
            "absolute inline-block select-none text-center text-6xl md:text-[60pt]",
            "text-foreground",
            textClassName,
          )}
        >
          {words[0]}
        </span>
      </div>
      <span className="sr-only">{label ?? texts.join(", ")}</span>
    </div>
  );
}

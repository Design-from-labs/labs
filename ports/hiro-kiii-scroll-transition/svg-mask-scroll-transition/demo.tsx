"use client";

import * as React from "react";

import { type LenisRef, SmoothScroll } from "@/components/ui/smooth-scroll";
import {
  SvgMaskScrollTransition,
  type SvgMaskScrollTransitionPattern,
} from "@/components/ui/svg-mask-scroll-transition";

// Original art: three abstract landscapes as inline SVG, so the demo needs no
// image files.
function art(hue: number, sun: number) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="hsl(${hue} 60% 72%)"/><stop offset="1" stop-color="hsl(${(hue + 40) % 360} 55% 40%)"/></linearGradient></defs><rect width="160" height="100" fill="url(#s)"/><circle cx="${sun}" cy="34" r="14" fill="hsl(${(hue + 180) % 360} 80% 82%)"/><path d="M0 70 Q40 48 80 66 T160 58 V100 H0Z" fill="hsl(${(hue + 200) % 360} 35% 28%)"/><path d="M0 82 Q50 66 100 80 T160 76 V100 H0Z" fill="hsl(${(hue + 220) % 360} 40% 18%)"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const SLIDES = [
  {
    src: art(30, 112),
    alt: "",
    title: "First light",
    label: "Section one",
    description: "Blinds open from their centre lines, one after another.",
  },
  {
    src: art(200, 44),
    alt: "",
    title: "High noon",
    label: "Section two",
    description: "Each image is revealed through an SVG mask as you scroll.",
  },
  {
    src: art(300, 128),
    alt: "",
    title: "Night shift",
    label: "Section three",
    description: "The progress bar fills one segment per image.",
  },
];

const PATTERNS: { value: SvgMaskScrollTransitionPattern; label: string }[] = [
  { value: "horizontal-blinds", label: "Blinds" },
  { value: "random-grid", label: "Grid" },
  { value: "vertical-blinds", label: "Columns" },
  { value: "column-grid", label: "Cells" },
];

const ease = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * t);

/**
 * On the specimen wall only, scroll down through the whole effect and back up
 * through Lenis. Holds still while the wall marks the tile paused.
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
      lenis.scrollTo(down ? lenis.limit : 0, { duration: 8, easing: ease });
      down = !down;
      timer = window.setTimeout(step, 10500);
    };
    timer = window.setTimeout(step, 400);
    return () => window.clearTimeout(timer);
  }, [lenisRef]);
}

export default function SvgMaskScrollTransitionDemo() {
  const [pattern, setPattern] =
    React.useState<SvgMaskScrollTransitionPattern>("horizontal-blinds");
  const lenisRef = React.useRef<LenisRef>(null);
  const container = React.useMemo<React.RefObject<HTMLElement | null>>(
    () => ({
      get current() {
        return lenisRef.current?.wrapper ?? null;
      },
    }),
    [],
  );
  useWallScroll(lenisRef);
  return (
    <div className="flex w-full max-w-3xl flex-col gap-3">
      <fieldset className="flex flex-wrap gap-1 self-start rounded-lg border p-1 text-sm">
        <legend className="sr-only">Mask pattern</legend>
        {PATTERNS.map((p) => (
          <label
            key={p.value}
            className="cursor-pointer rounded-md px-3 py-1 text-muted-foreground has-checked:bg-muted has-checked:text-foreground has-focus-visible:ring-2 has-focus-visible:ring-ring"
          >
            <input
              type="radio"
              name="svg-mask-pattern"
              value={p.value}
              checked={pattern === p.value}
              onChange={() => setPattern(p.value)}
              className="sr-only"
            />
            {p.label}
          </label>
        ))}
      </fieldset>
      <SmoothScroll
        ref={lenisRef}
        options={{ lerp: 0.15 }}
        className="aspect-[16/10] w-full overflow-y-auto rounded-lg bg-black text-white [container-type:size]"
        tabIndex={0}
        role="region"
        aria-label="SVG mask scroll transition demo"
      >
        <div className="grid h-[100cqh] place-items-center p-6 text-center">
          <p className="text-sm uppercase tracking-[0.24em] opacity-60">
            Scroll down
          </p>
        </div>
        <SvgMaskScrollTransition
          key={pattern}
          pattern={pattern}
          container={container}
          slides={SLIDES}
        />
        <div className="h-[40cqh]" />
      </SmoothScroll>
    </div>
  );
}

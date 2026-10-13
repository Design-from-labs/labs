"use client";

import {
  animate,
  frameData,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
} from "motion/react";
import * as React from "react";

import { cn } from "@/lib/utils";

/*
 * Ported from Hiro-kiii/Scroll-Transition (js/script.js, script2.js,
 * script3.js and script4.js, with css/style.css) at commit 6bb67c598f76:
 * https://github.com/Hiro-kiii/Scroll-Transition.
 *
 * The upstream builds one GSAP timeline per page and scrubs it with
 * ScrollTrigger. Here each pattern's timeline is described as data and
 * evaluated at the scrubbed time with the same positions, durations and eases,
 * and the scrub itself is a Motion animation (ScrollTrigger's: expo.out over
 * `scrub` seconds, restarted from the current progress on every update).
 * docs/evidence/ports/svg-mask-scroll-transition/fidelity.md lists every
 * change.
 *
 * Copyright (c) 2009 - 2025 Codrops. MIT License; the full notice ends this
 * file.
 */

export type SvgMaskScrollTransitionPattern =
  | "horizontal-blinds"
  | "random-grid"
  | "vertical-blinds"
  | "column-grid";

export interface SvgMaskScrollTransitionSlide {
  /** The image, revealed through the mask (cropped to cover). */
  src: string;
  /** Describes the image; omit (or "") for a decorative one. */
  alt?: string;
  /** The large heading (upstream: "FIRST<br>IMAGE"). */
  title?: React.ReactNode;
  /** The small spaced line under it (upstream: "Section transition"). */
  label?: React.ReactNode;
  /** A short paragraph under the label. */
  description?: React.ReactNode;
}

export interface SvgMaskScrollTransitionProps
  extends Omit<React.ComponentProps<"section">, "children"> {
  /** One slide per image (three upstream), revealed in order. */
  slides: SvgMaskScrollTransitionSlide[];
  /** The mask: blinds opening from their centres, or grid cells fading in. */
  pattern?: SvgMaskScrollTransitionPattern;
  /**
   * The element that scrolls, when it is not the window: a scroll container
   * with `container-type: size`, so the stage follows its size.
   */
  container?: React.RefObject<HTMLElement | null>;
  /** Seed for the random cell orders of the grid patterns. Default 1. */
  seed?: number;
  /** Heading level of the slide titles. Default 2. */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
}

// ---- Eases (GSAP: power1 = quad, power2 = cubic, power3 = quart) ----

type Ease = (t: number) => number;
const linear: Ease = (t) => t;
const power1Out: Ease = (t) => 1 - (1 - t) ** 2;
const power2InOut: Ease = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
const power3Out: Ease = (t) => 1 - (1 - t) ** 4;
// GSAP 3.12's expo is not the textbook 1 - 2^(-10t): its ease-in is
// 2^(10(t - 1))·t + t^6·(1 - t), and the out is its mirror (measured in the
// upstream page: expo.out(0.5) = 0.9765625).
const expoIn: Ease = (t) => 2 ** (10 * (t - 1)) * t + t ** 6 * (1 - t);
const expoOut: Ease = (t) => 1 - expoIn(1 - t);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

/** Progress of a tween that starts at `start` and lasts `duration`. */
const at = (time: number, start: number, duration: number) =>
  clamp01((time - start) / duration);

/**
 * GSAP starts a tween fired from a scroll update at its last tick; a Motion
 * animation started inside a frame starts on that frame. Starting one frame
 * early keeps in-flight frames on the upstream's timing.
 */
const lastTick = () =>
  frameData.isProcessing ? Math.min(frameData.delta, 100) / 1000 : 0;

// ---- The patterns ----

interface TextTween {
  duration: number;
  ease: Ease;
}

interface Pattern {
  /** Mask shapes: blinds that open from their centres, or cells. */
  mask: "rows" | "columns" | "cells";
  /** ScrollTrigger scrub, in seconds. */
  scrub: number;
  /** One opening: each part's duration and ease, and the stagger. */
  open: { duration: number; ease: Ease; each: number };
  /** Text in and out (the sequence timelines). */
  textIn: TextTween;
  textOut: TextTween & { y: number };
  /** Timeline shape: "sequence" (scripts 1, 2, 4) or "crossfade" (script 3). */
  shape: "sequence" | "crossfade";
  /** Cell order: "shuffle" (script 2) or "columns" (script 4). */
  order?: "shuffle" | "columns";
}

const PATTERNS: Record<SvgMaskScrollTransitionPattern, Pattern> = {
  // js/script.js: 30 blinds, each a top and a bottom rect growing from its
  // centre line.
  "horizontal-blinds": {
    mask: "rows",
    scrub: 2.5,
    open: { duration: 0.5, ease: power3Out, each: 0.02 },
    textIn: { duration: 1.5, ease: expoOut },
    textOut: { duration: 1.2, ease: power2InOut, y: -30 },
    shape: "sequence",
  },
  // js/script2.js: a grid of cells fading in, in a random order.
  "random-grid": {
    mask: "cells",
    scrub: 2.5,
    open: { duration: 1, ease: power3Out, each: 0.02 },
    textIn: { duration: 2.6, ease: expoOut },
    textOut: { duration: 2, ease: power2InOut, y: 0 },
    shape: "sequence",
    order: "shuffle",
  },
  // js/script3.js: 12 vertical blinds; the first image starts open and each
  // text crossfades into the next.
  "vertical-blinds": {
    mask: "columns",
    scrub: 2,
    open: { duration: 0.5, ease: linear, each: 0.02 },
    textIn: { duration: 0.8, ease: power1Out },
    textOut: { duration: 0.8, ease: power1Out, y: -40 },
    shape: "crossfade",
  },
  // js/script4.js: the grid opens column by column, left to right, each
  // column in a random order.
  "column-grid": {
    mask: "cells",
    scrub: 2.5,
    open: { duration: 1, ease: power3Out, each: 0.02 },
    textIn: { duration: 2.2, ease: expoOut },
    textOut: { duration: 1.6, ease: power2InOut, y: 0 },
    shape: "sequence",
    order: "columns",
  },
};

const ROW_BLINDS = 30;
const COLUMN_BLINDS = 12;

/** getGridCols: by the viewport's width. */
const gridCols = (width: number) =>
  width <= 599 ? 6 : width <= 1024 ? 10 : 14;

/** A small seeded generator (mulberry32) for the cell orders. */
function random(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** gsap.utils.shuffle, as GSAP 3.12 writes it, on a seeded generator. */
const shuffle = <T,>(items: T[], next: () => number) =>
  items.sort(() => 0.5 - next());

// ---- Geometry (createBlinds, updateLayout) ----

interface Part {
  /** Closed and open attributes; the mask animates between them. */
  from: Record<string, number>;
  to: Record<string, number>;
}

interface LayerGeometry {
  parts: Part[];
  /** Index into `parts` for each step of the opening, in order. */
  order: number[];
}

interface Geometry {
  vbWidth: number;
  vbHeight: number;
  layers: LayerGeometry[];
}

function buildGeometry(
  pattern: Pattern,
  width: number,
  height: number,
  count: number,
  seed: number,
): Geometry {
  const next = random(seed);
  // Script 3 keeps the height at 100 and scales the width; the others keep
  // the width at 100.
  const vbWidth = pattern.mask === "columns" ? (width / height) * 100 : 100;
  const vbHeight = pattern.mask === "columns" ? 100 : (height / width) * 100;
  const layers: LayerGeometry[] = [];
  for (let layer = 0; layer < count; layer++) {
    const parts: Part[] = [];
    if (pattern.mask === "rows") {
      const h = vbHeight / ROW_BLINDS;
      let currentY = 0;
      for (let i = 0; i < ROW_BLINDS; i++) {
        const y = vbHeight - (currentY + h / 2);
        const half = h / 2;
        parts.push({
          from: { x: 0, y, width: 100, height: 0 },
          to: { x: 0, y: y - half, width: 100, height: half + 0.01 },
        });
        parts.push({
          from: { x: 0, y, width: 100, height: 0 },
          to: { x: 0, y, width: 100, height: half + 0.01 },
        });
        currentY += h;
      }
    } else if (pattern.mask === "columns") {
      const w = vbWidth / COLUMN_BLINDS;
      const first = layer === 0;
      let currentX = 0;
      for (let i = 0; i < COLUMN_BLINDS; i++) {
        const x = currentX + w / 2;
        const half = w / 2;
        // The first layer starts open (w / 2 + 0.1); the others start closed.
        const left = first
          ? { x: x - half, y: 0, width: half + 0.1, height: 100 }
          : { x, y: 0, width: 0, height: 100 };
        const right = first
          ? { x, y: 0, width: half + 0.1, height: 100 }
          : { x, y: 0, width: 0, height: 100 };
        parts.push({
          from: left,
          to: first
            ? left
            : { x: x - half, y: 0, width: half + 0.05, height: 100 },
        });
        parts.push({
          from: right,
          to: first ? right : { x, y: 0, width: half + 0.05, height: 100 },
        });
        currentX += w;
      }
    } else {
      const cols = gridCols(width);
      const rows = Math.round(cols * (vbHeight / vbWidth));
      const cellW = vbWidth / cols;
      const cellH = vbHeight / rows;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const cell = {
            x: x * cellW,
            y: y * cellH,
            width: cellW,
            height: cellH,
          };
          parts.push({
            from: { ...cell, opacity: 0 },
            to: { ...cell, opacity: 1 },
          });
        }
      }
      const indices = parts.map((_, i) => i);
      if (pattern.order === "columns") {
        const ordered: number[] = [];
        for (let x = 0; x < cols; x++) {
          const column: number[] = [];
          for (let y = 0; y < rows; y++) {
            column.push(y * cols + x);
          }
          ordered.push(...shuffle(column, next));
        }
        layers.push({ parts, order: ordered });
        continue;
      }
      layers.push({ parts, order: shuffle(indices, next) });
      continue;
    }
    layers.push({ parts, order: parts.map((_, i) => i) });
  }
  return { vbWidth, vbHeight, layers };
}

// ---- The timeline (buildMasterTimeline) ----

interface Timeline {
  duration: number;
  /** When each layer's opening starts (-1: it starts open). */
  open: number[];
  /** Each text's in and out tweens. */
  texts: { in: number; out: number }[];
}

function buildTimeline(
  pattern: Pattern,
  geometry: Geometry,
  count: number,
): Timeline {
  const openLength = (layer: number) =>
    pattern.open.duration +
    (geometry.layers[layer].order.length - 1) * pattern.open.each;
  const open: number[] = [];
  const texts: { in: number; out: number }[] = [];
  let end = 0;
  if (pattern.shape === "sequence") {
    for (let i = 0; i < count; i++) {
      // master.add(openBlinds); textIn at "-=0.3"; textOut at "+=0.8".
      open.push(end);
      end += openLength(i);
      const textIn = end - 0.3;
      end = Math.max(end, textIn + pattern.textIn.duration);
      const textOut = end + 0.8;
      end = textOut + pattern.textOut.duration;
      texts.push({ in: textIn, out: textOut });
    }
  } else {
    // The first layer is open and its text shown; for each next layer the
    // previous text goes out at ">", the layer opens at "-=0.3", its text
    // comes in at "-=0.5", then a one-second hold.
    open.push(-1);
    texts.push({ in: -1, out: Number.POSITIVE_INFINITY });
    let last = 0;
    for (let i = 1; i < count; i++) {
      texts[i - 1].out = last;
      end = last + pattern.textOut.duration;
      const opening = end - 0.3;
      open.push(opening);
      end = Math.max(end, opening + openLength(i));
      const textIn = end - 0.5;
      texts.push({ in: textIn, out: Number.POSITIVE_INFINITY });
      end = Math.max(end, textIn + pattern.textIn.duration);
      end += 1;
      last = end;
    }
  }
  return { duration: end, open, texts };
}

// ---- Styles (css/style.css, the stage, line for line) ----

// Sizes were rem against `html { font-size: 11px }`, vw and vh; here the rem
// is --svg-mask-scroll-transition-rem (11px), vw is the component's width
// (cqw) and vh the nearest scroll container that is a size container, else
// the viewport (cqh).
const STYLES = `
[data-slot="svg-mask-scroll-transition"] {
  --svg-mask-scroll-transition-rem: 11px;
  container-type: inline-size;
  position: relative;
  height: 500cqh;
  box-sizing: border-box;
  background-color: var(--svg-mask-scroll-transition-surface, #000);
  color: var(--svg-mask-scroll-transition-foreground, #fff);
  font-family: var(--svg-mask-scroll-transition-font, "Playfair Display", "Shippori Mincho", serif);
  font-size: var(--svg-mask-scroll-transition-rem);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
[data-slot="svg-mask-scroll-transition"] * {
  box-sizing: border-box;
}
[data-slot="svg-mask-scroll-transition-layers"] {
  position: sticky;
  top: 0;
  width: 100%;
  height: 100cqh;
  overflow: hidden;
}
[data-slot="svg-mask-scroll-transition-layer"] {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
[data-slot="svg-mask-scroll-transition-layer"] image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: brightness(0.8);
}
[data-slot="svg-mask-scroll-transition-texts"] {
  padding: 3cqw;
}
[data-slot="svg-mask-scroll-transition-text"] {
  position: absolute;
  width: 100%;
  color: inherit;
  text-transform: uppercase;
  clip-path: inset(100% 0 0 0);
  transform: translateY(40px);
}
[data-slot="svg-mask-scroll-transition-text"] > * {
  margin: 0;
  padding: 0;
  font: inherit;
}
[data-slot="svg-mask-scroll-transition-title"] {
  margin-top: 10cqh;
  font-size: clamp(calc(4.8 * var(--svg-mask-scroll-transition-rem)), 6.8cqw, calc(13.6 * var(--svg-mask-scroll-transition-rem)));
  letter-spacing: -0.025em;
  line-height: 0.85;
}
[data-slot="svg-mask-scroll-transition-label"] {
  margin-top: 6cqw;
  font-size: clamp(calc(1.4 * var(--svg-mask-scroll-transition-rem)), 1.067cqw, calc(1.8 * var(--svg-mask-scroll-transition-rem)));
  letter-spacing: 0.24em;
}
[data-slot="svg-mask-scroll-transition-description"] {
  display: block;
  font-size: clamp(calc(1.1 * var(--svg-mask-scroll-transition-rem)), 0.8cqw, calc(1.2 * var(--svg-mask-scroll-transition-rem)));
  width: 20%;
  margin-top: 30px;
  line-height: 1.8;
  letter-spacing: normal;
}
[data-slot="svg-mask-scroll-transition-progress"] {
  position: absolute;
  bottom: 0;
  width: 100%;
  padding: calc(4 * var(--svg-mask-scroll-transition-rem));
  display: flex;
  gap: var(--svg-mask-scroll-transition-rem);
  z-index: 20;
}
[data-slot="svg-mask-scroll-transition-segment"] {
  flex: 1;
  height: 2px;
  background: var(--svg-mask-scroll-transition-track, rgba(255, 255, 255, 0.2));
  overflow: hidden;
  position: relative;
}
[data-slot="svg-mask-scroll-transition-fill"] {
  position: absolute;
  top: 0;
  inset-inline-start: 0;
  width: 0%;
  height: 100%;
  background: currentColor;
}
@container (max-width: 1024px) {
  [data-slot="svg-mask-scroll-transition-description"] {
    width: 35%;
  }
}
@container (max-width: 599px) {
  [data-slot="svg-mask-scroll-transition-description"] {
    width: 50%;
  }
}
[data-slot="svg-mask-scroll-transition"][data-reduced-motion] {
  height: auto;
}
[data-slot="svg-mask-scroll-transition"][data-reduced-motion] [data-slot="svg-mask-scroll-transition-panel"] {
  position: relative;
  height: 100cqh;
  overflow: hidden;
}
[data-slot="svg-mask-scroll-transition-image"] {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: brightness(0.8);
}
[data-slot="svg-mask-scroll-transition"][data-reduced-motion] [data-slot="svg-mask-scroll-transition-text"] {
  top: 3cqw;
  inset-inline-start: 3cqw;
  clip-path: none;
  transform: none;
}
@media (prefers-contrast: more) {
  [data-slot="svg-mask-scroll-transition-layer"] image {
    filter: brightness(0.55);
  }
  [data-slot="svg-mask-scroll-transition-segment"] {
    background: rgba(255, 255, 255, 0.5);
  }
}
`;

const DEFAULT_SIZE = { width: 1280, height: 800 };

function SlideText({
  slide,
  heading,
  innerRef,
}: {
  slide: SvgMaskScrollTransitionSlide;
  heading: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  innerRef?: (el: HTMLDivElement | null) => void;
}) {
  const Heading = heading;
  return (
    <div ref={innerRef} data-slot="svg-mask-scroll-transition-text">
      {slide.title ? (
        <Heading data-slot="svg-mask-scroll-transition-title">
          {slide.title}
        </Heading>
      ) : null}
      {slide.label ? (
        <p data-slot="svg-mask-scroll-transition-label">{slide.label}</p>
      ) : null}
      {slide.description ? (
        <p data-slot="svg-mask-scroll-transition-description">
          {slide.description}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Full-screen images that replace each other through SVG masks as you scroll:
 * horizontal or vertical blinds opening from their centres, or a grid of
 * cells, with each image's text sliding in and out and a progress bar.
 * Scroll it with the page or a scroll container (`container`).
 */
export function SvgMaskScrollTransition({
  slides,
  pattern: patternName = "horizontal-blinds",
  container,
  seed = 1,
  headingLevel = 2,
  className,
  ...props
}: SvgMaskScrollTransitionProps) {
  const reduceMotion = useReducedMotion() ?? false;
  const id = React.useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const pattern = PATTERNS[patternName];
  const count = slides.length;
  const heading = `h${headingLevel}` as const;

  const stage = React.useRef<HTMLElement>(null);
  const layersRef = React.useRef<HTMLDivElement>(null);
  const partRefs = React.useRef<(SVGRectElement | null)[][]>([]);
  const textRefs = React.useRef<(HTMLDivElement | null)[]>([]);
  const fillRefs = React.useRef<(HTMLDivElement | null)[]>([]);
  const range = React.useRef({ start: 0, length: 1 });

  const [size, setSize] = React.useState(DEFAULT_SIZE);
  const geometry = React.useMemo(
    () => buildGeometry(pattern, size.width, size.height, count, seed),
    [pattern, size, count, seed],
  );
  const timeline = React.useMemo(
    () => buildTimeline(pattern, geometry, count),
    [pattern, geometry, count],
  );

  const { scrollY } = useScroll(container ? { container } : undefined);
  // The scrubbed progress (catching up), and the progress bar's (raw).
  const progress = useMotionValue(0);
  const target = React.useRef(-1);

  /** Paints the timeline at a progress (0 to 1). */
  const paint = React.useCallback(
    (p: number) => {
      const time = p * timeline.duration;
      geometry.layers.forEach((layer, l) => {
        const rects = partRefs.current[l];
        const start = timeline.open[l];
        if (!rects || start < 0) {
          return;
        }
        layer.order.forEach((index, step) => {
          const rect = rects[index];
          const part = layer.parts[index];
          if (!rect || !part) {
            return;
          }
          const e = pattern.open.ease(
            at(time, start + step * pattern.open.each, pattern.open.duration),
          );
          for (const key of Object.keys(part.to)) {
            const from = part.from[key];
            const to = part.to[key];
            if (from !== to) {
              rect.setAttribute(key, String(from + (to - from) * e));
            }
          }
        });
      });
      timeline.texts.forEach((text, i) => {
        const el = textRefs.current[i];
        if (!el) {
          return;
        }
        let top = 100;
        let bottom = 0;
        let y = 40;
        let opacity = 1;
        let moving = false;
        if (pattern.shape === "sequence") {
          const inP = at(time, text.in, pattern.textIn.duration);
          const outP = at(time, text.out, pattern.textOut.duration);
          const eIn = pattern.textIn.ease(inP);
          const eOut = pattern.textOut.ease(outP);
          top = 100 * (1 - eIn);
          y = 40 * (1 - eIn) + pattern.textOut.y * eOut;
          bottom = 100 * eOut;
          moving = (inP > 0 && inP < 1) || (outP > 0 && outP < 1);
        } else {
          // Every text starts hidden below (inset bottom 100%, y 40,
          // opacity 0) except the first.
          const inP =
            text.in < 0 ? 1 : at(time, text.in, pattern.textIn.duration);
          const outP = at(time, text.out, pattern.textOut.duration);
          const eIn = pattern.textIn.ease(inP);
          const eOut = pattern.textOut.ease(outP);
          top = 0;
          bottom = 100 * (1 - eIn) + 100 * eOut;
          y = 40 * (1 - eIn) + pattern.textOut.y * eOut;
          opacity = eIn * (1 - eOut);
          moving = (inP > 0 && inP < 1) || (outP > 0 && outP < 1);
        }
        el.style.clipPath = `inset(${top}% 0% ${Math.min(bottom, 100)}% 0%)`;
        // GSAP's force3D "auto": 3D while a tween is running.
        el.style.transform = moving
          ? `translate3d(0px, ${y}px, 0px)`
          : `translate(0px, ${y}px)`;
        el.style.opacity = String(opacity);
      });
    },
    [geometry, timeline, pattern],
  );

  /** The progress bar follows the raw scroll progress. */
  const paintBar = React.useCallback(
    (p: number) => {
      fillRefs.current.forEach((fill, i) => {
        if (fill) {
          fill.style.width = `${clamp01((p - i / count) * count) * 100}%`;
        }
      });
    },
    [count],
  );

  const measure = React.useCallback(() => {
    const el = stage.current;
    if (!el) {
      return;
    }
    const scroller = container?.current ?? null;
    const width = scroller ? scroller.clientWidth : window.innerWidth;
    const height = scroller ? scroller.clientHeight : window.innerHeight;
    const scrollTop = scroller ? scroller.scrollTop : window.scrollY;
    const originTop = scroller ? scroller.getBoundingClientRect().top : 0;
    const top = el.getBoundingClientRect().top - originTop + scrollTop;
    // "top top" to "bottom bottom".
    range.current = { start: top, length: el.offsetHeight - height };
    setSize((s) =>
      s.width === width && s.height === height ? s : { width, height },
    );
  }, [container]);

  const onScroll = React.useCallback(
    (scroll: number, immediate = false) => {
      const r = range.current;
      const p = clamp01((scroll - r.start) / Math.max(1, r.length));
      paintBar(p);
      if (p === target.current) {
        return;
      }
      target.current = p;
      if (immediate) {
        progress.jump(p);
        return;
      }
      animate(progress, p, {
        duration: pattern.scrub,
        ease: expoOut,
        delay: -lastTick(),
      });
    },
    [paintBar, progress, pattern.scrub],
  );

  React.useLayoutEffect(() => {
    if (reduceMotion) {
      return;
    }
    let observed: Element | null = null;
    const update = () => {
      measure();
      const scroller = container?.current ?? null;
      if (scroller && scroller !== observed) {
        observer.observe(scroller);
        observed = scroller;
      }
    };
    const observer = new ResizeObserver(update);
    if (stage.current) {
      observer.observe(stage.current);
    }
    update();
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [measure, container, reduceMotion]);

  // A new layout (or pattern): repaint where the scroll is, without the scrub.
  React.useLayoutEffect(() => {
    if (reduceMotion) {
      return;
    }
    target.current = -1;
    const scroller = container?.current ?? null;
    onScroll(scroller ? scroller.scrollTop : window.scrollY, true);
    paint(progress.get());
  }, [reduceMotion, onScroll, paint, progress, container]);

  useMotionValueEvent(scrollY, "change", (y) => onScroll(y));
  useMotionValueEvent(progress, "change", paint);

  const viewBox = `0 0 ${geometry.vbWidth} ${geometry.vbHeight}`;

  if (reduceMotion) {
    // No scroll-driven motion: each image in full, with its text, one after
    // the other.
    return (
      <section
        data-slot="svg-mask-scroll-transition"
        data-reduced-motion=""
        className={cn(className)}
        {...props}
      >
        <style
          href="designfrom-svg-mask-scroll-transition"
          precedence="default"
        >
          {STYLES}
        </style>
        {slides.map((slide, i) => (
          <div
            key={`${slide.src}-${i}`}
            data-slot="svg-mask-scroll-transition-panel"
          >
            <img
              data-slot="svg-mask-scroll-transition-image"
              src={slide.src}
              alt={slide.alt ?? ""}
            />
            <SlideText slide={slide} heading={heading} />
          </div>
        ))}
      </section>
    );
  }

  return (
    <section
      ref={stage}
      data-slot="svg-mask-scroll-transition"
      data-pattern={patternName}
      className={cn(className)}
      {...props}
    >
      <style href="designfrom-svg-mask-scroll-transition" precedence="default">
        {STYLES}
      </style>
      <div ref={layersRef} data-slot="svg-mask-scroll-transition-layers">
        {slides.map((slide, l) => {
          const layer = geometry.layers[l];
          const maskId = `${id}-mask-${l}`;
          return (
            <svg
              key={`${slide.src}-${l}`}
              data-slot="svg-mask-scroll-transition-layer"
              viewBox={viewBox}
              preserveAspectRatio="none"
              role={slide.alt ? "img" : undefined}
              aria-label={slide.alt || undefined}
              aria-hidden={slide.alt ? undefined : true}
            >
              <defs>
                <mask id={maskId} maskUnits="userSpaceOnUse">
                  <rect
                    x="0"
                    y="0"
                    width={geometry.vbWidth}
                    height={geometry.vbHeight}
                    fill="black"
                  />
                  <g>
                    {layer?.parts.map((part, p) => (
                      <rect
                        key={p}
                        ref={(el) => {
                          partRefs.current[l] ??= [];
                          partRefs.current[l][p] = el;
                        }}
                        x={part.from.x}
                        y={part.from.y}
                        width={part.from.width}
                        height={part.from.height}
                        opacity={part.from.opacity}
                        fill="white"
                        shapeRendering="crispEdges"
                      />
                    ))}
                  </g>
                </mask>
              </defs>
              <image
                href={slide.src}
                x="0"
                y="0"
                width={geometry.vbWidth}
                height={geometry.vbHeight}
                preserveAspectRatio="xMidYMid slice"
                mask={`url(#${maskId})`}
              />
            </svg>
          );
        })}
        <div data-slot="svg-mask-scroll-transition-progress" aria-hidden="true">
          {slides.map((slide, i) => (
            <div
              key={`${slide.src}-${i}`}
              data-slot="svg-mask-scroll-transition-segment"
            >
              <div
                ref={(el) => {
                  fillRefs.current[i] = el;
                }}
                data-slot="svg-mask-scroll-transition-fill"
              />
            </div>
          ))}
        </div>
        <div data-slot="svg-mask-scroll-transition-texts">
          {slides.map((slide, i) => (
            <SlideText
              key={`${slide.src}-${i}`}
              slide={slide}
              heading={heading}
              innerRef={(el) => {
                textRefs.current[i] = el;
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

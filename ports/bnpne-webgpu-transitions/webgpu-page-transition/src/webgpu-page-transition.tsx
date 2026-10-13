"use client";

import Lenis from "lenis";
import { animate } from "motion/react";
import * as React from "react";
import { flushSync } from "react-dom";

import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useRenderLoop } from "@/lib/render-loop";
import { cn } from "@/lib/utils";
import { Carousel } from "./webgpu-page-transition-carousel";
import { IndexFloat } from "./webgpu-page-transition-float";
import {
  GPU,
  type Plane,
  type PlaneBounds,
  SATELLITES_PER_IMAGE,
} from "./webgpu-page-transition-gpu";
import { Split } from "./webgpu-page-transition-split";

/*
 * Ported from bnpne/page-transitions-with-webgpu-vanilla-js (src/controller.js,
 * src/pages/*, src/transitions/*, src/global.css) at commit 70e5c0eafb14:
 * https://github.com/bnpne/page-transitions-with-webgpu-vanilla-js.
 *
 * The upstream is a single-page site: a router swaps three pages (a looping
 * carousel, a floating 3D index, a detail stack) while image planes on one
 * WebGPU canvas morph between them. Here it is one component that lives in its
 * own box: views switch through state, GSAP tweens and SplitText reveals are
 * Motion animations with the same durations, delays, staggers and eases, the
 * canvas runs through render-loop, and without WebGPU three.js draws with
 * WebGL 2; without either (or under reduced motion) the images are plain DOM.
 * docs/evidence/ports/webgpu-page-transition/fidelity.md lists every change.
 *
 * Copyright (c) 2009 - 2025 Codrops. MIT License; the full notice ends this file.
 */

export interface WebGPUPageTransitionImage {
  src: string;
  /** Describes the image; omit (or "") for a decorative one. */
  alt?: string;
  /** Natural size (any unit): sets the image's aspect ratio. */
  width: number;
  height: number;
  /** Under the image in the carousel; also its button's name. */
  caption?: string;
  /** The paragraph on the image's detail view. */
  fact?: string;
}

export type WebGPUPageTransitionView =
  | { page: "main" }
  | { page: "index" }
  | { page: "inner"; image: number };

export interface WebGPUPageTransitionLabels {
  /** The carousel view's name (upstream "Selected"). */
  main?: string;
  /** The index view's name (upstream "Index"). */
  index?: string;
  /** The detail view's title (upstream "Inner"). */
  inner?: string;
  /** The navigation's accessible name. */
  nav?: string;
}

export interface WebGPUPageTransitionProps
  extends Omit<React.ComponentProps<"div">, "children"> {
  /** The images (five upstream). */
  images: WebGPUPageTransitionImage[];
  /** The view to show (controlled). */
  view?: WebGPUPageTransitionView;
  /** The first view when uncontrolled. Default the carousel. */
  defaultView?: WebGPUPageTransitionView;
  /** Called when a view is chosen, as its transition starts. */
  onViewChange?: (view: WebGPUPageTransitionView) => void;
  labels?: WebGPUPageTransitionLabels;
  /** Fade the planes and reveal the text once the canvas is ready. Default true. */
  intro?: boolean;
  /** Draw with WebGL 2 even where WebGPU is available. */
  forceWebGL?: boolean;
  /** Heading level of the view titles. Default 2. */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
}

// ---- Eases (GSAP: power2 = cubic, power3 = quart) ----

const power2Out = (t: number) => 1 - (1 - t) ** 3;
const power2In = (t: number) => t ** 3;
const power3Out = (t: number) => 1 - (1 - t) ** 4;
const power3InOut = (t: number) =>
  t < 0.5 ? 8 * t ** 4 : 1 - (-2 * t + 2) ** 4 / 2;

// ---- Timing (src/controller.js, src/transitions/constants.js) ----

const DUR_MORPH = 0.9;
const DUR_FADE = 0.5;
const TILT_RAD_PER_PX = 0.005;
const TILT_MAX_RAD = 0.05;
const TILT_LERP = 0.09;
const INNER_TILT_RAD_PER_PX = 0.003;
const INNER_TILT_MAX_RAD = 0.05;
const INNER_TILT_LERP = 0.09;
const TITLE_IN = { duration: 0.7, stagger: 0.04, delay: 0 };
const TITLE_OUT = { duration: 0.45, stagger: 0.025, delay: 0 };
const FACT_IN = { duration: 0.8, stagger: 0.08, delay: 0.1 };
const FACT_OUT = { duration: 0.5, stagger: 0.05, delay: 0 };
const CAPTION_IN = { duration: 0.7, stagger: 0.06, delay: 0.15 };
const CAPTION_OUT = { duration: 0.45, stagger: 0.04, delay: 0 };
const INTRO_TEXT = { duration: 0.7, stagger: 0.06 };
const INTRO_NAV_DELAY = 0.1;
const INTRO_PLANE = { duration: 1, stagger: 0.08 };
const INNER_X_OFFSETS_VW = [0, -14, 10, -6, 16];

/** A number tween; resolves when done (or when stopped). */
function tween(
  from: number,
  to: number,
  options: { duration: number; ease: (t: number) => number; delay?: number },
  onUpdate: (value: number) => void,
) {
  return new Promise<void>((resolve) => {
    animate(from, to, {
      duration: options.duration,
      ease: options.ease,
      delay: options.delay ?? 0,
      onUpdate,
    }).then(
      () => resolve(),
      () => resolve(),
    );
  });
}

/** GSAP's yPercent on a split piece: 3D while moving, as force3D "auto". */
function setYPercent(el: HTMLElement, y: number) {
  el.style.transform =
    y === 0 ? "translate(0px, 0px)" : `translate(0%, ${y}%) translate3d(0px, 0px, 0px)`;
}

/** gsap.from(pieces, { yPercent: 102 }) or gsap.to(pieces, { yPercent: -102 }). */
function movePieces(
  pieces: HTMLElement[],
  direction: "in" | "out",
  timing: { duration: number; stagger: number; delay: number },
) {
  if (pieces.length === 0) {
    return null;
  }
  return Promise.all(
    pieces.map((el, i) => {
      const from = direction === "in" ? 102 : 0;
      const to = direction === "in" ? 0 : -102;
      if (direction === "in") {
        setYPercent(el, from);
      }
      return tween(
        from,
        to,
        {
          duration: timing.duration,
          ease: power3Out,
          delay: timing.delay + i * timing.stagger,
        },
        (y) => setYPercent(el, y),
      );
    }),
  );
}

// ---- Views ----

interface PageEntry {
  key: number;
  view: WebGPUPageTransitionView;
}

interface PageText {
  title: HTMLElement[];
  fact: HTMLElement[];
  captions: HTMLElement[][];
}

const sameView = (a: WebGPUPageTransitionView, b: WebGPUPageTransitionView) =>
  a.page === b.page &&
  (a.page !== "inner" || (b.page === "inner" && a.image === b.image));

type Tier = "dom" | "webgpu" | "webgl2";

// Upstream global.css, line for line where it styles the component, scoped to
// it: fixed positions are relative to the component's box, vw and vh are its
// width and height (cqw, cqh), and colours are prefixed tokens.
const STYLES = `
[data-slot="webgpu-page-transition"] {
  position: relative;
  overflow: hidden;
  container-type: size;
  background: var(--webgpu-page-transition-surface, #ffffff);
  color: var(--webgpu-page-transition-foreground, #111);
  font-family: var(--webgpu-page-transition-font, system-ui, -apple-system, sans-serif);
}
[data-slot="webgpu-page-transition"] * {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
[data-slot="webgpu-page-transition"] .wpt-nav {
  position: absolute;
  top: 1.25rem;
  inset-inline-start: 1.5rem;
  z-index: 200;
  display: flex;
  gap: 0.35rem;
  font-size: 0.875rem;
  letter-spacing: 0.02em;
  pointer-events: none;
}
[data-slot="webgpu-page-transition"] .wpt-nav button:not(:last-child)::after {
  content: ",";
  margin-left: 0.05rem;
}
[data-slot="webgpu-page-transition"] .page-title {
  position: absolute;
  top: 1.25rem;
  inset-inline-end: 1.5rem;
  z-index: 10;
  font-size: 0.875rem;
  font-weight: 400;
  line-height: 1;
  letter-spacing: 0.02em;
  color: inherit;
  opacity: 0.5;
  pointer-events: none;
  margin: 0;
}
[data-slot="webgpu-page-transition"] .wpt-nav button {
  position: relative;
  color: inherit;
  font: inherit;
  letter-spacing: inherit;
  text-align: inherit;
  background: none;
  border: 0;
  cursor: pointer;
  text-decoration: none;
  pointer-events: auto;
  opacity: 0.5;
  transition: opacity 0.15s ease;
}
[data-slot="webgpu-page-transition"] .wpt-nav button::before {
  content: "";
  position: absolute;
  left: 0;
  bottom: -3px;
  width: 100%;
  height: 1px;
  background: currentColor;
  transform: scaleX(0);
  transform-origin: right center;
  transition: transform 0.45s cubic-bezier(0.77, 0, 0.18, 1);
  pointer-events: none;
}
[data-slot="webgpu-page-transition"] .wpt-nav button:hover::before,
[data-slot="webgpu-page-transition"] .wpt-nav button[aria-current="page"]::before {
  transform: scaleX(1);
  transform-origin: left center;
}
[data-slot="webgpu-page-transition"] .wpt-nav button:hover,
[data-slot="webgpu-page-transition"] .wpt-nav button[aria-current="page"] {
  opacity: 1;
}
[data-slot="webgpu-page-transition"] :is(button, [tabindex]):focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 3px;
}
[data-slot="webgpu-page-transition"] .inner-fact {
  position: absolute;
  top: 10rem;
  inset-inline-start: 1.5rem;
  z-index: 10;
  max-width: 16rem;
  font-size: 0.875rem;
  font-weight: 400;
  line-height: 1.35;
  letter-spacing: 0.02em;
  color: inherit;
  pointer-events: none;
  margin: 0;
}
[data-slot="webgpu-page-transition"] .wpt-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 100;
  display: block;
  pointer-events: none;
}
[data-slot="webgpu-page-transition"] .page {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
[data-slot="webgpu-page-transition"] .page-main .slot {
  position: absolute;
  top: 0;
  left: 0;
  width: 23cqw;
  display: block;
  pointer-events: auto;
  will-change: transform;
  background: none;
  border: 0;
  color: inherit;
  font: inherit;
  text-align: start;
  cursor: pointer;
}
[data-slot="webgpu-page-transition"] .slot figure {
  width: 100%;
  height: 100%;
  display: block;
}
[data-slot="webgpu-page-transition"] .wpt-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 8px;
}
[data-slot="webgpu-page-transition"][data-tier^="web"] .wpt-image {
  opacity: 0;
}
[data-slot="webgpu-page-transition"] .page-main .slot-caption {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  padding-top: 0.5rem;
  font-size: 0.875rem;
  letter-spacing: 0.02em;
  color: inherit;
  opacity: 0.5;
  pointer-events: none;
}
[data-slot="webgpu-page-transition"] .inner-scroll {
  position: absolute;
  inset: 0;
  overflow-y: auto;
  pointer-events: auto;
  scrollbar-width: none;
}
[data-slot="webgpu-page-transition"] .inner-scroll::-webkit-scrollbar {
  display: none;
}
[data-slot="webgpu-page-transition"] .page-inner .stack {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 48px;
  width: 100%;
  padding-top: calc((100cqh - var(--cell-h)) / 2);
  padding-bottom: calc((100cqh - var(--cell-h)) / 2);
}
[data-slot="webgpu-page-transition"] .page-inner .slot {
  width: 23cqw;
  display: block;
  flex-shrink: 0;
}
[data-slot="webgpu-page-transition"] .wpt-float-image {
  position: absolute;
  top: 0;
  left: 0;
  object-fit: cover;
  border-radius: 8px;
}
[data-slot="webgpu-page-transition"] .wpt-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
[data-slot="webgpu-page-transition"] .wpt-sr-only:focus-within {
  inset-block-end: 1.25rem;
  inset-inline-start: 1.5rem;
  width: auto;
  height: auto;
  margin: 0;
  overflow: visible;
  clip: auto;
  z-index: 300;
  pointer-events: auto;
}
@media (prefers-contrast: more) {
  [data-slot="webgpu-page-transition"] .page-title,
  [data-slot="webgpu-page-transition"] .page-main .slot-caption,
  [data-slot="webgpu-page-transition"] .wpt-nav button {
    opacity: 1;
  }
}
`;

/** The carousel slot's resting place before script runs (scrollX 0). */
function initialSlotStyle(
  i: number,
  count: number,
  image: WebGPUPageTransitionImage,
): React.CSSProperties {
  const c = Math.floor(count / 2);
  const rel = i - c;
  return {
    aspectRatio: `${image.width} / ${image.height}`,
    transform: `translate(calc(50cqw + ${rel} * (23cqw + 48px) - 11.5cqw), calc(50cqh - 11.5cqw * ${image.height / image.width}))`,
  };
}

/**
 * Image planes that morph between three views on one WebGPU canvas: a looping
 * carousel, a 3D float of every image you can drag, and a detail stack per
 * image. Falls back to WebGL 2 without WebGPU, and to plain images without
 * either or under reduced motion.
 */
export function WebGPUPageTransition({
  images,
  view: viewProp,
  defaultView = { page: "main" },
  onViewChange,
  labels,
  intro = true,
  forceWebGL = false,
  headingLevel = 2,
  className,
  ref,
  ...props
}: WebGPUPageTransitionProps) {
  const reduceMotion = useReducedMotion();
  const count = images.length;
  const heading = `h${headingLevel}` as const;
  const text = {
    main: labels?.main ?? "Selected",
    index: labels?.index ?? "Index",
    inner: labels?.inner ?? "Inner",
    nav: labels?.nav ?? "Views",
  };
  const first = viewProp ?? defaultView;

  const host = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const pageEls = React.useRef(new Map<number, HTMLElement>());
  const pageText = React.useRef(new Map<number, PageText>());
  const navPieces = React.useRef<HTMLElement[][]>([]);
  const nextKey = React.useRef(1);
  const [pages, setPages] = React.useState<PageEntry[]>([
    { key: 0, view: first },
  ]);
  const [active, setActive] = React.useState<WebGPUPageTransitionView>(first);
  const [tier, setTier] = React.useState<Tier>("dom");
  // Bumped when a transition ends, so a view chosen meanwhile still applies.
  const [settled, setSettled] = React.useState(0);
  const [transitioning, setTransitioning] = React.useState(false);
  const setHost = React.useCallback(
    (el: HTMLDivElement | null) => {
      host.current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) ref.current = el;
    },
    [ref],
  );

  // The controller's state (upstream: Controller), outside React's renders.
  const ctl = React.useRef({
    current: { key: 0, view: first } as PageEntry,
    mutating: false,
    carousel: null as Carousel | null,
    indexFloat: null as IndexFloat | null,
    lenis: null as Lenis | null,
    gpu: null as GPU | null,
    introPlayed: false,
  });

  const aspects = React.useMemo(
    () => images.map((image) => image.width / image.height),
    [images],
  );
  // The float sizes planes by the loaded textures' aspect (gpu.aspects), as
  // upstream does; the slots use the images' width and height.
  const floatSource = React.useCallback(
    () => ({
      host: host.current as HTMLElement,
      aspects: ctl.current.gpu?.ready ? ctl.current.gpu.aspects : aspects,
    }),
    [aspects],
  );

  const textOf = (key: number): PageText => {
    let entry = pageText.current.get(key);
    if (!entry) {
      entry = { title: [], fact: [], captions: [] };
      pageText.current.set(key, entry);
    }
    return entry;
  };

  /** A rect relative to the component's box (upstream: the viewport). */
  const relRect = React.useCallback((el: Element): PlaneBounds => {
    const r = el.getBoundingClientRect();
    const o = host.current?.getBoundingClientRect() ?? { left: 0, top: 0 };
    return { x: r.left - o.left, y: r.top - o.top, w: r.width, h: r.height, z: 0 };
  }, []);

  const slotRects = React.useCallback(
    (pageEl: Element, selector: string) =>
      Array.from(pageEl.querySelectorAll(selector)).map(relRect),
    [relRect],
  );

  // ---- Planes (gpu.js layouts) ----

  const syncPlaneToEl = React.useCallback((plane: Plane, el: Element) => {
    plane.trackedEl = el;
    // Bounds follow on the next frame (GPU.update reads trackedEl).
  }, []);

  const snapLayout = React.useCallback((view: WebGPUPageTransitionView) => {
    const gpu = ctl.current.gpu;
    if (!gpu?.ready) {
      return;
    }
    if (view.page === "main") gpu.applyMainLayout();
    else if (view.page === "index") gpu.applyIndexLayout();
    else gpu.applyInnerLayout(view.image);
  }, []);

  const innerTiltPlanes = React.useCallback((image: number) => {
    const gpu = ctl.current.gpu;
    if (!gpu?.ready) {
      return [];
    }
    const planes = [gpu.planes[gpu.mainIdx(image)]];
    for (let j = 0; j < SATELLITES_PER_IMAGE; j++) {
      planes.push(gpu.planes[gpu.satIdx(image, j)]);
    }
    return planes;
  }, []);

  /** Positions the DOM images of the index view (no canvas). */
  const placeFloatImages = React.useCallback((pageEl: Element, rects: PlaneBounds[]) => {
    const imgs = pageEl.querySelectorAll<HTMLElement>(".wpt-float-image");
    imgs.forEach((img, i) => {
      const r = rects[i];
      if (!r) return;
      img.style.width = `${r.w}px`;
      img.style.height = `${r.h}px`;
      img.style.transform = `translate(${r.x}px, ${r.y}px)`;
      img.style.zIndex = String(Math.round(1000 - r.z));
    });
  }, []);

  // ---- Entering and leaving a view (_enterPage, _leavePage) ----

  const enterPage = React.useCallback(
    (entry: PageEntry) => {
      const c = ctl.current;
      const el = pageEls.current.get(entry.key);
      const root = host.current;
      if (!el || !root) {
        return;
      }
      const gpu = c.gpu?.ready ? c.gpu : null;
      if (entry.view.page === "main") {
        if (!c.carousel) c.carousel = new Carousel(el, root);
        c.carousel.start();
        if (gpu) {
          const slots = el.querySelectorAll(".slot");
          for (let i = 0; i < slots.length && i < count; i++) {
            syncPlaneToEl(gpu.planes[gpu.mainIdx(i)], slots[i]);
          }
        }
        return;
      }
      if (entry.view.page === "inner") {
        const scroll = el.querySelector<HTMLElement>(".inner-scroll");
        const stack = el.querySelector<HTMLElement>(".stack");
        if (scroll && stack && !c.lenis) {
          c.lenis = new Lenis({
            wrapper: scroll,
            content: stack,
            smoothWheel: true,
            syncTouch: true,
            lerp: 0.09,
          });
        }
        if (gpu) {
          const slots = el.querySelectorAll(".stack .slot");
          syncPlaneToEl(gpu.planes[gpu.mainIdx(entry.view.image)], slots[0]);
          for (let j = 0; j < SATELLITES_PER_IMAGE; j++) {
            const slot = slots[j + 1];
            if (!slot) continue;
            syncPlaneToEl(gpu.planes[gpu.satIdx(entry.view.image, j)], slot);
          }
        }
        return;
      }
      if (!c.indexFloat) {
        c.indexFloat = new IndexFloat(gpu, floatSource());
        c.indexFloat.prepare();
      }
      c.indexFloat.gpu = gpu;
      if (!reduceMotion) {
        c.indexFloat.start();
      } else {
        c.indexFloat.applyProjection();
      }
      placeFloatImages(el, c.indexFloat.current());
    },
    [count, floatSource, placeFloatImages, reduceMotion, syncPlaneToEl],
  );

  const leavePage = React.useCallback(
    (entry: PageEntry) => {
      const c = ctl.current;
      const gpu = c.gpu?.ready ? c.gpu : null;
      if (entry.view.page === "main" && c.carousel) {
        c.carousel.stop();
        c.carousel = null;
        // Clear any leftover scroll tilt so the main planes don't carry a
        // lean into the next view, where they're reused.
        if (gpu) for (let i = 0; i < count; i++) gpu.planes[gpu.mainIdx(i)].tilt = 0;
      }
      if (entry.view.page === "index" && c.indexFloat) {
        c.indexFloat.stop();
        c.indexFloat = null;
      }
      if (entry.view.page === "inner") {
        c.lenis?.destroy();
        c.lenis = null;
        for (const plane of innerTiltPlanes(entry.view.image)) plane.tiltX = 0;
      }
      if (gpu) for (const plane of gpu.planes) plane.trackedEl = null;
    },
    [count, innerTiltPlanes],
  );

  // ---- The frame tick (Controller.tick) ----

  const tick = React.useCallback(() => {
    const c = ctl.current;
    const gpu = c.gpu?.ready ? c.gpu : null;
    if (c.carousel) {
      c.carousel.tick();
      if (gpu) {
        let target = c.carousel.velocity * TILT_RAD_PER_PX;
        if (target > TILT_MAX_RAD) target = TILT_MAX_RAD;
        else if (target < -TILT_MAX_RAD) target = -TILT_MAX_RAD;
        for (let i = 0; i < count; i++) {
          const plane = gpu.planes[gpu.mainIdx(i)];
          plane.tilt += (target - plane.tilt) * TILT_LERP;
        }
      }
    }
    if (c.indexFloat) {
      c.indexFloat.tick();
      if (!gpu) {
        const el = pageEls.current.get(c.current.key);
        if (el && c.current.view.page === "index") {
          placeFloatImages(el, c.indexFloat.current());
        }
      }
    }
    if (gpu && c.current.view.page === "inner" && !c.mutating) {
      let target = (c.lenis?.velocity ?? 0) * INNER_TILT_RAD_PER_PX;
      if (target > INNER_TILT_MAX_RAD) target = INNER_TILT_MAX_RAD;
      else if (target < -INNER_TILT_MAX_RAD) target = -INNER_TILT_MAX_RAD;
      for (const plane of innerTiltPlanes(c.current.view.image)) {
        plane.tiltX += (target - plane.tiltX) * INNER_TILT_LERP;
      }
    }
  }, [count, innerTiltPlanes, placeFloatImages]);

  // ---- Intro (Controller.playIntro) ----

  const playIntro = React.useCallback(() => {
    const c = ctl.current;
    if (c.introPlayed) {
      return;
    }
    c.introPlayed = true;
    const t = textOf(c.current.key);
    movePieces(t.title, "in", TITLE_IN);
    movePieces(t.fact, "in", FACT_IN);
    movePieces(t.captions.flat(), "in", CAPTION_IN);
    // Upstream's intro sets the links' opacity to 1 inline before revealing
    // them (gsap.set), which leaves the inactive one at full opacity too.
    for (const button of host.current?.querySelectorAll<HTMLElement>(".wpt-nav button") ?? []) {
      button.style.opacity = "1";
    }
    movePieces(navPieces.current.flat(), "in", {
      duration: INTRO_TEXT.duration,
      stagger: INTRO_TEXT.stagger,
      delay: INTRO_NAV_DELAY,
    });
    const gpu = c.gpu?.ready ? c.gpu : null;
    if (gpu) {
      const planes = gpu.planes.filter((p) => p.introVisible);
      planes.forEach((plane, i) => {
        tween(
          0,
          1,
          {
            duration: INTRO_PLANE.duration,
            ease: power2Out,
            delay: i * INTRO_PLANE.stagger,
          },
          (v) => {
            plane.opacity = v;
          },
        );
      });
    }
    // biome-ignore lint/correctness/useExhaustiveDependencies: reads refs only.
  }, []);

  // ---- The canvas (render-loop, context "none": three.js picks WebGPU or WebGL 2) ----

  const imageKey = images.map((i) => i.src).join("|");
  const loop = useRenderLoop(canvasRef, {
    context: "none",
    maxDpr: 2,
    setup: (canvas) => {
      const gpu = new GPU(canvas, count);
      const root = host.current;
      const size = {
        width: root?.clientWidth || canvas.clientWidth || 1,
        height: root?.clientHeight || canvas.clientHeight || 1,
        dpr: Math.max(1, Math.min(window.devicePixelRatio || 1, 2)),
      };
      gpu
        .init(
          images.map((i) => i.src),
          size,
          forceWebGL,
        )
        .then(() => {
          if (gpu.disposed || !gpu.ready) return;
          const c = ctl.current;
          c.gpu = gpu;
          snapLayout(c.current.view);
          if (c.carousel) c.carousel.measure();
          leavePage(c.current);
          enterPage(c.current);
          for (const p of gpu.planes) {
            p.introVisible = p.opacity > 0.001;
            if (intro) p.opacity = 0;
          }
          setTier(gpu.backend ?? "webgl2");
          if (intro) playIntro();
          else c.introPlayed = true;
        })
        .catch((error) => {
          // render() throws it, so render-loop reports "unsupported".
          gpu.error = error ?? new Error("webgpu-page-transition: no WebGPU or WebGL 2");
        });
      return gpu;
    },
    resize: (gpu, size) => {
      gpu.resize(size.width, size.height, size.dpr);
      const c = ctl.current;
      if (!c.mutating) {
        if (c.current.view.page === "main") c.carousel?.measure();
        else if (c.current.view.page === "index") c.indexFloat?.measure();
        else snapLayout(c.current.view);
      }
    },
    render: (gpu) => {
      if (gpu.error) {
        throw gpu.error;
      }
      if (!gpu.ready) {
        return false;
      }
      tick();
      const o = host.current?.getBoundingClientRect() ?? { left: 0, top: 0 };
      gpu.update(o);
      return true;
    },
    dispose: (gpu) => {
      gpu.destroy();
      if (ctl.current.gpu === gpu) ctl.current.gpu = null;
    },
  });

  // Without the canvas (no WebGPU or WebGL 2, or reduced motion), the
  // carousel and the float still run, on their own frames.
  const domTier =
    loop.status === "reduced-motion" || loop.status === "unsupported";
  React.useEffect(() => {
    if (!domTier) {
      return;
    }
    setTier("dom");
    ctl.current.introPlayed = true;
    let raf = 0;
    const frame = () => {
      tick();
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [domTier, tick]);

  // The first view: start its carousel, float or scroll.
  React.useLayoutEffect(() => {
    enterPage(ctl.current.current);
    return () => leavePage(ctl.current.current);
    // biome-ignore lint/correctness/useExhaustiveDependencies: once, on mount.
  }, []);

  // ---- Navigation (Controller.navigate and the transitions) ----

  const navigate = React.useCallback(
    async (next: WebGPUPageTransitionView) => {
      const c = ctl.current;
      if (c.mutating || sameView(next, c.current.view)) {
        return;
      }
      const fromState = c.current;
      const key = nextKey.current++;
      const toState: PageEntry = { key, view: next };
      c.mutating = true;
      setTransitioning(true);
      setActive(next);
      onViewChange?.(next);

      const fromText = textOf(fromState.key);
      const instant = reduceMotion;
      const titleOut = instant ? null : movePieces(fromText.title, "out", TITLE_OUT);
      const factOut = instant ? null : movePieces(fromText.fact, "out", FACT_OUT);
      const captionsOut = instant
        ? null
        : movePieces(fromText.captions.flat(), "out", CAPTION_OUT);

      leavePage(fromState);
      flushSync(() => {
        setPages((p) => [...p, toState]);
      });
      const fromEl = pageEls.current.get(fromState.key);
      const toEl = pageEls.current.get(key);
      if (!fromEl || !toEl) {
        c.mutating = false;
        setTransitioning(false);
        return;
      }
      fromEl.style.pointerEvents = "none";
      fromEl.setAttribute("inert", "");

      if (next.page === "main") {
        c.carousel = new Carousel(toEl, host.current as HTMLElement);
        c.carousel.prepare();
      }
      const gpu = c.gpu?.ready ? c.gpu : null;
      if (next.page === "index") {
        c.indexFloat = new IndexFloat(gpu, floatSource());
        c.indexFloat.prepare();
      }

      const toText = textOf(key);
      const waits: (Promise<unknown> | null)[] = [titleOut, factOut, captionsOut];
      if (!instant) {
        waits.push(movePieces(toText.title, "in", TITLE_IN));
        waits.push(movePieces(toText.fact, "in", FACT_IN));
        waits.push(movePieces(toText.captions.flat(), "in", CAPTION_IN));
      }

      if (gpu && !instant) {
        waits.push(...planeTransition(gpu, fromState.view, next, toEl));
      } else if (!instant) {
        // No canvas: the views crossfade.
        toEl.style.opacity = "0";
        waits.push(
          tween(1, 0, { duration: DUR_FADE, ease: power2Out }, (v) => {
            fromEl.style.opacity = String(v);
          }),
          tween(0, 1, { duration: DUR_FADE, ease: power2Out }, (v) => {
            toEl.style.opacity = String(v);
          }),
        );
      }
      await Promise.all(waits);

      flushSync(() => {
        setPages((p) => p.filter((entry) => entry.key !== fromState.key));
      });
      pageText.current.delete(fromState.key);
      c.current = toState;
      snapLayout(next);
      enterPage(toState);
      c.mutating = false;
      setTransitioning(false);
      setSettled((n) => n + 1);
    },
    // biome-ignore lint/correctness/useExhaustiveDependencies: planeTransition and textOf read refs.
    [enterPage, floatSource, leavePage, onViewChange, reduceMotion, snapLayout],
  );

  /** The six upstream transitions (src/transitions/*), out and in at once. */
  function planeTransition(
    gpu: GPU,
    from: WebGPUPageTransitionView,
    to: WebGPUPageTransitionView,
    toEl: HTMLElement,
  ): Promise<unknown>[] {
    const c = ctl.current;
    const bounds = (plane: Plane, target: PlaneBounds, delay = 0) => {
      const start = { ...plane.bounds };
      const end = { ...target, z: target.z ?? 0 };
      return tween(
        0,
        1,
        { duration: DUR_MORPH, ease: power3InOut, delay },
        (t) => {
          plane.bounds.x = start.x + (end.x - start.x) * t;
          plane.bounds.y = start.y + (end.y - start.y) * t;
          plane.bounds.w = start.w + (end.w - start.w) * t;
          plane.bounds.h = start.h + (end.h - start.h) * t;
          plane.bounds.z = start.z + (end.z - start.z) * t;
        },
      );
    };
    const fade = (
      plane: Plane,
      to: number,
      options: { duration?: number; ease?: (t: number) => number; delay?: number } = {},
    ) =>
      tween(
        plane.opacity,
        to,
        {
          duration: options.duration ?? DUR_FADE,
          ease: options.ease ?? power2Out,
          delay: options.delay ?? 0,
        },
        (v) => {
          plane.opacity = v;
        },
      );
    const main = (i: number) => gpu.planes[gpu.mainIdx(i)];
    const sat = (i: number, j: number) => gpu.planes[gpu.satIdx(i, j)];
    const out: Promise<unknown>[] = [];
    const mainTargets = () => slotRects(toEl, ".slot");
    const innerTargets = () => slotRects(toEl, ".stack .slot");
    const floatTargets = () => c.indexFloat?.getTargets() ?? [];

    if (from.page === "main" && to.page === "inner") {
      const rects = innerTargets();
      for (let i = 0; i < count; i++) {
        if (i === to.image) out.push(bounds(main(i), rects[0]));
        else out.push(fade(main(i), 0));
      }
      for (let j = 0; j < SATELLITES_PER_IMAGE; j++) {
        const s = sat(to.image, j);
        s.bounds = { ...rects[j + 1] };
        s.opacity = 0;
        out.push(fade(s, 1, { delay: 0.25 + j * 0.08 }));
      }
    } else if (from.page === "inner" && to.page === "main") {
      const rects = mainTargets();
      out.push(bounds(main(from.image), rects[from.image]));
      for (let j = 0; j < SATELLITES_PER_IMAGE; j++) {
        out.push(
          fade(sat(from.image, j), 0, {
            duration: DUR_FADE * 0.7,
            ease: power2In,
            delay: (SATELLITES_PER_IMAGE - 1 - j) * 0.05,
          }),
        );
      }
      for (let i = 0; i < count; i++) {
        if (i === from.image) continue;
        const m = main(i);
        m.bounds = { ...rects[i] };
        m.opacity = 0;
        out.push(fade(m, 1, { delay: 0.25 }));
      }
    } else if (from.page === "main" && to.page === "index") {
      const targets = floatTargets();
      for (let i = 0; i < count; i++) out.push(bounds(main(i), targets[i]));
    } else if (from.page === "index" && to.page === "main") {
      const rects = mainTargets();
      for (let i = 0; i < count; i++) out.push(bounds(main(i), rects[i]));
    } else if (from.page === "index" && to.page === "inner") {
      const rects = innerTargets();
      out.push(bounds(main(to.image), rects[0]));
      for (let i = 0; i < count; i++) {
        if (i === to.image) continue;
        out.push(
          fade(main(i), 0, { duration: DUR_FADE * 0.7, ease: power2In }),
        );
      }
      for (let j = 0; j < SATELLITES_PER_IMAGE; j++) {
        const s = sat(to.image, j);
        s.bounds = { ...rects[j + 1] };
        s.opacity = 0;
        out.push(fade(s, 1, { delay: 0.25 + j * 0.08 }));
      }
    } else if (from.page === "inner" && to.page === "index") {
      const targets = floatTargets();
      out.push(bounds(main(from.image), targets[from.image]));
      for (let j = 0; j < SATELLITES_PER_IMAGE; j++) {
        out.push(
          fade(sat(from.image, j), 0, {
            duration: DUR_FADE * 0.7,
            ease: power2In,
            delay: (SATELLITES_PER_IMAGE - 1 - j) * 0.05,
          }),
        );
      }
      for (let i = 0; i < count; i++) {
        if (i === from.image) continue;
        const m = main(i);
        m.bounds = { ...targets[i] };
        m.opacity = 0;
        out.push(fade(m, 1, { delay: 0.2 + i * 0.04 }));
      }
    } else if (from.page === "inner" && to.page === "inner") {
      // Not reachable upstream; cut straight to the next detail view.
      gpu.applyInnerLayout(to.image);
    }
    return out;
  }

  // A controlled view.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `settled` re-checks after a transition.
  React.useEffect(() => {
    if (viewProp && !sameView(viewProp, ctl.current.current.view)) {
      navigate(viewProp);
    }
  }, [viewProp, navigate, settled]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const c = ctl.current;
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (c.carousel && step !== 0 && !c.mutating) {
      c.carousel.nudge(rtl ? -step : step);
    } else if (c.indexFloat && !c.mutating) {
      const keys: Record<string, [number, number]> = {
        ArrowLeft: [-40, 0],
        ArrowRight: [40, 0],
        ArrowUp: [0, -40],
        ArrowDown: [0, 40],
      };
      const k = keys[event.key];
      if (k) {
        event.preventDefault();
        c.indexFloat.nudge(k[0], k[1]);
      }
    }
  };

  const registerPage = (key: number) => (el: HTMLElement | null) => {
    if (el) pageEls.current.set(key, el);
    else pageEls.current.delete(key);
  };

  return (
    <div
      ref={setHost}
      data-slot="webgpu-page-transition"
      data-tier={tier}
      data-view={active.page}
      data-transitioning={transitioning ? "" : undefined}
      className={cn("h-svh w-full", className)}
      onKeyDown={onKeyDown}
      {...props}
    >
      <style href="designfrom-webgpu-page-transition" precedence="default">
        {STYLES}
      </style>
      <nav className="wpt-nav" aria-label={text.nav}>
        {(["main", "index"] as const).map((page, i) => (
          <button
            key={page}
            type="button"
            aria-current={active.page === page ? "page" : undefined}
            onClick={() => navigate({ page })}
          >
            <Split
              as="span"
              type="words"
              text={page === "main" ? text.main : text.index}
              register={(pieces) => {
                navPieces.current[i] = pieces;
              }}
            />
          </button>
        ))}
      </nav>
      {!domTier ? (
        <canvas ref={canvasRef} className="wpt-canvas" aria-hidden="true" />
      ) : null}
      {pages.map((entry) => (
        <PageView
          key={entry.key}
          entry={entry}
          images={images}
          heading={heading}
          text={text}
          pageRef={registerPage(entry.key)}
          textOf={textOf}
          onOpen={(image) => navigate({ page: "inner", image })}
        />
      ))}
    </div>
  );
}

interface PageViewProps {
  entry: PageEntry;
  images: WebGPUPageTransitionImage[];
  heading: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  text: { main: string; index: string; inner: string };
  pageRef: (el: HTMLElement | null) => void;
  textOf: (key: number) => PageText;
  onOpen: (image: number) => void;
}

/** One view's markup (src/pages/home.js, index-page.js, inner.js). */
function PageView({
  entry,
  images,
  heading,
  text,
  pageRef,
  textOf,
  onOpen,
}: PageViewProps) {
  const { key, view } = entry;
  const t = textOf(key);
  if (view.page === "main") {
    return (
      <section ref={pageRef} data-page="main" className="page page-main">
        <Split
          as={heading}
          type="words"
          className="page-title"
          text={text.main}
          register={(p) => {
            t.title = p;
          }}
        />
        <div className="carousel">
          {images.map((image, i) => (
            <button
              key={`${image.src}-${i}`}
              type="button"
              className={`slot slot-${i}`}
              style={initialSlotStyle(i, images.length, image)}
              aria-label={image.caption || image.alt || `Image ${i + 1}`}
              onClick={() => onOpen(i)}
            >
              <figure>
                <img className="wpt-image" src={image.src} alt={image.alt ?? ""} />
              </figure>
              {image.caption ? (
                <Split
                  type="lines"
                  className="slot-caption"
                  text={image.caption}
                  aria-hidden="true"
                  register={(p) => {
                    t.captions[i] = p;
                  }}
                />
              ) : null}
            </button>
          ))}
        </div>
      </section>
    );
  }
  if (view.page === "index") {
    return (
      <section ref={pageRef} data-page="index" className="page page-index">
        <Split
          as={heading}
          type="words"
          className="page-title"
          text={text.index}
          register={(p) => {
            t.title = p;
          }}
        />
        {images.map((image, i) => (
          <img
            key={`${image.src}-${i}`}
            className="wpt-image wpt-float-image"
            src={image.src}
            alt=""
            style={{ width: 0, height: 0 }}
          />
        ))}
        <ul className="wpt-sr-only">
          {images.map((image, i) => (
            <li key={`${image.src}-${i}`}>
              <button type="button" onClick={() => onOpen(i)}>
                {image.caption || image.alt || `Image ${i + 1}`}
              </button>
            </li>
          ))}
        </ul>
      </section>
    );
  }
  const image = images[view.image];
  return (
    <section
      ref={pageRef}
      data-page="inner"
      data-image={view.image}
      className="page page-inner"
      style={
        {
          "--cell-h": `calc(23cqw * ${image.height} / ${image.width})`,
        } as React.CSSProperties
      }
    >
      <Split
        as={heading}
        type="words"
        className="page-title"
        text={text.inner}
        register={(p) => {
          t.title = p;
        }}
      />
      {image.fact ? (
        <Split
          as="div"
          type="lines"
          className="inner-fact"
          text={image.fact}
          register={(p) => {
            t.fact = p;
          }}
        />
      ) : null}
      {/* biome-ignore lint/a11y/noNoninteractiveTabindex: a scroll container keyboard users must reach. */}
      <div className="inner-scroll" tabIndex={0} aria-label={image.caption || image.alt}>
        <div className="stack">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="slot"
              style={{
                aspectRatio: `${image.width} / ${image.height}`,
                transform: `translateX(${INNER_X_OFFSETS_VW[i] ?? 0}cqw)`,
              }}
            >
              <figure>
                <img
                  className="wpt-image"
                  src={image.src}
                  alt={i === 0 ? (image.alt ?? "") : ""}
                />
              </figure>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

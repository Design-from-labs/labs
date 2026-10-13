"use client";

import {
  animate,
  frameData,
  type MotionValue,
  motion,
  useMotionTemplate,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
} from "motion/react";
import * as React from "react";

import { cn } from "@/lib/utils";

/*
 * Ported from theoplawinski/codrops-sticky-grid-scroll (src/scripts/index.js
 * and src/styles/index.css) at commit 6015d6c7e66d:
 * https://github.com/theoplawinski/codrops-sticky-grid-scroll.
 *
 * The upstream drives the section with GSAP timelines and ScrollTrigger. Here
 * every tween is Motion (useScroll, motion values, animate) with the same
 * positions, durations and eases, so the picture at any scroll position is
 * the upstream's; docs/evidence/ports/sticky-grid-scroll/fidelity.md lists
 * every change.
 *
 * Copyright (c) 2025 Theo Plawinski; copyright (c) 2009 - 2025 Codrops. MIT
 * License; the full notice ends this file.
 */

// GSAP's power eases: power1 = quad, power2 = cubic, power3 = quart.
const power1InOut = (t: number) =>
  t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
const power1Out = (t: number) => 1 - (1 - t) ** 2;
const power2InOut = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
const power3InOut = (t: number) =>
  t < 0.5 ? 8 * t ** 4 : 1 - (-2 * t + 2) ** 4 / 2;
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

/**
 * GSAP starts a tween fired from a scroll update at its last tick, so its
 * first frame already shows one frame of progress; a Motion animation started
 * inside a frame starts on that frame. Starting it one frame early (a negative
 * delay) keeps every in-flight frame on the upstream's timing.
 */
const lastTick = () =>
  frameData.isProcessing ? Math.min(frameData.delta, 100) / 1000 : 0;

// The scrubbed timeline, in GSAP time units (animateGridOnScroll): the reveal
// starts at 0 (0.5 per item, 0.06 between items, so 0.68 long); the zoom is
// added at "-=0.6" (0.08) and lasts 1; its middle column starts at "-=0.5"
// (0.58) for 0.5; the content toggle is added at "-=0.32" (0.76). The
// timeline ends at 1.08.
const ITEM = 0.5;
const STAGGER = 0.06;
const ZOOM_AT = 0.08;
const MIDDLE_AT = ZOOM_AT + 0.5;
const TOGGLE_AT = 0.76;
const TOTAL = ZOOM_AT + 1;

// Upstream index.css, line for line, scoped to this component. Sizes were
// rem against `html { font-size: calc(100vw / 1440) }`; here the unit is the
// component's width / 1440 (`--sticky-grid-scroll-u`, the same thing for a
// full-width section) and viewport heights are `cqh`: the nearest scroll
// container that is a size container, else the viewport.
const STYLES = `
[data-slot="sticky-grid-scroll"] {
  --sticky-grid-scroll-u: calc(100cqw / 1440);
  container-type: inline-size;
  height: calc(425 * 1cqh);
  background-color: var(--sticky-grid-scroll-surface, #fff);
  color: var(--sticky-grid-scroll-foreground, #000);
  font-family: var(--sticky-grid-scroll-font, Arial, sans-serif);
  font-size: calc(16 * var(--sticky-grid-scroll-u));
}
[data-slot="sticky-grid-scroll"]:dir(rtl) {
  --sticky-grid-scroll-side: -1;
}
[data-slot="sticky-grid-scroll"][data-reduced-motion] {
  height: 100cqh;
}
[data-slot="sticky-grid-scroll-wrapper"] {
  position: sticky;
  top: 0;
  padding: 0 calc(24 * var(--sticky-grid-scroll-u));
  will-change: transform;
  overflow: hidden;
}
[data-slot="sticky-grid-scroll-content"] {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100cqh;
  text-align: center;
  z-index: 1;
}
[data-slot="sticky-grid-scroll-title"] {
  width: calc(924 * var(--sticky-grid-scroll-u));
  max-width: 100%;
  margin: 0;
  font-family: var(--sticky-grid-scroll-title-font, Times, serif);
  font-size: calc(104 * var(--sticky-grid-scroll-u));
  font-weight: inherit;
  line-height: 1.15;
  letter-spacing: -0.02em;
}
[data-slot="sticky-grid-scroll-description"] {
  width: calc(455 * var(--sticky-grid-scroll-u));
  max-width: 100%;
  margin: calc(24 * var(--sticky-grid-scroll-u)) 0 0;
  font-size: calc(14 * var(--sticky-grid-scroll-u));
  line-height: 1.3;
  text-transform: uppercase;
}
[data-slot="sticky-grid-scroll-action"] {
  margin-top: calc(32 * var(--sticky-grid-scroll-u));
  font-size: calc(14 * var(--sticky-grid-scroll-u));
  text-transform: uppercase;
}
[data-slot="sticky-grid-scroll-action"] :where(a, button) {
  color: inherit;
  text-decoration: none;
  font: inherit;
  text-transform: inherit;
  background: none;
  border: 0;
  padding: 0;
  cursor: pointer;
}
[data-slot="sticky-grid-scroll-action"] :where(a, button):hover {
  text-decoration: underline;
  text-underline-offset: 2px;
}
[data-slot="sticky-grid-scroll-action"] :where(a, button):focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 4px;
}
[data-slot="sticky-grid-scroll-gallery"] {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate3d(-50%, -50%, 0);
  width: calc(736 * var(--sticky-grid-scroll-u));
}
[data-slot="sticky-grid-scroll-grid"] {
  display: grid;
  grid-template-columns: repeat(var(--sticky-grid-scroll-columns, 3), 1fr);
  column-gap: calc(32 * var(--sticky-grid-scroll-u));
  row-gap: calc(40 * var(--sticky-grid-scroll-u));
  margin: 0;
  padding: 0;
  list-style: none;
  will-change: transform;
}
[data-slot="sticky-grid-scroll-item"] {
  width: 100%;
  aspect-ratio: 1;
  will-change: transform;
}
[data-slot="sticky-grid-scroll-item"] > img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  background-color: var(--sticky-grid-scroll-placeholder, lightgray);
}
@media (prefers-contrast: more) {
  [data-slot="sticky-grid-scroll-action"] :where(a, button) {
    text-decoration: underline;
  }
}
`;

export interface StickyGridScrollImage {
  src: string;
  /** Describes the image; omit (or "") for a decorative one. */
  alt?: string;
}

export interface StickyGridScrollProps
  extends Omit<React.ComponentProps<"section">, "title"> {
  /** The grid's images, distributed over the columns in order (12 upstream). */
  images: StickyGridScrollImage[];
  /** The heading that fades in, then rises when the grid opens. */
  title: React.ReactNode;
  /** Shown with the action once the grid has opened. */
  description?: React.ReactNode;
  /** A link or button shown under the description (for example `<a href>`). */
  action?: React.ReactNode;
  /** Columns in the grid. Default 3, as upstream. */
  columns?: number;
  /**
   * The element that scrolls, when it is not the window: a scroll container
   * with `container-type: size` (so the section's heights follow it).
   */
  container?: React.RefObject<HTMLElement | null>;
  /**
   * Slide the section up from under the content above it as it enters, as
   * upstream does under its intro image. Default true.
   */
  parallax?: boolean;
  /** Heading level of the title. Default 2. */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
}

interface Layout {
  /** The section's top in the scroller's content, in px. */
  top: number;
  height: number;
  /** The scroller's visible height (upstream: window.innerHeight). */
  viewport: number;
  /** Distance an item starts away from its place (gridRevealTimeline). */
  dy: number;
  /** The title's resting offset, in % of its own height (initContent). */
  titleOffset: number;
}

/**
 * One grid item at timeline time t (gridRevealTimeline and gridZoomTimeline):
 * its xPercent and yPercent, and y as a fraction of the reveal distance.
 * Items fill columns in order (groupItemsByColumn: item i is in column
 * i % columns). Even columns come from above, staggered from their last item;
 * odd columns from below, from their first.
 */
function itemState(
  i: number,
  columns: number,
  count: number,
  t: number,
  zoom: number,
  middle: number,
) {
  const c = i % columns;
  const k = Math.floor(i / columns);
  const n = Math.ceil((count - c) / columns);
  const fromTop = c % 2 === 0;
  const order = fromTop ? n - 1 - k : k;
  const reveal = power1InOut(clamp01((t - order * STAGGER) / ITEM));
  const y = (fromTop ? -1 : 1) * (1 - reveal);
  let x = 0;
  let yPercent = 0;
  if (c === 0) {
    x = -40 * zoom;
  } else if (c === columns - 1 && columns > 1) {
    x = 40 * zoom;
  } else if (c === Math.floor(columns / 2)) {
    yPercent = (k < Math.floor(n / 2) ? -1 : 1) * 40 * middle;
  }
  return { x, yPercent, y };
}

function itemTransform(xPercent: number, yPercent: number, y: number) {
  return `translate(${xPercent}%, ${yPercent}%) translate3d(0px, ${y}px, 0px)`;
}

/**
 * A scroll-driven image grid in a sticky section: as you scroll, its columns
 * slide in from above and below, the grid zooms open and the title, a
 * description and an action settle into the space it leaves. Scroll it with
 * the page or with a scroll container (`container`); wrap it in SmoothScroll
 * for the upstream's smoothing.
 */
export function StickyGridScroll({
  images,
  title,
  description,
  action,
  columns = 3,
  container,
  parallax = true,
  headingLevel = 2,
  className,
  style,
  ...props
}: StickyGridScrollProps) {
  const reduceMotion = useReducedMotion() ?? false;
  const block = React.useRef<HTMLElement>(null);
  const wrapper = React.useRef<HTMLDivElement>(null);
  const content = React.useRef<HTMLDivElement>(null);
  const titleRef = React.useRef<HTMLHeadingElement>(null);
  const grid = React.useRef<HTMLUListElement>(null);
  const items = React.useRef<(HTMLLIElement | null)[]>([]);
  const layout = React.useRef<Layout | null>(null);
  const state = React.useRef({ mainTime: -1, titleOn: false, ltr: true });

  // Values the time-based tweens move (the title and the copy under it).
  const titleOpacity = useMotionValue(reduceMotion ? 1 : 0);
  const titleY = useMotionValue(0);
  const copyOpacity = useMotionValue(reduceMotion ? 1 : 0);
  const titleTransform = useMotionTemplate`translate(0%, ${titleY}%)`;
  const [copyInteractive, setCopyInteractive] = React.useState(reduceMotion);

  const { scrollY } = useScroll(container ? { container } : undefined);
  const count = images.length;

  /** Reads the layout ScrollTrigger reads on refresh. */
  const measure = React.useCallback(() => {
    const el = block.current;
    const contentEl = content.current;
    const titleEl = titleRef.current;
    const gridEl = grid.current;
    if (!el || !contentEl || !titleEl || !gridEl) {
      return null;
    }
    const scroller = container?.current ?? null;
    const viewport = scroller ? scroller.clientHeight : window.innerHeight;
    const scrollTop = scroller ? scroller.scrollTop : window.scrollY;
    const originTop = scroller ? scroller.getBoundingClientRect().top : 0;
    const rect = el.getBoundingClientRect();
    // initContent: the title sits centred in its column, offset by the gap
    // above it as a percentage of the content's height (applied as yPercent).
    const dyTitle = (contentEl.offsetHeight - titleEl.offsetHeight) / 2;
    state.current.ltr = getComputedStyle(el).direction !== "rtl";
    return {
      top: rect.top - originTop + scrollTop,
      height: el.offsetHeight,
      viewport,
      dy: viewport - (viewport - gridEl.offsetHeight) / 2,
      titleOffset: (dyTitle / contentEl.offsetHeight) * 100,
    };
  }, [container]);

  /** toggleContent: time-based, interrupting any tween still running. */
  const toggleContent = React.useCallback(
    (visible: boolean) => {
      const l = layout.current;
      if (!l) {
        return;
      }
      const early = lastTick();
      animate(titleY, visible ? 0 : l.titleOffset, {
        duration: 0.7,
        ease: power2InOut,
        delay: -early,
      });
      animate(copyOpacity, visible ? 1 : 0, {
        duration: 0.4,
        ease: visible ? power1InOut : power1Out,
        // "-=90%" after the 0.7 s title tween when showing; "<" when hiding.
        delay: (visible ? 0.7 - 0.9 * 0.4 : 0) - early,
      });
      setCopyInteractive(visible);
    },
    [titleY, copyOpacity],
  );

  /** Applies the scroll-driven state for a scroll position. */
  const render = React.useCallback(
    (scroll: number) => {
      const l = layout.current;
      const s = state.current;
      if (!l || reduceMotion) {
        return;
      }
      // addParallaxOnScroll: from yPercent -100, "top bottom" to "top top".
      if (wrapper.current) {
        const p = parallax
          ? clamp01((scroll - (l.top - l.viewport)) / l.viewport)
          : 1;
        wrapper.current.style.transform =
          p >= 1
            ? ""
            : `translate(0%, ${-100 * (1 - p)}%) translate3d(0px, 0px, 0px)`;
      }
      // animateTitleOnScroll: plays at "top 57%", resets when scrolled back.
      const titleOn = scroll >= l.top - 0.57 * l.viewport;
      if (titleOn !== s.titleOn) {
        s.titleOn = titleOn;
        if (titleOn) {
          titleOpacity.set(0);
          animate(titleOpacity, 1, {
            duration: 0.7,
            ease: power1Out,
            delay: -lastTick(),
          });
        } else {
          titleOpacity.stop();
          titleOpacity.set(0);
        }
      }
      // animateGridOnScroll: scrubbed from "top 25%" to "bottom bottom".
      const start = l.top - 0.25 * l.viewport;
      const end = l.top + l.height - l.viewport;
      const t = clamp01((scroll - start) / (end - start)) * TOTAL;
      const previous = s.mainTime;
      s.mainTime = t;
      if (previous >= 0 && previous < TOGGLE_AT !== t < TOGGLE_AT) {
        toggleContent(t >= TOGGLE_AT);
      }
      const zoom = power3InOut(clamp01((t - ZOOM_AT) / 1));
      if (grid.current) {
        const scale = 1 + 1.05 * zoom;
        grid.current.style.transform =
          scale === 1
            ? ""
            : `translate3d(0px, 0px, 0px) scale(${scale}, ${scale})`;
      }
      const side = s.ltr ? 1 : -1;
      const middle = power1InOut(clamp01((t - MIDDLE_AT) / 0.5));
      items.current.forEach((item, i) => {
        if (item && i < count) {
          const { x, yPercent, y } = itemState(
            i,
            columns,
            count,
            t,
            zoom,
            middle,
          );
          item.style.transform = itemTransform(x * side, yPercent, y * l.dy);
        }
      });
    },
    [reduceMotion, parallax, columns, count, titleOpacity, toggleContent],
  );

  // Measure on mount and whenever the section or its scroller resizes; the
  // first measure applies the starting state (initContent).
  React.useLayoutEffect(() => {
    if (reduceMotion) {
      return;
    }
    let observed: Element | null = null;
    const update = () => {
      const next = measure();
      if (!next) {
        return;
      }
      const first = layout.current === null;
      layout.current = next;
      if (first) {
        titleY.set(next.titleOffset);
        copyOpacity.set(0);
        state.current.mainTime = -1;
        state.current.titleOn = false;
      } else if (state.current.mainTime < TOGGLE_AT) {
        titleY.set(next.titleOffset);
      }
      const scroller = container?.current ?? null;
      if (scroller && scroller !== observed) {
        observer.observe(scroller);
        observed = scroller;
      }
      render(scrollY.get());
    };
    const observer = new ResizeObserver(update);
    if (block.current) {
      observer.observe(block.current);
    }
    update();
    return () => {
      observer.disconnect();
      layout.current = null;
    };
  }, [measure, container, reduceMotion, render, scrollY, titleY, copyOpacity]);

  useMotionValueEvent(scrollY, "change", render);

  const Heading = `h${headingLevel}` as const;

  return (
    <section
      ref={block}
      data-slot="sticky-grid-scroll"
      data-reduced-motion={reduceMotion ? "" : undefined}
      className={cn(className)}
      style={
        {
          "--sticky-grid-scroll-columns": columns,
          ...style,
        } as React.CSSProperties
      }
      {...props}
    >
      <style href="designfrom-sticky-grid-scroll" precedence="default">
        {STYLES}
      </style>
      <div ref={wrapper} data-slot="sticky-grid-scroll-wrapper">
        <div ref={content} data-slot="sticky-grid-scroll-content">
          <MotionHeading
            as={Heading}
            ref={titleRef}
            opacity={titleOpacity}
            transform={reduceMotion ? undefined : titleTransform}
          >
            {title}
          </MotionHeading>
          {description ? (
            <motion.p
              data-slot="sticky-grid-scroll-description"
              style={{ opacity: copyOpacity }}
              aria-hidden={copyInteractive ? undefined : true}
            >
              {description}
            </motion.p>
          ) : null}
          {action ? (
            <motion.div
              data-slot="sticky-grid-scroll-action"
              style={{
                opacity: copyOpacity,
                pointerEvents: copyInteractive ? "auto" : "none",
              }}
              inert={!copyInteractive}
            >
              {action}
            </motion.div>
          ) : null}
        </div>
        <div data-slot="sticky-grid-scroll-gallery">
          <ul
            ref={grid}
            data-slot="sticky-grid-scroll-grid"
            style={
              reduceMotion ? { transform: "scale(2.05, 2.05)" } : undefined
            }
          >
            {images.map((image, i) => (
              <li
                key={`${image.src}-${i}`}
                ref={(el) => {
                  items.current[i] = el;
                }}
                data-slot="sticky-grid-scroll-item"
                style={
                  reduceMotion
                    ? { transform: reducedTransform(i, columns, images.length) }
                    : undefined
                }
              >
                <img src={image.src} alt={image.alt ?? ""} draggable={false} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/**
 * Under reduced motion: the timeline's end, with no scroll-driven motion. The
 * side columns' direction follows `--sticky-grid-scroll-side` (-1 in
 * right-to-left), so the server render mirrors too.
 */
function reducedTransform(i: number, columns: number, count: number) {
  const { x, yPercent } = itemState(i, columns, count, TOTAL, 1, 1);
  return `translate(calc(${x}% * var(--sticky-grid-scroll-side, 1)), ${yPercent}%)`;
}

const MotionHeading = React.forwardRef<
  HTMLHeadingElement,
  {
    as: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
    opacity: MotionValue<number>;
    transform?: MotionValue<string>;
    children: React.ReactNode;
  }
>(function MotionHeading({ as, opacity, transform, children }, ref) {
  const Component = motion[as];
  return (
    <Component
      ref={ref}
      data-slot="sticky-grid-scroll-title"
      style={{ opacity, transform }}
    >
      {children}
    </Component>
  );
});

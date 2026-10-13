"use client";

import * as React from "react";
import { useRenderLoop } from "@/lib/render-loop";
import { cn } from "@/lib/utils";
import {
  createViscoseCarouselEngine,
  type ViscoseCarouselEngine,
  type ViscoseCarouselItem,
  type ViscoseCarouselParams,
  type ViscoseMetaGroup,
} from "./viscose-carousel-engine";

/*
 * Ported from Yousuf-developer/Viscose-carousel (components/Carousel.jsx, the
 * markup around the canvas and app/globals.css), at commit
 * f91a6de57019b7dcc58c28a2ea83f5a6dd9f3882:
 * https://github.com/Yousuf-developer/Viscose-carousel.
 *
 * Copyright (c) 2026 Yousuf Soomro. MIT License; the full notice ends this
 * file.
 */

export type {
  ViscoseCarouselItem,
  ViscoseCarouselParams,
} from "./viscose-carousel-engine";
export {
  VISCOSE_THEMES,
  viscoseCarouselDefaults,
} from "./viscose-carousel-engine";

/** The most cards one ring carries (the shader's thread budget). */
export const VISCOSE_CAROUSEL_MAX_ITEMS = 18;

export interface ViscoseCarouselProps
  extends Omit<React.ComponentProps<"section">, "children" | "onChange"> {
  /** The cards, in ring order: 3 to 18 of them. */
  items: ViscoseCarouselItem[];
  /** The room: dark paper and bone ink (default), or light paper. */
  theme?: "dark" | "light";
  /** The intro heading drawn as the ring forms. Default "Works '26". */
  heading?: string;
  /** The word the cursor's drop shows over a card. Default "View". */
  cursorLabel?: string;
  /** Any of upstream's tunables (geometry, timing, goo, glass, bead...). */
  params?: Partial<ViscoseCarouselParams>;
  /** A card was opened: clicked at the front, turned to by a click, or Enter. */
  onOpen?: (item: ViscoseCarouselItem, index: number) => void;
  /** The card at the front changed. */
  onActiveChange?: (index: number) => void;
  /** The accessible name of the carousel. Default "Projects". */
  label?: string;
  /** Device pixel ratio cap. Default 2. */
  maxDpr?: number;
  /** Replaces the static picture shown before WebGL, without it and under reduced motion. */
  fallback?: React.ReactNode;
}

// The film over everything: one tile of fractal noise, desaturated.
const GRAIN = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>")`;

// The room, under the work: the vignette over the glow over the paper, in
// one element, dithered against a tile of the paper (see upstream's .room).
const glow = (k: string) =>
  `color-mix(in oklab, var(--viscose-carousel-glow) calc(${k} * var(--viscose-carousel-k)), transparent)`;
const vig = (k: string) =>
  `color-mix(in srgb, #000 calc(${k} * var(--viscose-carousel-vig, 0)), transparent)`;
const ROOM: React.CSSProperties = {
  ["--viscose-carousel-k" as string]:
    "calc(var(--viscose-carousel-glow-a, 0) * var(--viscose-carousel-glow-on, 0))",
  background: [
    `radial-gradient(ellipse farthest-corner at 50% 50%, transparent 45%, ${vig("8%")} 60%, ${vig("22%")} 75%, ${vig("38%")} 88%, ${vig("50%")} 100%)`,
    `radial-gradient(var(--viscose-carousel-glow-w, 64vw) var(--viscose-carousel-glow-h, 45vw) at var(--viscose-carousel-glow-x, 50%) var(--viscose-carousel-glow-y, 50%), ${glow("100%")} 0%, ${glow("86%")} 12%, ${glow("62%")} 25%, ${glow("38%")} 38%, ${glow("20%")} 50%, ${glow("9%")} 62%, ${glow("3.5%")} 75%, ${glow("1%")} 88%, transparent 100%)`,
    "var(--viscose-carousel-dither, none) 0 0 / 64px 64px",
  ].join(", "),
  transition: "--viscose-carousel-glow 1.6s ease",
};

// The glow's colour is a registered property, so a change of card fades.
function registerGlow() {
  if (typeof CSS === "undefined" || !("registerProperty" in CSS)) {
    return;
  }
  try {
    CSS.registerProperty({
      name: "--viscose-carousel-glow",
      syntax: "<color>",
      inherits: true,
      initialValue: "#0e0e0d",
    });
  } catch {
    // Already registered by another carousel on the page.
  }
}

function emptyGroup(): ViscoseMetaGroup {
  return { box: null, goo: null, layers: [], plain: null };
}

/** Three rows per side: two melting inside the filter, one steady outside. */
function MetaGroup({
  group,
  justify,
}: {
  group: ViscoseMetaGroup;
  justify: "flex-start" | "flex-end";
}) {
  const row = (
    <span className="flex items-baseline whitespace-nowrap">
      <span />
      <span />
    </span>
  );
  return (
    <div
      ref={(el) => {
        group.box = el;
      }}
      aria-hidden="true"
      className="pointer-events-none absolute top-1/2 z-10 -translate-y-1/2 tracking-[-0.01em] text-(--viscose-carousel-ink)"
    >
      <span
        ref={(el) => {
          group.goo = el;
        }}
        className="absolute inset-0"
        style={{ willChange: "filter" }}
      >
        {[0, 1].map((i) => (
          <span
            key={i}
            ref={(el) => {
              group.layers[i] = el;
            }}
            className="absolute inset-0 flex items-center"
            style={{ justifyContent: justify }}
          >
            {row}
          </span>
        ))}
      </span>
      <span
        ref={(el) => {
          group.plain = el;
        }}
        className="absolute inset-0 flex items-center"
        style={{ justifyContent: justify }}
      >
        {row}
      </span>
    </div>
  );
}

/**
 * The still: the resting arc at the reference window, the front card in the
 * middle with its neighbours bending away through the glass, and its name
 * set large over it. Inline SVG and CSS only, so it is also the
 * server-rendered first paint.
 */
function ViscoseFallback({
  items,
  index,
  clipId,
}: {
  items: ViscoseCarouselItem[];
  index: number;
  clipId: string;
}) {
  const n = items.length;
  // The ring at rest on a 1512 x 870 window: centre 1512 px left of the
  // middle, radius 1516, cards 401 x 267, one slot every 360 / n degrees.
  const R = 1516;
  const W = 401;
  const H = W / 1.5;
  const step = (Math.PI * 2) / Math.max(3, n);
  const cards = [-2, -1, 0, 1, 2].map((slot) => {
    const angle = slot * step;
    const at = (((index - slot) % n) + n) % n;
    return {
      key: slot,
      item: items[at],
      x: -1512 + Math.cos(angle) * R,
      y: -Math.sin(angle) * R,
      deg: (-angle * 180) / Math.PI,
    };
  });
  const front = items[index];
  return (
    <div className="absolute inset-0 overflow-hidden bg-(--viscose-carousel-paper)">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 50%, color-mix(in oklab, var(--viscose-carousel-ink) 7%, transparent), transparent 70%), radial-gradient(ellipse farthest-corner at 50% 50%, transparent 45%, rgb(0 0 0 / 0.3) 100%)",
        }}
      />
      <svg
        className="absolute inset-0 size-full"
        viewBox="-300 -435 600 870"
        preserveAspectRatio="xMidYMid meet"
        overflow="visible"
        aria-hidden="true"
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={-W / 2} y={-H / 2} width={W} height={H} rx={27} />
          </clipPath>
        </defs>
        {cards.map((card) =>
          card.item ? (
            <g
              key={card.key}
              transform={`translate(${card.x.toFixed(1)} ${card.y.toFixed(1)}) rotate(${(card.deg + 90).toFixed(2)})`}
            >
              <g transform="rotate(-90)">
                <rect
                  x={-W / 2}
                  y={-H / 2}
                  width={W}
                  height={H}
                  rx={27}
                  fill="var(--viscose-carousel-ink)"
                  opacity={0.12}
                />
                <image
                  href={card.item.image}
                  x={-W / 2}
                  y={-H / 2}
                  width={W}
                  height={H}
                  preserveAspectRatio="xMidYMid slice"
                  clipPath={`url(#${clipId})`}
                  opacity={card.key === 0 ? 1 : 0.85}
                />
              </g>
            </g>
          ) : null,
        )}
      </svg>
      {front ? (
        <p className="absolute inset-x-0 top-[12%] m-0 truncate px-[5.5%] text-center text-(--viscose-carousel-ink) text-[clamp(2.5rem,13vw,11rem)] leading-none tracking-[-0.03em]">
          {front.title}
        </p>
      ) : null}
    </div>
  );
}

/** One ring: its engine is built once, from the props it mounts with. */
function ViscoseCarouselRing({
  items: itemsProp,
  theme = "dark",
  heading,
  cursorLabel,
  params,
  onOpen,
  onActiveChange,
  label = "Projects",
  maxDpr = 2,
  fallback,
  className,
  style,
  ...props
}: ViscoseCarouselProps) {
  const items = React.useMemo(
    () => itemsProp.slice(0, VISCOSE_CAROUSEL_MAX_ITEMS),
    [itemsProp],
  );
  const id = React.useId().replace(/:/g, "");
  const filterId = `viscose-carousel-goo-${id}`;
  const rootRef = React.useRef<HTMLElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const glowRef = React.useRef<HTMLDivElement>(null);
  const grainRef = React.useRef<HTMLDivElement>(null);
  const countRef = React.useRef<HTMLDivElement>(null);
  const loaderRef = React.useRef<HTMLDivElement>(null);
  const liveRef = React.useRef<HTMLDivElement>(null);
  const cutRef = React.useRef<SVGFEColorMatrixElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);
  const listItems = React.useRef<(HTMLElement | null)[]>([]);
  const meta = React.useRef({ left: emptyGroup(), right: emptyGroup() });
  const [active, setActive] = React.useState(0);

  const latest = React.useRef({ items, onOpen, onActiveChange });
  latest.current = { items, onOpen, onActiveChange };

  const merged = React.useMemo(
    () => ({
      theme,
      ...(heading === undefined ? {} : { text: heading }),
      ...(cursorLabel === undefined ? {} : { tagText: cursorLabel }),
      ...params,
    }),
    [theme, heading, cursorLabel, params],
  );
  const config = React.useRef(merged);
  config.current = merged;

  const { status, handle } = useRenderLoop<ViscoseCarouselEngine>(canvasRef, {
    context: "webgl2",
    // What three.js requests for upstream's { antialias: true, alpha: true }.
    contextAttributes: {
      alpha: true,
      depth: true,
      stencil: false,
      antialias: true,
      premultipliedAlpha: true,
      preserveDrawingBuffer: false,
      powerPreference: "default",
      failIfMajorPerformanceCaveat: false,
    },
    maxDpr,
    setup: (canvas, context) => {
      registerGlow();
      const root = rootRef.current;
      if (!root) {
        throw new Error("viscose-carousel: not mounted");
      }
      return createViscoseCarouselEngine({
        canvas,
        context: context as WebGL2RenderingContext,
        items: latest.current.items,
        params: config.current,
        filterId,
        dpr: Math.max(1, Math.min(window.devicePixelRatio || 1, maxDpr)),
        elements: {
          root,
          glow: glowRef.current,
          grain: grainRef.current,
          count: countRef.current,
          loader: loaderRef.current,
          live: liveRef.current,
          cut: cutRef.current,
          list: listRef.current,
          listItems: listItems.current,
          meta: meta.current,
        },
        onOpen: (index) => {
          const { items: list, onOpen: open } = latest.current;
          const item = list[index];
          if (item) open?.(item, index);
        },
        onFront: (index) => {
          setActive(index);
          latest.current.onActiveChange?.(index);
        },
      });
    },
    resize: (engine, size) => engine.resize(size.width, size.height, size.dpr),
    render: (engine) => engine.frame(),
    dispose: (engine) => engine.dispose(),
  });

  const ready = status === "ready";
  const n = items.length;

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const engine = ready ? handle.current : null;
    const move = (to: number) => {
      if (engine) {
        engine.goTo(((to % n) + n) % n);
      } else {
        const next = ((to % n) + n) % n;
        setActive(next);
        onActiveChange?.(next);
      }
    };
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        if (engine) engine.step(1);
        else move(active + 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        if (engine) engine.step(-1);
        else move(active - 1);
        break;
      case "Home":
        event.preventDefault();
        move(0);
        break;
      case "End":
        event.preventDefault();
        move(n - 1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        if (engine) engine.activate();
        else if (items[active]) onOpen?.(items[active], active);
        break;
    }
  };

  const optionId = (i: number) => `${id}-option-${i}`;

  return (
    <section
      ref={rootRef}
      data-slot="viscose-carousel"
      data-status={status}
      aria-roledescription="carousel"
      aria-label={label}
      className={cn(
        "relative isolate overflow-hidden bg-(--viscose-carousel-paper) text-(--viscose-carousel-ink)",
        className,
      )}
      style={
        {
          "--viscose-carousel-paper": theme === "light" ? "#f2efe9" : "#0e0e0d",
          "--viscose-carousel-ink": theme === "light" ? "#16140f" : "#efece6",
          "--viscose-carousel-ink-2":
            "color-mix(in srgb, var(--viscose-carousel-ink) 55%, transparent)",
          ...style,
        } as React.CSSProperties
      }
      {...props}
    >
      <div
        ref={glowRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-20"
        style={ROOM}
      />

      {/* The ring: a listbox for the keyboard and screen readers, the canvas
          for everyone else. touch-none, or the browser claims the swipe. */}
      <div
        role="listbox"
        tabIndex={0}
        aria-label={label}
        aria-activedescendant={n ? optionId(active) : undefined}
        aria-describedby={`${id}-hint`}
        onKeyDown={onKeyDown}
        className="absolute inset-0 touch-none outline-none focus-visible:outline-2 focus-visible:outline-(--viscose-carousel-ink) focus-visible:-outline-offset-4"
      >
        {/* The engine listens for pointer input on the canvas itself. It has
            no content of its own, so it needs no aria-hidden: the options
            carry the projects. */}
        <canvas
          ref={canvasRef}
          data-slot="viscose-carousel-canvas"
          className={cn(
            "absolute inset-0 block size-full",
            // Laid out while a lost context waits to be restored, or the
            // loop's IntersectionObserver would never let it draw again.
            (status === "unsupported" || status === "reduced-motion") &&
              "hidden",
          )}
        />
        {items.map((item, i) => (
          // biome-ignore lint/a11y/useKeyWithClickEvents: the listbox handles keys
          <div
            key={`${item.title}-${i}`}
            id={optionId(i)}
            role="option"
            tabIndex={-1}
            aria-selected={i === active}
            className="sr-only"
            onClick={() => {
              const engine = ready ? handle.current : null;
              if (engine) engine.goTo(i);
              else setActive(i);
            }}
          >
            {[item.title, item.discipline, item.year]
              .filter(Boolean)
              .join(", ")}
          </div>
        ))}
      </div>
      <p id={`${id}-hint`} className="sr-only">
        Arrow keys turn the ring, Enter opens the card at the front.
      </p>

      {/* 01 / 18, over the discipline beside the card. */}
      <div
        ref={countRef}
        aria-hidden="true"
        className="pointer-events-none absolute z-10 -translate-y-1/2 text-(--viscose-carousel-ink) tracking-[-0.01em] opacity-0"
      />

      {/* Film over everything: grain, pointer-transparent. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-30"
      >
        <div
          ref={grainRef}
          className="absolute inset-0 opacity-0 mix-blend-soft-light"
          style={{ backgroundImage: GRAIN, backgroundSize: "160px 160px" }}
        />
      </div>

      {/* The index column; the listbox above is what assistive tech reads. */}
      <ul
        ref={listRef}
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 z-10 m-0 flex -translate-y-1/2 list-none flex-col items-end p-0 text-right text-(--viscose-carousel-ink) leading-[1.4] tracking-[0.01em] opacity-0"
      >
        {items.map((item, i) => (
          <li
            key={`${item.title}-${i}`}
            ref={(el) => {
              listItems.current[i] = el;
            }}
            style={{ opacity: 0.2 }}
          >
            {item.title}
          </li>
        ))}
      </ul>

      <MetaGroup group={meta.current.left} justify="flex-start" />
      <MetaGroup group={meta.current.right} justify="flex-end" />

      {/* 001 to 100. Holds the entry at the seed until it gets there. */}
      <div
        ref={loaderRef}
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 z-10 -translate-x-1/2 text-(--viscose-carousel-ink) tracking-[-0.01em]"
      />

      <div ref={liveRef} aria-live="polite" className="sr-only" />

      {/* Alpha multiplied up hard and biased down: two blurred words fuse. */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute h-0 w-0"
        focusable="false"
      >
        <defs>
          <filter
            id={filterId}
            x="-20%"
            y="-100%"
            width="140%"
            height="300%"
            colorInterpolationFilters="sRGB"
          >
            <feColorMatrix
              ref={cutRef}
              in="SourceGraphic"
              type="matrix"
              values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 255 -140"
            />
          </filter>
        </defs>
      </svg>

      <div
        data-slot="viscose-carousel-fallback"
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0 z-40 transition-opacity duration-300 motion-reduce:transition-none",
          ready ? "opacity-0" : "opacity-100",
        )}
      >
        {fallback ?? (
          <ViscoseFallback
            items={items}
            index={Math.min(active, Math.max(0, n - 1))}
            clipId={`${id}-card`}
          />
        )}
      </div>
    </section>
  );
}

/**
 * A ring of project cards drawn as one WebGL fragment shader: the cards are
 * signed distance fields that melt into each other and string threads of
 * honey as they pull apart. Scroll, drag, swipe or use the arrow keys to turn
 * it; it snaps a card to the front, and a click or Enter opens it. New items,
 * theme or params rebuild the ring.
 */
export function ViscoseCarousel(props: ViscoseCarouselProps) {
  const { items, theme, heading, cursorLabel, params } = props;
  const key = React.useMemo(
    () =>
      JSON.stringify([
        items.map((item) => [
          item.title,
          item.image,
          item.discipline,
          item.year,
        ]),
        theme,
        heading,
        cursorLabel,
        params,
      ]),
    [items, theme, heading, cursorLabel, params],
  );
  return <ViscoseCarouselRing key={key} {...props} />;
}

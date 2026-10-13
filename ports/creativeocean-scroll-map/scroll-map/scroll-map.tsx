"use client";

import { useMotionValueEvent, useScroll } from "motion/react";
import * as React from "react";

import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { composeRefs } from "@/lib/compose-refs";
import { cn } from "@/lib/utils";
import { ScrollMapArt } from "./scroll-map-art";
import {
  createScrollMapEngine,
  type ScrollMapEngine,
} from "./scroll-map-motion";
import { ScrollMapStyles } from "./scroll-map-styles";

// Ported from the CodePen "Scroll Map, Split-Screen & Expandable" by Tom Miller
// (creativeocean), pinned by the snapshot in upstream/debug.html.

/** The pen's route, in the 1500 x 1500 space of the map. */
export const SCROLL_MAP_ROUTE =
  "m741.6 937 18-52 2-28 1.7-25-25.7 3.7-1-24-41 8.3-36.7 4.4-51.3 5.3 10.3 19.7 2.7 26.3 98.7-13.2-3-35";

export interface ScrollMapProps
  extends Omit<React.ComponentProps<"div">, "children"> {
  /** The text beside the map: headings, paragraphs and a `.shaded` callout are styled like the pen's. */
  children?: React.ReactNode;
  /** The route, as an SVG path (`d`) in the map's space. */
  route?: string;
  /** What lies under the route, in the map's space: a generated street map by default. */
  art?: React.ReactNode;
  /** The side of the map's square viewBox. */
  size?: number;
  /** The zoom at the start and at its deepest, half way along the route. */
  zoom?: [number, number];
  /** Seconds the drawing takes to catch up with the scroll; 0 follows it directly. */
  scrub?: number;
  /** The closed width of the map, in percent of the box. */
  split?: number;
  /** The scrolling element the map follows; the window by default. Give it `position: relative`. */
  container?: React.RefObject<HTMLElement | null>;
  /** The accessible name of the map. */
  label?: string;
  /** What the map shows, read after its name. */
  description?: string;
  /** The text of the button that opens the map. */
  expandLabel?: React.ReactNode;
  /** The accessible name of the button that closes it. */
  closeLabel?: string;
  /** Glyph before the expand text. */
  expandIcon?: React.ReactNode;
  /** Glyph of the close button. */
  closeIcon?: React.ReactNode;
  /** Whether the map is open (full width). */
  expanded?: boolean;
  /** Whether the map starts open, when uncontrolled. */
  defaultExpanded?: boolean;
  /** Called when the map opens or closes. */
  onExpandedChange?: (expanded: boolean) => void;
}

const SIZE = 1500;

/** The first point of a path, for the picture before the first frame. */
function startOf(route: string): [number, number] {
  const match = /^\s*[Mm]\s*(-?[\d.]+)[\s,]*(-?[\d.]+)/.exec(route);
  return match ? [Number(match[1]), Number(match[2])] : [0, 0];
}

function ExpandGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14 3h7v7h-2V6.4l-5.3 5.3-1.4-1.4L17.6 5H14zM3 14h2v3.6l5.3-5.3 1.4 1.4L6.4 19H10v2H3z" />
    </svg>
  );
}

function CloseGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.3 2.3l1.4 1.4L16.4 9H20v2h-7V4h2v3.6zM4 13h7v7H9v-3.6l-5.3 5.3-1.4-1.4L7.6 15H4z" />
    </svg>
  );
}

/**
 * A map beside the text that draws a route as the page scrolls: the route is
 * drawn, a dot rides its end and the camera follows it, zooming in and back
 * out. A button opens the map to full width. Motion rewrites the pen's GSAP.
 */
export function ScrollMap({
  children,
  route = SCROLL_MAP_ROUTE,
  art,
  size = SIZE,
  zoom = [2, 4],
  scrub = 1,
  split = 50,
  container,
  label = "Route map",
  description = "A street map. A route is drawn from its start to its end as the page scrolls, and the map zooms in and back out along it.",
  expandLabel = "Expand map",
  closeLabel = "Close map",
  expandIcon,
  closeIcon,
  expanded: expandedProp,
  defaultExpanded = false,
  onExpandedChange,
  className,
  style,
  ref,
  ...props
}: ScrollMapProps) {
  const reduced = useReducedMotion();
  const id = React.useId();
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const railRef = React.useRef<HTMLDivElement | null>(null);
  const povRef = React.useRef<SVGGElement | null>(null);
  const cameraRef = React.useRef<SVGGElement | null>(null);
  const routeRef = React.useRef<SVGPathElement | null>(null);
  const dotRef = React.useRef<SVGCircleElement | null>(null);
  const closeRef = React.useRef<HTMLButtonElement | null>(null);
  const expandRef = React.useRef<HTMLButtonElement | null>(null);
  const engineRef = React.useRef<ScrollMapEngine | null>(null);

  const controlled = expandedProp !== undefined;
  const [inner, setInner] = React.useState(defaultExpanded);
  const expanded = controlled ? expandedProp : inner;
  const expandedRef = React.useRef(expanded);
  expandedRef.current = expanded;
  const instant = React.useRef(false);
  const change = React.useRef(onExpandedChange);
  change.current = onExpandedChange;

  const setExpanded = React.useCallback(
    (next: boolean) => {
      if (!controlled) {
        setInner(next);
      }
      change.current?.(next);
    },
    [controlled],
  );

  // ---- scrolling ----------------------------------------------------------
  // The pen's ScrollTrigger: start "0 0" (the section's top at the top of the
  // viewport), end "100% 100%" (its bottom at the bottom of the viewport).
  const { scrollYProgress } = useScroll({
    container,
    target: rootRef,
    offset: ["start start", "end end"],
  });
  useMotionValueEvent(scrollYProgress, "change", (value) => {
    if (!reduced) {
      engineRef.current?.setScroll(value);
    }
  });

  // Locking the page (or the container) while the map is open.
  const lock = React.useRef<{ element: HTMLElement; overflow: string } | null>(
    null,
  );
  const lockScroll = React.useCallback(
    (locked: boolean) => {
      if (locked && !lock.current) {
        const element = container?.current ?? document.body;
        lock.current = { element, overflow: element.style.overflow };
        element.style.overflow = "hidden";
      } else if (!locked && lock.current) {
        lock.current.element.style.overflow = lock.current.overflow;
        lock.current = null;
      }
    },
    [container],
  );

  // ---- the engine -----------------------------------------------------------
  const zoomFrom = zoom[0];
  const zoomTo = zoom[1];
  // biome-ignore lint/correctness/useExhaustiveDependencies: the engine is rebuilt when the route or the numbers change, not on every progress value
  React.useLayoutEffect(() => {
    const pov = povRef.current;
    const camera = cameraRef.current;
    const path = routeRef.current;
    const dot = dotRef.current;
    const rail = railRef.current;
    const close = closeRef.current;
    if (!(pov && camera && path && dot && rail && close)) {
      return;
    }
    const engine = createScrollMapEngine({
      pov,
      camera,
      route: path,
      dot,
      pane: rail,
      close,
      size,
      zoom: [zoomFrom, zoomTo],
      scrub,
      split,
      lockScroll,
    });
    engineRef.current = engine;
    // Reduced motion: the whole route, drawn, and no scrubbed motion.
    engine.jump(reduced ? 1 : scrollYProgress.get());
    if (expandedRef.current) {
      engine.setOpen(true, false);
    }
    return () => {
      engine.dispose();
      if (engineRef.current === engine) {
        engineRef.current = null;
      }
      lockScroll(false);
    };
  }, [route, size, zoomFrom, zoomTo, scrub, split, reduced, lockScroll]);

  // Opening and closing the map. React's development double run of an effect
  // changes nothing: only a real change of `expanded` acts.
  const shown = React.useRef(expanded);
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs on a change of `expanded` only
  React.useEffect(() => {
    if (shown.current === expanded) {
      return;
    }
    shown.current = expanded;
    const animate = !(reduced || instant.current);
    instant.current = false;
    engineRef.current?.setOpen(expanded, animate);
    const active = document.activeElement;
    const root = rootRef.current;
    if (expanded) {
      closeRef.current?.focus({ preventScroll: true });
    } else if (
      root &&
      active instanceof HTMLElement &&
      (active === document.body || root.contains(active))
    ) {
      expandRef.current?.focus({ preventScroll: true });
    }
  }, [expanded]);

  // Escape closes the open map.
  React.useEffect(() => {
    if (!expanded) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setExpanded(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [expanded, setExpanded]);

  // The pen closed the map when the window was resized.
  React.useEffect(() => {
    const root = rootRef.current;
    if (!(root && typeof ResizeObserver !== "undefined")) {
      return;
    }
    let width = -1;
    let height = -1;
    const observer = new ResizeObserver(() => {
      const nextWidth = root.clientWidth;
      const nextHeight = container?.current?.clientHeight ?? window.innerHeight;
      if (container?.current) {
        root.style.setProperty("--scroll-map-viewport", `${nextHeight}px`);
      }
      const changed =
        width !== -1 && (nextWidth !== width || nextHeight !== height);
      width = nextWidth;
      height = nextHeight;
      if (changed && expandedRef.current) {
        instant.current = true;
        setExpanded(false);
      }
    });
    observer.observe(root);
    if (container?.current) {
      observer.observe(container.current);
    }
    return () => {
      observer.disconnect();
      root.style.removeProperty("--scroll-map-viewport");
    };
  }, [container, setExpanded]);

  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;
  const [startX, startY] = startOf(route);

  return (
    <div
      data-slot="scroll-map"
      data-expanded={expanded ? "" : undefined}
      data-scroller={container ? "container" : undefined}
      className={cn("scroll-map", className)}
      style={{ "--scroll-map-split": split, ...style } as React.CSSProperties}
      ref={composeRefs(rootRef, ref)}
      {...props}
    >
      <ScrollMapStyles />
      <div data-slot="scroll-map-rail" ref={railRef}>
        <div data-slot="scroll-map-pane">
          <svg
            data-slot="scroll-map-svg"
            viewBox={`0 0 ${size} ${size}`}
            preserveAspectRatio="xMidYMid slice"
            fill="none"
            role="img"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
          >
            <title id={titleId}>{label}</title>
            <desc id={descriptionId}>{description}</desc>
            <g
              data-slot="scroll-map-pov"
              ref={povRef}
              transform={`matrix(${zoomFrom},0,0,${zoomFrom},${size / 2},${size / 2})`}
            >
              <g
                data-slot="scroll-map-camera"
                ref={cameraRef}
                transform={`matrix(1,0,0,1,${-startX},${-startY})`}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ stroke: "var(--scroll-map-route, #223e6b)" }}
              >
                {art ?? <ScrollMapArt />}
                <path
                  data-slot="scroll-map-route"
                  ref={routeRef}
                  strokeWidth="4"
                  d={route}
                  style={{ strokeDasharray: "0.001px, 100000px" }}
                />
                <circle
                  data-slot="scroll-map-start"
                  r="4"
                  strokeWidth="2.4"
                  cx={startX}
                  cy={startY}
                  style={{ fill: "var(--scroll-map-dot, #fff)" }}
                />
                <circle
                  data-slot="scroll-map-dot"
                  ref={dotRef}
                  r="4"
                  strokeWidth="2.4"
                  transform={`matrix(1,0,0,1,${startX},${startY})`}
                  style={{ fill: "var(--scroll-map-dot, #fff)" }}
                />
              </g>
            </g>
          </svg>
          <button
            type="button"
            data-slot="scroll-map-close"
            ref={closeRef}
            aria-label={closeLabel}
            onClick={() => setExpanded(false)}
          >
            {closeIcon ?? <CloseGlyph />}
          </button>
        </div>
      </div>
      <div data-slot="scroll-map-content" inert={expanded}>
        {children}
        <br />
        <button
          type="button"
          data-slot="scroll-map-expand"
          ref={expandRef}
          aria-expanded={expanded}
          onClick={() => setExpanded(true)}
        >
          {expandIcon ?? <ExpandGlyph />} {expandLabel}
        </button>
      </div>
    </div>
  );
}

"use client";

import React, { type ReactNode, useLayoutEffect, useState, type RefObject, useCallback } from "react";

// ---- upstream: src/types.ts ----
/**
 * Represents a measured rectangle of a traced DOM element,
 * positioned relative to the Master Shimmer container.
 */
export interface ShimmerRect {
  x: number;
  y: number;
  width: number;
  height: number;
  borderRadius: string;
}

/** Available animation types for the shimmer effect. */
export type AnimationType =
  | 'wave'
  | 'pulse'
  | 'shine'
  | 'glow'
  | 'gradient';

/** Configuration options for the shimmer effect (all optional). */
export interface ShimmerConfig {
  /** Animation style. Defaults to 'wave'. */
  animation?: AnimationType;
  /** Base color of the shimmer blocks. Defaults to '#e0e0e0'. */
  baseColor?: string;
  /** Highlight color of the shimmer animation. Defaults to '#f5f5f5'. */
  highlightColor?: string;
  /** Animation duration in seconds. Defaults to 1.5. */
  speed?: number;
  /** Global border-radius override. If omitted, auto-detected from each element (defaults to 4px if detection is 0px). */
  borderRadius?: string;
  /**
   * Keep container backgrounds, borders, and padding visible while loading.
   * When `true` (default), only text and media leaves are hidden via
   * `color:transparent` / `opacity:0` so card backgrounds, borders, and
   * spacing remain visible underneath the shimmer overlay.
   *
   * Set `false` for legacy behavior (`visibility:hidden` on whole tree).
   */
  preserveBackground?: boolean;
}

/** Props for the Shimmer component. */
export interface ShimmerProps extends ShimmerConfig {
  /** Whether the loading state is active. */
  loading?: boolean;
  /** The children to trace and render shimmer over. */
  children: ReactNode;
  /**
   * Number of placeholder clones to generate for list-like loading states.
   *
   * When `loading=true` and `dummyLength` is set, Shimmer grabs the first
   * available child (or a cached template from the last loaded render) and
   * clones it `dummyLength` times to produce skeleton placeholders.
   *
   * When `loading=false`, children are rendered as-is.
   */
  dummyLength?: number;
  /**
   * Props injected into each child element while `loading=true` so the
   * skeleton renders with realistic shape without requiring real data.
   *
   * Example:
   * ```tsx
   * <Shimmer
   *   loading={loading}
   *   dummyData={{ user: { name: 'Loading...', role: '...', avatar: '' } }}
   * >
   *   <UserCard user={user} />
   * </Shimmer>
   * ```
   *
   * While loading, each direct child is cloned with these props merged on top
   * of its own props. Ignored when `loading=false`.
   */
  dummyData?: Record<string, any>;
  /**
   * Component used to auto-generate skeleton elements while `loading=true`.
   *
   * When set, Shimmer ignores `children` during loading and renders
   * `dummyLength` (defaults to 1) instances of `<as {...dummyData} />`
   * to derive shape. Real children render once `loading=false`.
   *
   * ```tsx
   * <Shimmer
   *   loading={loading}
   *   as={MovieCard}
   *   dummyData={{ movie: movieTemplate }}
   *   dummyLength={10}
   * >
   *   {movies.map((m) => <MovieCard movie={m} key={m.id} />)}
   * </Shimmer>
   * ```
   */
  as?: React.ComponentType<any>;
  /** Force this Shimmer to be a Master renderer even if nested inside another Shimmer. */
  stopPropagation?: boolean;
  /**
   * Labs: what screen readers announce while loading, from a polite live
   * region next to the (aria-hidden) container. Defaults to "Loading content".
   */
  loadingLabel?: string;
  /**
   * className applied to the Master container div.
   * Use to control layout (e.g. display:flex) without losing position:relative.
   */
  className?: string;
  /**
   * Inline styles merged into the Master container div.
   * position:relative is always applied; everything else is overridable.
   */
  style?: React.CSSProperties;
}

/** Default configuration values. */
export const DEFAULTS: Required<ShimmerConfig> = {
  animation: 'wave',
  baseColor: '#e0e0e0',
  highlightColor: '#f5f5f5',
  speed: 1.5,
  borderRadius: '',
  preserveBackground: true,
};

// ---- upstream: src/utils.ts ----
/**
 * Generates a deterministic key for cloned elements.
 *
 * Prefix already includes the parent Shimmer's `useId()` plus a positional
 * index from the caller, so it is unique per render slot and stable across
 * SSR + client hydration. No module-scope counter — that caused hydration
 * mismatches and forced React to remount cloned children every render.
 */
export function generateShimmerKey(prefix: string = 'shimmer'): string {
  return prefix;
}

/**
 * Default fallback dimensions for common elements when their
 * measured dimensions are 0px (e.g., empty inputs, images not yet loaded).
 */
export const FALLBACK_DIMENSIONS: Record<string, { width: number; height: number }> = {
  INPUT: { width: 200, height: 36 },
  BUTTON: { width: 120, height: 36 },
  TEXTAREA: { width: 300, height: 80 },
  SELECT: { width: 200, height: 36 },
  IMG: { width: 100, height: 100 },
  H1: { width: 300, height: 36 },
  H2: { width: 260, height: 30 },
  H3: { width: 220, height: 26 },
  H4: { width: 200, height: 22 },
  H5: { width: 180, height: 20 },
  H6: { width: 160, height: 18 },
  P: { width: 250, height: 16 },
  SPAN: { width: 100, height: 16 },
};

// ---- upstream: src/styles.ts ----
// The stylesheet ships as a string that the master Shimmer renders as
// <style href precedence> (React 19 hoists it into <head> once, on the server
// too), instead of upstream's injectStyles() into document.head. Keyframes
// carry the component name.
export const SHIMMER_TRACE_CSS = `
@keyframes shimmer-trace-wave {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

@keyframes shimmer-trace-pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}

@keyframes shimmer-trace-shine {
  0% { transform: translateX(-150%) skewX(-20deg); }
  100% { transform: translateX(150%) skewX(-20deg); }
}

@keyframes shimmer-trace-glow {
  0%, 100% { filter: brightness(1); }
  50% { filter: brightness(1.35); }
}

@keyframes shimmer-trace-gradient {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

/* preserveBackground mode: hide text + media but keep container styles */
[data-shimmer-master][data-shimmer-preserve-bg="true"] :is(h1,h2,h3,h4,h5,h6,p,span,a,li,label,td,th,blockquote,code,pre,strong,em,small) {
  color: transparent !important;
  text-shadow: none !important;
}
[data-shimmer-master][data-shimmer-preserve-bg="true"] :is(img,video,svg,canvas,picture) {
  opacity: 0 !important;
}
[data-shimmer-master][data-shimmer-preserve-bg="true"] :is(input,textarea,select,button) {
  color: transparent !important;
  opacity: 0 !important;
}
[data-shimmer-master][data-shimmer-preserve-bg="true"] {
  pointer-events: none !important;
  user-select: none !important;
}

/* Labs: in right-to-left pages the sweep runs in the reading direction. */
[data-shimmer-sweep]:dir(rtl) {
  scale: -1 1;
}

/* Labs: reduced motion shows static base-colored blocks (no sweep, pulse or glow). */
@media (prefers-reduced-motion: reduce) {
  [data-shimmer-overlay] > div {
    animation: none !important;
    background: var(--shimmer-trace-base-color) !important;
  }
  [data-shimmer-sweep] {
    display: none !important;
  }
}
`;

// ---- upstream: src/useTrace.ts ----
/**
 * Tags that are always considered "traceable" leaf elements
 * whose dimensions should be captured for the shimmer overlay.
 */
const TRACEABLE_TAGS = new Set([
  // Text
  'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'SPAN', 'A', 'LI',
  'LABEL', 'TD', 'TH', 'BLOCKQUOTE', 'CODE', 'PRE',
  // Media
  'IMG', 'VIDEO', 'SVG', 'CANVAS', 'PICTURE',
  // Form
  'INPUT', 'TEXTAREA', 'SELECT', 'BUTTON',
  // Misc
  'HR',
]);

/**
 * Determines if an element should be traced.
 * Explicit data attributes override automatic detection.
 */
function isTraceable(el: Element): boolean {
  if (el.hasAttribute('data-shimmer-ignore')) return false;
  if (el.hasAttribute('data-shimmer')) return true;
  if (TRACEABLE_TAGS.has(el.tagName)) return true;

  // Leaf element with visible dimensions → trace it
  if (el.children.length === 0) {
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  return false;
}

/**
 * Detects elements whose coordinate space cannot follow the Master
 * container during scroll. `position: fixed` and `position: sticky`
 * both live in a different scroll context (viewport / nearest scroll
 * container) than the Master, so any container-relative rect we compute
 * for them becomes stale on the first scroll.
 *
 * Returning `true` here causes the entire subtree under `el` to be
 * skipped, since descendants of a fixed/sticky element inherit the same
 * broken coordinate space.
 */
function isViewportLocked(el: Element): boolean {
  const pos = window.getComputedStyle(el).position;
  return pos === 'fixed' || pos === 'sticky';
}

/**
 * Tracks Master containers we've already warned about, so the
 * console.warn fires once per container instead of on every resize-driven
 * re-trace. WeakSet keeps the dedupe noise-free across container churn —
 * a fresh Master gets one warning, period.
 */
const warnedContainers = new WeakSet<Element>();

interface CollectResult {
  traced: Element[];
  skippedFixed: number;
}

/**
 * Recursively walks the DOM tree and collects all traceable elements.
 *
 * Also reports how many elements were silently skipped because they used
 * `position: fixed` / `position: sticky`. Users can override this skip
 * by adding `data-shimmer` to the element, but the resulting overlay
 * block will drift on scroll — that's their choice to make.
 */
function collectTraceableElements(root: Element): CollectResult {
  const traced: Element[] = [];
  let skippedFixed = 0;

  function walk(el: Element) {
    if (el.hasAttribute('data-shimmer-ignore')) return;
    if (el.hasAttribute('data-shimmer-reporter')) return; // Ignore nested reporters, they report their own rects

    // `data-shimmer` is an explicit opt-in — trust the user and trace.
    // Without it, fixed/sticky elements are skipped entirely (including
    // their descendants, which share the broken coordinate space).
    if (!el.hasAttribute('data-shimmer') && isViewportLocked(el)) {
      skippedFixed += 1;
      return;
    }

    if (isTraceable(el)) {
      traced.push(el);
      return; // Don't recurse into traced elements
    }

    for (let i = 0; i < el.children.length; i++) {
      walk(el.children[i]);
    }
  }

  for (let i = 0; i < root.children.length; i++) {
    walk(root.children[i]);
  }

  return { traced, skippedFixed };
}

/**
 * Measures an element and returns its ShimmerRect relative to the container.
 */
function measureElement(
  el: Element,
  containerRect: DOMRect,
  globalBorderRadius?: string,
): ShimmerRect | null {
  const elRect = el.getBoundingClientRect();

  // If the element is display: none or detached, getBoundingClientRect returns all zeros.
  // We must not trace it, otherwise it ends up at the left edge of the screen.
  if (elRect.width === 0 && elRect.height === 0 && elRect.left === 0 && elRect.top === 0) {
    return null;
  }

  const computedStyle = window.getComputedStyle(el);
  let borderRadius = globalBorderRadius || computedStyle.borderRadius;

  // If the element has no border radius (common for text tags),
  // apply a small default to avoid sharp edges in the shimmer.
  const isZero = !borderRadius || borderRadius === 'none' || borderRadius.split(' ').every(v => v === '0' || v === '0px' || v === '0%');
  if (isZero) {
    borderRadius = '4px';
  }

  let width = elRect.width;
  let height = elRect.height;

  // Apply fallback dimensions if element has 0 size but is actually visible (e.g. empty inline element)
  if (width === 0 || height === 0) {
    const fallback = FALLBACK_DIMENSIONS[el.tagName];
    if (fallback) {
      width = width || fallback.width;
      height = height || fallback.height;
    }
  }

  return {
    x: elRect.left - containerRect.left,
    y: elRect.top - containerRect.top,
    width,
    height,
    borderRadius,
  };
}

/**
 * Performs a full trace of all traceable elements within the container.
 *
 * @param anchorRef - When provided (Reporter mode), elements are measured
 *   relative to this element instead of the container. Allows Reporter's
 *   wrapper to use display:contents without breaking measurement.
 */
function performTrace(
  container: HTMLElement,
  globalBorderRadius?: string,
  anchorRef?: RefObject<HTMLElement | null>,
): ShimmerRect[] {
  const anchor = anchorRef?.current ?? container;
  const anchorRect = anchor.getBoundingClientRect();
  const { traced, skippedFixed } = collectTraceableElements(container);

  if (skippedFixed > 0 && !warnedContainers.has(container)) {
    warnedContainers.add(container);
    // eslint-disable-next-line no-console
    console.warn(
      `[shimmer-trace] Skipped ${skippedFixed} element(s) with ` +
        `position:fixed or position:sticky. Their coordinate space ` +
        `cannot follow the Master container during scroll, so the overlay ` +
        `block would drift. Render a nested <Shimmer> inside the fixed/sticky ` +
        `element if you need a skeleton there, or add data-shimmer to opt in ` +
        `(positioning may still drift on scroll).`,
    );
  }

  return traced
    .map((el) => measureElement(el, anchorRect, globalBorderRadius))
    .filter((r): r is ShimmerRect => r !== null && r.width > 0 && r.height > 0);
}

/**
 * Hook that traces all visible leaf DOM elements within a container
 * and returns their measured ShimmerRects.
 *
 * Uses ResizeObserver to re-trace on container resize.
 *
 * @param anchorRef - When set, rects are relative to this element (Master).
 *   Used by Reporter so its display:contents wrapper doesn't break measurement.
 */
export function useTrace(
  containerRef: RefObject<HTMLElement | null>,
  loading: boolean,
  globalBorderRadius?: string,
  anchorRef?: RefObject<HTMLElement | null>,
): ShimmerRect[] {
  const [rects, setRects] = useState<ShimmerRect[]>([]);

  const trace = useCallback(() => {
    if (!containerRef.current) return;
    const traced = performTrace(containerRef.current, globalBorderRadius, anchorRef);
    setRects(traced);
  }, [containerRef, globalBorderRadius, anchorRef]);

  useLayoutEffect(() => {
    if (!loading || !containerRef.current) {
      setRects([]);
      return;
    }

    // Initial trace
    trace();

    // Re-trace on resize
    const observer = new ResizeObserver(() => {
      trace();
    });
    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, [loading, trace]);

  return rects;
}

import { type ShadowConfig, type SmoothCornerOptions, type CornerConfig, type GradientConfig, type GradientStop, generatePath, type EffectsConfig, type BorderConfig, type BorderStyle } from "@/lib/smooth-corners-path";

// ---- upstream: packages/core/src/layout-size.ts ----
/** A border-box size in CSS pixels, at float precision. */
export interface MeasuredSize {
  width: number;
  height: number;
}

/** The computed-style fields the border-box math reads. */
export type LayoutStyleSource = Pick<
  CSSStyleDeclaration,
  | "width"
  | "height"
  | "boxSizing"
  | "paddingTop"
  | "paddingRight"
  | "paddingBottom"
  | "paddingLeft"
  | "borderTopWidth"
  | "borderRightWidth"
  | "borderBottomWidth"
  | "borderLeftWidth"
>;

/**
 * Read an element's border-box in CSS pixels with float precision,
 * ignoring transforms on the element or any ancestor.
 *
 * - `getBoundingClientRect` folds in ancestor transforms (an element
 *   under `transform: scale(K)` would clip to K× its layout size).
 * - `offsetWidth/offsetHeight` ignore transforms (good) but round to
 *   integers — a fractional layout height (e.g. 28.8 px from
 *   line-height × font-size) leaves a sub-pixel sliver of un-clipped
 *   paint at the edge.
 * - `getComputedStyle.width/height` is the resolved used value in CSS
 *   pixels at full float precision. On `border-box` it's already the
 *   border-box; on `content-box` we add padding + border to recover it.
 *
 * Falls back to `offset*` in non-browser environments (a DOM emulator
 * under test) where `getComputedStyle` may return `"auto"` or "".
 *
 * Pass a pre-read `cs` to reuse an existing `getComputedStyle` result (its
 * values must be snapshotted before any layout-dirtying write — computed
 * style is live); omit it and the element's computed style is read here.
 */
export function getLayoutSize(
  el: HTMLElement,
  cs: LayoutStyleSource = window.getComputedStyle(el),
): MeasuredSize {
  // Only a px value is a resolved used size. Width/height don't apply to
  // non-replaced inline elements, so their computed value survives as-is —
  // parseFloat("100%") would fabricate a 100px box that doesn't exist.
  const px = (v: string) => (v.endsWith("px") ? parseFloat(v) : NaN);
  const w = px(cs.width);
  const h = px(cs.height);

  if (Number.isNaN(w) || Number.isNaN(h)) {
    return { width: el.offsetWidth, height: el.offsetHeight };
  }
  if (cs.boxSizing === "border-box") {
    return { width: w, height: h };
  }

  const padX = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
  const padY = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
  const bdrX = (parseFloat(cs.borderLeftWidth) || 0) + (parseFloat(cs.borderRightWidth) || 0);
  const bdrY = (parseFloat(cs.borderTopWidth) || 0) + (parseFloat(cs.borderBottomWidth) || 0);

  return { width: w + padX + bdrX, height: h + padY + bdrY };
}

// ---- upstream: packages/core/src/position-ref-count.ts ----
const refCounts = new WeakMap<HTMLElement, number>();

/**
 * Ensure an anchor is positioned so the SVG effects overlay can sit on it.
 * Ref-counted: already-acquired anchors just increment. A static anchor
 * gets `position: relative` and counts as the first acquire. Returns false
 * when the anchor is non-static but not ours — caller bails out rather
 * than stomp on a user-set style. Pair with `releasePosition`.
 */
export function acquirePosition(anchor: HTMLElement): boolean {
  const count = refCounts.get(anchor) ?? 0;
  if (count > 0) {
    refCounts.set(anchor, count + 1);
    return true;
  }
  const pos = getComputedStyle(anchor).position;
  if (pos !== "static" && pos !== "") return false;
  refCounts.set(anchor, 1);
  anchor.style.position = "relative";
  return true;
}

/**
 * Decrement the ref count; the last release clears the inline `position`
 * applied by `acquirePosition`. A no-op when the anchor was never acquired
 * (we mustn't stomp a user-set inline style).
 */
export function releasePosition(anchor: HTMLElement): void {
  const count = refCounts.get(anchor);
  if (count === undefined) return;
  if (count <= 1) {
    refCounts.delete(anchor);
    anchor.style.position = "";
  } else {
    refCounts.set(anchor, count - 1);
  }
}

const isolationCounts = new WeakMap<HTMLElement, number>();
const savedIsolation = new WeakMap<HTMLElement, string>();

/**
 * Stacking context for a `z-index:-1` sibling — core's drop-shadow SVG, or an
 * adapter's CSS box-shadow div. Ref-counted because a whole grid routinely
 * shares one anchor (saving per handle meant the second captured the first's
 * `isolate` and restored it on teardown), and because both owners hold it at
 * once while a `shadowStrategy` flip hands over.
 */
export function acquireIsolation(anchor: HTMLElement): void {
  const count = isolationCounts.get(anchor) ?? 0;
  if (count === 0) savedIsolation.set(anchor, anchor.style.isolation);
  isolationCounts.set(anchor, count + 1);
  anchor.style.isolation = "isolate";
}

export function releaseIsolation(anchor: HTMLElement): void {
  const count = isolationCounts.get(anchor);
  if (count === undefined) return;
  if (count <= 1) {
    isolationCounts.delete(anchor);
    anchor.style.isolation = savedIsolation.get(anchor) ?? "";
    savedIsolation.delete(anchor);
  } else {
    isolationCounts.set(anchor, count - 1);
  }
}

// ---- upstream: packages/core/src/svg-shared.ts ----
export const SVG_NS = "http://www.w3.org/2000/svg";

/** Shared counter for unique SVG element IDs across svg-effects and drop-shadow. */
let uid = 0;
export function nextUid(): number { return ++uid; }

/** Target's border box relative to its anchor's padding box, in CSS px. */
export interface OverlayOffset {
  x: number;
  y: number;
}

/**
 * Screen-space rect delta converted back to the anchor's own CSS px: un-scaled
 * by any ancestor transform, shifted from border edge to padding edge, and
 * corrected for scroll. Rotation or skew would need a DOMMatrix decomposition.
 */
function measureByRects(anchor: HTMLElement, target: HTMLElement): OverlayOffset {
  const anchorRect = anchor.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const layout = getLayoutSize(anchor);
  const scaleX = layout.width > 0 && anchorRect.width > 0 ? anchorRect.width / layout.width : 1;
  const scaleY = layout.height > 0 && anchorRect.height > 0 ? anchorRect.height / layout.height : 1;
  const style = getComputedStyle(anchor);
  return {
    x: (targetRect.left - anchorRect.left) / scaleX - (parseFloat(style.borderLeftWidth) || 0) + anchor.scrollLeft,
    y: (targetRect.top - anchorRect.top) / scaleY - (parseFloat(style.borderTopWidth) || 0) + anchor.scrollTop,
  };
}

/**
 * Positions one overlay `<svg>` over `target` inside `anchor`, reading no
 * layout: `update()` runs in the resize flush's write pass, where one
 * `getBoundingClientRect` forces a relayout per element (119 -> 36,000 across
 * 300). Callers thread in `offsetLeft`/`offsetTop` from the batched read pass,
 * which is anchor-relative only while the anchor is the target's `offsetParent`;
 * rects cover the anchor sitting higher, which needs a caller-supplied ref.
 *
 * That branch is decided once and cached: `offsetParent` is layout-dependent, and
 * re-reading it here costs 18,000 layouts against 119, since each call has just
 * dirtied layout by writing the previous overlay's position.
 *
 * ponytail: `offset*` is integer-rounded, so a fractional position can land up
 * to 1px out; exactness costs a forced layout per element per frame. The cached
 * branch likewise misses a positioned ancestor inserted between anchor and
 * target after mount — re-check in the flush's read pass, where layout is
 * already clean, if that ever comes up.
 */
export function createOverlayPlacer(anchor: HTMLElement, target: HTMLElement) {
  let offsetParentIsAnchor: boolean | undefined;

  return function place(svg: SVGElement, width: number, height: number, offset?: OverlayOffset): void {
    svg.setAttribute("width", String(width));
    svg.setAttribute("height", String(height));

    if (target === anchor) {
      svg.style.left = svg.style.top = "0px";
      return;
    }

    offsetParentIsAnchor ??= target.offsetParent === anchor;
    const { x, y } = offsetParentIsAnchor
      ? offset ?? { x: target.offsetLeft, y: target.offsetTop }
      : measureByRects(anchor, target);

    svg.style.left = `${x}px`;
    svg.style.top = `${y}px`;
  };
}

/** Expand 3-char hex (`"#f00"` → `"#ff0000"`); 6-char passes through. */
function expandHex(hex: string): string {
  const h = hex.replace("#", "");
  if (h.length === 3) return "#" + h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  return "#" + h;
}

/** Non-hex colors (oklch, lab, color()…) are already valid CSS and pass through. */
const HEX = /^#?[0-9a-f]{3}(?:[0-9a-f]{3})?$/i;

/** Convert a hex color (3 or 6 digit) to an `rgb(...)` CSS string. */
export function hexToRgb(hex: string): string {
  if (!HEX.test(hex)) return hex;
  const h = expandHex(hex).replace("#", "");
  return `rgb(${parseInt(h.substring(0, 2), 16)},${parseInt(h.substring(2, 4), 16)},${parseInt(h.substring(4, 6), 16)})`;
}

/** A ShadowConfig with all values zeroed — no visible shadow. */
export const DEFAULT_SHADOW: ShadowConfig = {
  offsetX: 0, offsetY: 0, blur: 0, spread: 0, color: "#000", opacity: 0,
};

/**
 * Persistent path memo. Both `createDropShadow` and `createSvgEffects`
 * generate paths multiple times per `update()` for the same
 * `(width, height, options)` tuple, differing only by spread. Spread is
 * folded into the key so spread-only variants memoise independently.
 *
 * The cache Map and the serialized options key live on the handle: create
 * one per effects/shadow handle and reuse it across `update()` calls.
 * `setOptions` clears the per-size entries whenever the serialized shape
 * changes; they're bounded by an LRU cap so a resize animation can't grow the
 * map without limit.
 */
export interface PathCache {
  (w: number, h: number, opts: SmoothCornerOptions, spread: number): string;
  /** Set the base options for the current dispatch; clears the cache when the serialized shape changes. */
  setOptions(options: SmoothCornerOptions): void;
  /** Internal (tests only): current number of memoised path entries. */
  _size(): number;
}

/** Per-handle path-cache cap. One entry per unique (w, h, spread); a resize
 *  animation sweeps many sizes, so bound it LRU-style like curves/cache.ts. */
export const PATH_CACHE_CAPACITY = 128;

export function createPathCache(options?: SmoothCornerOptions): PathCache {
  const cache = new Map<string, string>();
  let optionsKey: string | undefined;

  const setOptions = (opts: SmoothCornerOptions): void => {
    // Always re-serialise and compare the key. Options objects are commonly
    // mutated in place (Vue reactive props), so a reference check would miss
    // a shape change and leak stale border/shadow paths after a clip update.
    const key = JSON.stringify(opts);
    if (key !== optionsKey) {
      optionsKey = key;
      cache.clear();
    }
  };

  const getPath = ((w, h, opts, spread) => {
    const key = `${w}:${h}:${spread}`;
    const cached = cache.get(key);
    if (cached !== undefined) {
      // LRU touch: delete + re-insert moves the entry to the newest slot.
      cache.delete(key);
      cache.set(key, cached);
      return cached;
    }
    const fresh = generatePath(w, h, opts);
    if (cache.size >= PATH_CACHE_CAPACITY) {
      cache.delete(cache.keys().next().value!);
    }
    cache.set(key, fresh);
    return fresh;
  }) as PathCache;
  getPath.setOptions = setOptions;
  getPath._size = () => cache.size;

  if (options !== undefined) setOptions(options);
  return getPath;
}

/** Adjust corner radii by a spread offset (clamped to zero). */
export function adjustOptions(options: SmoothCornerOptions, spread: number): SmoothCornerOptions {
  if (spread === 0) return options;
  if ("radius" in options) {
    return { ...options, radius: Math.max(0, options.radius + spread) };
  }
  const adjust = (v: CornerConfig | number | undefined): CornerConfig | number | undefined => {
    if (v === undefined) return undefined;
    if (typeof v === "number") return Math.max(0, v + spread);
    return { ...v, radius: Math.max(0, v.radius + spread) };
  };
  return {
    topLeft: adjust(options.topLeft),
    topRight: adjust(options.topRight),
    bottomRight: adjust(options.bottomRight),
    bottomLeft: adjust(options.bottomLeft),
  };
}

/**
 * Best-effort CSS `border-radius` matching the per-corner radii. The SSR
 * fallback and the box-shadow sibling both derive their rounding from this.
 */
export function cornerOptionsToBorderRadius(options: SmoothCornerOptions): string {
  if ("radius" in options) return `${options.radius}px`;
  const radiusOf = (v: CornerConfig | number | undefined): number => {
    if (v === undefined) return 0;
    if (typeof v === "number") return v;
    return v.radius;
  };
  const tl = radiusOf(options.topLeft);
  const tr = radiusOf(options.topRight);
  const br = radiusOf(options.bottomRight);
  const bl = radiusOf(options.bottomLeft);
  return `${tl}px ${tr}px ${br}px ${bl}px`;
}

/**
 * Darken each RGB channel by 2/3 — Firefox's groove/ridge algorithm.
 * Pure black maps to #4c4c4c so the darkened edge stays visible.
 */
export function darkenHex(hex: string): string {
  if (!HEX.test(hex)) return `color-mix(in oklab, ${hex}, black 33%)`;
  const h = expandHex(hex).replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  if (r === 0 && g === 0 && b === 0) return "#4c4c4c";
  const dr = Math.round(r * 2 / 3);
  const dg = Math.round(g * 2 / 3);
  const db = Math.round(b * 2 / 3);
  return "#" + ((1 << 24) | (dr << 16) | (dg << 8) | db).toString(16).slice(1);
}

/** True when the border color is a GradientConfig object, not a hex string. */
export function isGradient(color: string | GradientConfig): color is GradientConfig {
  return typeof color === "object" && color !== null && "type" in color;
}

/**
 * CSS-convention angle (deg) → SVG linearGradient x1/y1/x2/y2.
 * CSS: 0deg = bottom-to-top, 90deg = left-to-right.
 */
export function angleToCoords(angleDeg: number): { x1: number; y1: number; x2: number; y2: number } {
  const rad = (90 - angleDeg) * Math.PI / 180;
  return {
    x1: 0.5 - 0.5 * Math.cos(rad),
    y1: 0.5 + 0.5 * Math.sin(rad),
    x2: 0.5 + 0.5 * Math.cos(rad),
    y2: 0.5 - 0.5 * Math.sin(rad),
  };
}

function applyStops(gradientEl: Element, stops: GradientStop[]): void {
  while (gradientEl.lastChild) gradientEl.removeChild(gradientEl.lastChild);
  for (const s of stops) {
    const stop = document.createElementNS(SVG_NS, "stop");
    stop.setAttribute("offset", String(s.offset));
    stop.setAttribute("stop-color", s.color);
    if (s.opacity !== undefined && s.opacity !== 1) {
      stop.setAttribute("stop-opacity", String(s.opacity));
    }
    gradientEl.appendChild(stop);
  }
}

/** Create a `<linearGradient>` / `<radialGradient>` def appended to `<defs>`. */
export function createGradientDef(defs: Element, config: GradientConfig, id: string): Element {
  const tag = config.type === "linear" ? "linearGradient" : "radialGradient";
  const el = document.createElementNS(SVG_NS, tag);
  el.setAttribute("id", id);
  setGradientAttrs(el, config);
  applyStops(el, config.stops);
  defs.appendChild(el);
  return el;
}

/** Update an existing gradient element's attrs and stops in place. */
export function updateGradientDef(gradientEl: Element, config: GradientConfig): void {
  setGradientAttrs(gradientEl, config);
  applyStops(gradientEl, config.stops);
}

function setGradientAttrs(el: Element, config: GradientConfig): void {
  if (config.type === "linear") {
    const coords = angleToCoords(config.angle ?? 0);
    el.setAttribute("x1", String(coords.x1));
    el.setAttribute("y1", String(coords.y1));
    el.setAttribute("x2", String(coords.x2));
    el.setAttribute("y2", String(coords.y2));
  } else {
    el.setAttribute("cx", String(config.cx ?? 0.5));
    el.setAttribute("cy", String(config.cy ?? 0.5));
    el.setAttribute("r", String(config.r ?? 0.5));
  }
}

/** Return a copy of `config` with each stop's color run through `darkenHex`. */
export function darkenGradient(config: GradientConfig): GradientConfig {
  return { ...config, stops: config.stops.map(s => ({ ...s, color: darkenHex(s.color) })) };
}

// ---- upstream: packages/core/src/svg-effects.ts ----
export interface SvgEffectsHandle {
  update(options: SmoothCornerOptions, effects: EffectsConfig, width: number, height: number, offset?: OverlayOffset): void;
  destroy(): void;
}

function padBounds(el: Element, pad: number, w: number, h: number): void {
  el.setAttribute("x", String(-pad));
  el.setAttribute("y", String(-pad));
  el.setAttribute("width", String(w + pad * 2));
  el.setAttribute("height", String(h + pad * 2));
}

function padMaskAndRect(mask: Element, rect: Element, pad: number, w: number, h: number): void {
  padBounds(mask, pad, w, h);
  padBounds(rect, pad, w, h);
}

function createKnockoutMask(
  maskId: string,
  defs: Element,
  userSpaceOnUse: boolean,
): { mask: Element; rect: Element; knockout: Element } {
  const mask = document.createElementNS(SVG_NS, "mask");
  mask.setAttribute("id", maskId);
  if (userSpaceOnUse) mask.setAttribute("maskUnits", "userSpaceOnUse");
  const rect = document.createElementNS(SVG_NS, "rect");
  rect.setAttribute("fill", "white");
  const knockout = document.createElementNS(SVG_NS, "path");
  knockout.setAttribute("fill", "none");
  knockout.setAttribute("stroke", "black");
  mask.appendChild(rect);
  mask.appendChild(knockout);
  defs.appendChild(mask);
  return { mask, rect, knockout };
}

function createStrokeGroup(
  clipOrMask?: { attr: "clip-path" | "mask"; value: string },
): { group: SVGGElement; strokePath: SVGPathElement; grooveOverlay: SVGPathElement } {
  const group = document.createElementNS(SVG_NS, "g") as SVGGElement;
  const strokePath = document.createElementNS(SVG_NS, "path") as SVGPathElement;
  strokePath.setAttribute("fill", "none");
  if (clipOrMask) strokePath.setAttribute(clipOrMask.attr, clipOrMask.value);
  strokePath.style.display = "none";
  group.appendChild(strokePath);
  const grooveOverlay = document.createElementNS(SVG_NS, "path") as SVGPathElement;
  grooveOverlay.setAttribute("fill", "none");
  if (clipOrMask) grooveOverlay.setAttribute(clipOrMask.attr, clipOrMask.value);
  grooveOverlay.style.display = "none";
  group.appendChild(grooveOverlay);
  return { group, strokePath, grooveOverlay };
}

interface BorderElements {
  strokePath: SVGPathElement;
  grooveOverlay: SVGPathElement;
  strokeGroup: SVGGElement;
  dblMaskId: string;
  dblKnockout: Element;
  dblRect: Element;
  strokeMultiplier: number;
  padDblMask?: (pad: number, w: number, h: number) => void;
  defs: Element;
  /** Main-stroke gradient def (null when stroke is a solid color). */
  gradientEl: Element | null;
  gradientId: string;
  /** Groove/ridge overlay-stroke gradient def. */
  overlayGradientEl: Element | null;
  overlayGradientId: string;
}

function removeGradient(els: BorderElements, which: "main" | "overlay"): void {
  const key = which === "main" ? "gradientEl" : "overlayGradientEl";
  els[key]?.remove();
  els[key] = null;
}

/** Return a hex string or `url(#id)` reference for the configured stroke. */
function resolveStroke(
  color: string | GradientConfig,
  els: BorderElements,
  which: "main" | "overlay",
): string {
  if (!isGradient(color)) {
    removeGradient(els, which);
    return color;
  }
  const elKey = which === "main" ? "gradientEl" : "overlayGradientEl";
  const id = which === "main" ? els.gradientId : els.overlayGradientId;
  if (els[elKey]) {
    updateGradientDef(els[elKey], color);
  } else {
    els[elKey] = createGradientDef(els.defs, color, id);
  }
  return `url(#${id})`;
}

function updateBorder(
  config: BorderConfig | undefined,
  d: string, width: number, height: number,
  els: BorderElements,
): void {
  if (!config || config.width <= 0 || config.opacity <= 0) {
    els.strokePath.style.display = "none";
    els.strokeGroup.removeAttribute("mask");
    els.grooveOverlay.style.display = "none";
    removeGradient(els, "main");
    removeGradient(els, "overlay");
    return;
  }

  const m = els.strokeMultiplier;
  els.strokePath.style.display = "";
  els.strokePath.setAttribute("d", d);
  els.strokePath.setAttribute("stroke", resolveStroke(config.color, els, "main"));
  els.strokePath.setAttribute("stroke-width", String(config.width * m));
  els.strokePath.setAttribute("stroke-opacity", String(config.opacity));

  const style = config.style ?? "solid";
  els.strokeGroup.removeAttribute("mask");
  els.grooveOverlay.style.display = "none";
  els.strokePath.removeAttribute("stroke-dasharray");
  els.strokePath.setAttribute("stroke-linecap", "butt");
  // Overlay gradient is groove/ridge-only; re-created below if needed.
  if (style !== "groove" && style !== "ridge") {
    removeGradient(els, "overlay");
  }

  switch (style) {
    case "dashed": {
      const dashLen = Math.max(0, config.dash ?? config.width * 3);
      const gapLen = Math.max(0, config.gap ?? config.width * 2);
      els.strokePath.setAttribute("stroke-dasharray", `${dashLen} ${gapLen}`);
      if (config.lineCap) els.strokePath.setAttribute("stroke-linecap", config.lineCap);
      break;
    }
    case "dotted": {
      const dotDash = Math.max(0, config.dash ?? 0);
      const dotGap = Math.max(0, config.gap ?? config.width * 2);
      els.strokePath.setAttribute("stroke-dasharray", `${dotDash} ${dotGap}`);
      els.strokePath.setAttribute("stroke-linecap", config.lineCap ?? "round");
      break;
    }
    case "double":
      if (config.width >= 3) {
        const third = Math.round(config.width / 3);
        els.dblKnockout.setAttribute("d", d);
        els.dblKnockout.setAttribute("stroke-width", String(third * m));
        els.dblRect.setAttribute("width", String(width));
        els.dblRect.setAttribute("height", String(height));
        if (els.padDblMask) els.padDblMask(config.width, width, height);
        els.strokeGroup.setAttribute("mask", `url(#${els.dblMaskId})`);
      }
      break;
    // groove and ridge are the same two-tone stroke with light/dark swapped:
    // groove darkens the main stroke and keeps the overlay at the base color;
    // ridge keeps the main stroke and darkens the overlay.
    case "groove":
    case "ridge": {
      const dark = isGradient(config.color) ? darkenGradient(config.color) : darkenHex(config.color);
      if (style === "groove") els.strokePath.setAttribute("stroke", resolveStroke(dark, els, "main"));
      els.grooveOverlay.style.display = "";
      els.grooveOverlay.setAttribute("d", d);
      els.grooveOverlay.setAttribute("stroke", resolveStroke(style === "groove" ? config.color : dark, els, "overlay"));
      els.grooveOverlay.setAttribute("stroke-width", String(config.width * m / 2));
      els.grooveOverlay.setAttribute("stroke-opacity", String(config.opacity));
      break;
    }
  }
}

interface InnerShadowEntry {
  maskId: string;
  mask: Element;
  maskRect: Element;
  maskCutout: Element;
  filterId: string;
  filter: Element;
  feBlur: Element;
  blurGroup: Element;
  rect: SVGRectElement;
}

function createInnerShadowEntry(defs: Element, clipGroup: Element): InnerShadowEntry {
  const uid = nextUid();
  const maskId = `sc-ishadow-mask-${uid}`;
  const mask = document.createElementNS(SVG_NS, "mask");
  mask.setAttribute("id", maskId);
  mask.setAttribute("maskUnits", "userSpaceOnUse");
  const maskRect = document.createElementNS(SVG_NS, "rect");
  maskRect.setAttribute("fill", "white");
  const maskCutout = document.createElementNS(SVG_NS, "path");
  maskCutout.setAttribute("fill", "black");
  mask.appendChild(maskRect);
  mask.appendChild(maskCutout);
  defs.appendChild(mask);

  const filterId = `sc-ishadow-blur-${uid}`;
  const filter = document.createElementNS(SVG_NS, "filter");
  filter.setAttribute("id", filterId);
  filter.setAttribute("x", "-200%");
  filter.setAttribute("y", "-200%");
  filter.setAttribute("width", "500%");
  filter.setAttribute("height", "500%");
  filter.setAttribute("color-interpolation-filters", "sRGB");
  const feBlur = document.createElementNS(SVG_NS, "feGaussianBlur");
  feBlur.setAttribute("stdDeviation", "0");
  filter.appendChild(feBlur);
  defs.appendChild(filter);

  const blurGroup = document.createElementNS(SVG_NS, "g");
  const rect = document.createElementNS(SVG_NS, "rect") as SVGRectElement;
  rect.setAttribute("mask", `url(#${maskId})`);
  rect.style.display = "none";
  blurGroup.appendChild(rect);
  clipGroup.appendChild(blurGroup);

  return { maskId, mask, maskRect, maskCutout, filterId, filter, feBlur, blurGroup, rect };
}

function removeInnerShadowEntry(entry: InnerShadowEntry): void {
  entry.mask.remove();
  entry.filter.remove();
  entry.blurGroup.remove();
}

/**
 * SVG overlay for inner/outer/middle borders and inner shadows. Appended to
 * `anchor` and positioned over `target`, the clipped element — which must never
 * be an ancestor of the overlay, since `clip-path` clips its whole subtree and
 * would cut an outer border away. Clip-path, mask and filter elements update in
 * sync with the smooth-corner path on each `update()`.
 */
export function createSvgEffects(anchor: HTMLElement, target: HTMLElement = anchor): SvgEffectsHandle {
  const id = nextUid();
  const clipId = `sc-clip-${id}`;
  const maskId = `sc-mask-${id}`;

  const svg = document.createElementNS(SVG_NS, "svg");
  svg.style.position = "absolute";
  svg.style.left = "0px";
  svg.style.top = "0px";
  svg.style.pointerEvents = "none";
  svg.style.overflow = "visible";
  svg.style.zIndex = "1";
  svg.setAttribute("aria-hidden", "true");
  // Without these an SVG falls back to its 300×150 intrinsic size and overflows
  // the anchor until the first update() lands.
  svg.setAttribute("width", "0");
  svg.setAttribute("height", "0");

  const defs = document.createElementNS(SVG_NS, "defs");

  const clipPathEl = document.createElementNS(SVG_NS, "clipPath");
  clipPathEl.setAttribute("id", clipId);
  const clipShape = document.createElementNS(SVG_NS, "path");
  clipPathEl.appendChild(clipShape);
  defs.appendChild(clipPathEl);

  // Outer-border mask: white rect minus black shape = outer region.
  const maskEl = document.createElementNS(SVG_NS, "mask");
  maskEl.setAttribute("id", maskId);
  maskEl.setAttribute("maskUnits", "userSpaceOnUse");
  const maskRect = document.createElementNS(SVG_NS, "rect");
  maskRect.setAttribute("fill", "white");
  const maskShape = document.createElementNS(SVG_NS, "path");
  maskShape.setAttribute("fill", "black");
  maskEl.appendChild(maskRect);
  maskEl.appendChild(maskShape);
  defs.appendChild(maskEl);

  const innerDblMaskId = `sc-dbl-inner-${id}`;
  const { rect: innerDblRect, knockout: innerDblKnockout } =
    createKnockoutMask(innerDblMaskId, defs, false);

  const outerDblMaskId = `sc-dbl-outer-${id}`;
  const { mask: outerDblMask, rect: outerDblRect, knockout: outerDblKnockout } =
    createKnockoutMask(outerDblMaskId, defs, true);

  const middleDblMaskId = `sc-dbl-middle-${id}`;
  const { mask: middleDblMask, rect: middleDblRect, knockout: middleDblKnockout } =
    createKnockoutMask(middleDblMaskId, defs, true);

  svg.appendChild(defs);

  const isShadowClip = document.createElementNS(SVG_NS, "g");
  isShadowClip.setAttribute("clip-path", `url(#${clipId})`);
  svg.appendChild(isShadowClip);

  const innerShadowPool: InnerShadowEntry[] = [];

  const { group: innerStrokeGroup, strokePath: innerStrokePath, grooveOverlay: innerGrooveOverlay } =
    createStrokeGroup({ attr: "clip-path", value: `url(#${clipId})` });
  svg.appendChild(innerStrokeGroup);

  const { group: outerStrokeGroup, strokePath: outerStrokePath, grooveOverlay: outerGrooveOverlay } =
    createStrokeGroup({ attr: "mask", value: `url(#${maskId})` });
  svg.appendChild(outerStrokeGroup);

  const { group: middleStrokeGroup, strokePath: middleStrokePath, grooveOverlay: middleGrooveOverlay } =
    createStrokeGroup();
  svg.appendChild(middleStrokeGroup);

  anchor.appendChild(svg);

  const innerBorderEls: BorderElements = {
    strokePath: innerStrokePath, grooveOverlay: innerGrooveOverlay,
    strokeGroup: innerStrokeGroup, dblMaskId: innerDblMaskId,
    dblKnockout: innerDblKnockout, dblRect: innerDblRect,
    strokeMultiplier: 2,
    defs, gradientEl: null, gradientId: `sc-grad-inner-${id}`,
    overlayGradientEl: null, overlayGradientId: `sc-grad-inner-ov-${id}`,
  };
  const outerBorderEls: BorderElements = {
    strokePath: outerStrokePath, grooveOverlay: outerGrooveOverlay,
    strokeGroup: outerStrokeGroup, dblMaskId: outerDblMaskId,
    dblKnockout: outerDblKnockout, dblRect: outerDblRect,
    strokeMultiplier: 2,
    defs, gradientEl: null, gradientId: `sc-grad-outer-${id}`,
    overlayGradientEl: null, overlayGradientId: `sc-grad-outer-ov-${id}`,
    padDblMask: (pad, w, h) => padMaskAndRect(outerDblMask, outerDblRect, pad, w, h),
  };
  const middleBorderEls: BorderElements = {
    strokePath: middleStrokePath, grooveOverlay: middleGrooveOverlay,
    strokeGroup: middleStrokeGroup, dblMaskId: middleDblMaskId,
    dblKnockout: middleDblKnockout, dblRect: middleDblRect,
    strokeMultiplier: 1,
    defs, gradientEl: null, gradientId: `sc-grad-middle-${id}`,
    overlayGradientEl: null, overlayGradientId: `sc-grad-middle-ov-${id}`,
    padDblMask: (pad, w, h) => padMaskAndRect(middleDblMask, middleDblRect, pad, w, h),
  };

  const getPath = createPathCache();
  const place = createOverlayPlacer(anchor, target);

  return {
    update(options, effects, width, height, offset) {
      if (width <= 0 || height <= 0) return;

      place(svg, width, height, offset);
      svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

      getPath.setOptions(options);
      const d = getPath(width, height, options, 0);

      clipShape.setAttribute("d", d);
      maskShape.setAttribute("d", d);
      maskRect.setAttribute("width", String(width));
      maskRect.setAttribute("height", String(height));

      updateBorder(effects.innerBorder, d, width, height, innerBorderEls);

      // Outer border needs an extended mask region before the border call.
      const ob = effects.outerBorder;
      if (ob && ob.width > 0 && ob.opacity > 0) {
        padMaskAndRect(maskEl, maskRect, ob.width, width, height);
      }
      updateBorder(ob, d, width, height, outerBorderEls);

      updateBorder(effects.middleBorder, d, width, height, middleBorderEls);

      const rawIs = effects.innerShadow;
      const isArr: ShadowConfig[] = rawIs == null ? [] : Array.isArray(rawIs) ? rawIs : [rawIs];

      while (innerShadowPool.length < isArr.length) {
        innerShadowPool.push(createInnerShadowEntry(defs, isShadowClip));
      }
      while (innerShadowPool.length > isArr.length) {
        removeInnerShadowEntry(innerShadowPool.pop()!);
      }

      for (let i = 0; i < isArr.length; i++) {
        const is = isArr[i];
        const entry = innerShadowPool[i];

        if (is.opacity <= 0) {
          entry.rect.style.display = "none";
          continue;
        }

        entry.rect.style.display = "";

        const spread = is.spread;
        const pad = Math.max(is.blur * 3, 20) + Math.max(Math.abs(is.offsetX), Math.abs(is.offsetY)) + Math.abs(spread);

        // Mask: white rect (visible) + black squircle cutout (hole).
        padMaskAndRect(entry.mask, entry.maskRect, pad, width, height);

        const cutW = Math.max(1, width - spread * 2);
        const cutH = Math.max(1, height - spread * 2);
        const cutOpts = spread !== 0 ? adjustOptions(options, -spread) : options;
        entry.maskCutout.setAttribute("d", getPath(cutW, cutH, cutOpts, -spread));
        entry.maskCutout.setAttribute("transform",
          `translate(${is.offsetX + spread},${is.offsetY + spread})`);

        if (is.blur > 0) {
          entry.feBlur.setAttribute("stdDeviation", String(is.blur));
          entry.blurGroup.setAttribute("filter", `url(#${entry.filterId})`);
        } else {
          entry.blurGroup.removeAttribute("filter");
        }

        padBounds(entry.rect, pad, width, height);
        entry.rect.setAttribute("fill", hexToRgb(is.color));
        entry.rect.setAttribute("fill-opacity", String(is.opacity));
      }
    },
    destroy() {
      svg.remove();
    },
  };
}

// ---- upstream: packages/core/src/drop-shadow.ts ----
export interface DropShadowHandle {
  update(options: SmoothCornerOptions, shadow: ShadowConfig | ShadowConfig[], width: number, height: number, offset?: OverlayOffset): void;
  destroy(): void;
}

interface ShadowEntry {
  filterId: string;
  filterEl: SVGFilterElement;
  feBlur: SVGFEGaussianBlurElement;
  pathEl: SVGPathElement;
}

/**
 * Pad a filter region by `3 * blur + |spread| + 1` px on every side:
 * `3 * blur` covers the 3σ Gaussian tail (~99.7%), `|spread|` covers
 * path expansion, `+1` keeps the kernel edge from clipping on a
 * sub-pixel boundary.
 */
function computeFilterPad(blur: number, spread: number): number {
  return Math.ceil(3 * blur + Math.abs(spread) + 1);
}

/**
 * Write a tightly-fitted filter region in user-space (px) coordinates.
 * Pairs with `filterUnits="userSpaceOnUse"` — default objectBoundingBox
 * units force percentage regions, which Safari rounds in ways that
 * amplify a WebKit SVG-filter rasterisation bias. Chromium-identical.
 */
function setFilterRegionUserSpace(
  filterEl: SVGFilterElement,
  shadowWidth: number,
  shadowHeight: number,
  pad: number,
): void {
  filterEl.setAttribute("x", String(-pad));
  filterEl.setAttribute("y", String(-pad));
  filterEl.setAttribute("width", String(shadowWidth + 2 * pad));
  filterEl.setAttribute("height", String(shadowHeight + 2 * pad));
}

function createShadowEntry(defs: Element, svg: Element): ShadowEntry {
  const filterId = `sc-shadow-${nextUid()}`;

  const filterEl = document.createElementNS(SVG_NS, "filter") as SVGFilterElement;
  filterEl.setAttribute("id", filterId);
  filterEl.setAttribute("filterUnits", "userSpaceOnUse");
  // Without explicit sRGB some UAs pick linearRGB and the blur tint drifts.
  filterEl.setAttribute("color-interpolation-filters", "sRGB");

  const feBlur = document.createElementNS(SVG_NS, "feGaussianBlur") as SVGFEGaussianBlurElement;
  feBlur.setAttribute("stdDeviation", "0");
  filterEl.appendChild(feBlur);
  defs.appendChild(filterEl);

  const pathEl = document.createElementNS(SVG_NS, "path") as SVGPathElement;
  svg.appendChild(pathEl);

  return { filterId, filterEl, feBlur, pathEl };
}

function removeShadowEntry(entry: ShadowEntry): void {
  entry.filterEl.remove();
  entry.pathEl.remove();
}

/**
 * Path-based drop shadows behind `target`, the clipped element, rendered into
 * `anchor`. Uses spread-adjusted squircle paths so the shadow follows the
 * smooth-corner silhouette at any spread. Accepts a single ShadowConfig or an
 * array; first entry renders topmost. The SVG sits at z-index:-1 inside the
 * anchor's `isolation:isolate` stacking context.
 */
export function createDropShadow(anchor: HTMLElement, target: HTMLElement = anchor): DropShadowHandle {
  acquireIsolation(anchor);

  const svg = document.createElementNS(SVG_NS, "svg") as SVGSVGElement;
  svg.style.cssText = "position:absolute;left:0;top:0;overflow:visible;pointer-events:none;z-index:-1";
  // Without these an SVG falls back to its 300×150 intrinsic size, overflowing
  // narrow anchors (~110px mobile toggle pills) and forcing horizontal scroll.
  svg.setAttribute("width", "0");
  svg.setAttribute("height", "0");
  svg.setAttribute("aria-hidden", "true");

  const defs = document.createElementNS(SVG_NS, "defs");
  svg.appendChild(defs);

  anchor.appendChild(svg);

  const pool: ShadowEntry[] = [];

  const getPath = createPathCache();
  const place = createOverlayPlacer(anchor, target);

  return {
    update(options, shadow, width, height, offset) {
      const arr = Array.isArray(shadow) ? shadow : [shadow];

      const hasVisible = width > 0 && height > 0 && arr.some((s) => s.opacity > 0);
      if (!hasVisible) {
        svg.style.display = "none";
        return;
      }

      place(svg, width, height, offset);

      while (pool.length < arr.length) pool.push(createShadowEntry(defs, svg));
      while (pool.length > arr.length) removeShadowEntry(pool.pop()!);

      getPath.setOptions(options);

      // First entry = topmost = rendered last in SVG.
      let anyVisible = false;
      for (let i = 0; i < arr.length; i++) {
        const s = arr[i];
        const entry = pool[arr.length - 1 - i];

        if (s.opacity <= 0) {
          entry.pathEl.style.display = "none";
          continue;
        }

        const spread = s.spread;
        const shadowWidth = width + spread * 2;
        const shadowHeight = height + spread * 2;

        if (shadowWidth <= 0 || shadowHeight <= 0) {
          entry.pathEl.style.display = "none";
          continue;
        }

        anyVisible = true;
        entry.pathEl.style.display = "";

        const colour = hexToRgb(s.color);

        const adjusted = adjustOptions(options, spread);
        entry.pathEl.setAttribute("d", getPath(shadowWidth, shadowHeight, adjusted, spread));
        entry.pathEl.setAttribute("transform", `translate(${s.offsetX - spread},${s.offsetY - spread})`);
        entry.pathEl.setAttribute("fill", colour);
        entry.pathEl.setAttribute("fill-opacity", String(s.opacity));

        if (s.blur > 0) {
          const pad = computeFilterPad(s.blur, spread);
          setFilterRegionUserSpace(entry.filterEl, shadowWidth, shadowHeight, pad);
          entry.feBlur.setAttribute("stdDeviation", String(s.blur));
          entry.pathEl.setAttribute("filter", `url(#${entry.filterId})`);
        } else {
          entry.pathEl.removeAttribute("filter");
        }
      }

      svg.style.display = anyVisible ? "" : "none";
    },
    destroy() {
      svg.remove();
      releaseIsolation(anchor);
    },
  };
}

// ---- upstream: packages/core/src/extract-effects.ts ----
export interface ExtractedEffects {
  effects: EffectsConfig;
  /**
   * The element's border box as it stood at extraction, so the caller's first
   * sync can render without reading layout again. Still accurate after the
   * strip: `extractAndStripEffects` only removes a border it compensates for.
   */
  size: MeasuredSize;
  savedStyles: {
    border: string;
    boxShadow: string;
    paddingTop: string;
    paddingRight: string;
    paddingBottom: string;
    paddingLeft: string;
  };
}

/**
 * Parse an rgb/rgba color (as returned by getComputedStyle) to hex + opacity.
 * Accepts legacy comma form `rgb(255, 0, 0)` and CSS Color L4 space form
 * `rgb(255 0 0 / 0.5)`. Returns undefined for unrecognised input.
 */
export function parseColor(raw: string): { hex: string; opacity: number } | undefined {
  const match = raw.match(
    /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)(?:\s*[,/]\s*([\d.]+))?\s*\)$/,
  );
  if (!match) return undefined;
  const r = Number(match[1]);
  const g = Number(match[2]);
  const b = Number(match[3]);
  const a = match[4] !== undefined ? Number(match[4]) : 1;
  const hex = "#" + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  return { hex, opacity: a };
}

// One level of nesting, so an authored `color-mix(…, oklch(…) 60%, …)` matches
// whole rather than yielding its inner colour and leaving the `60%` behind to
// be read as a shadow offset. The two branches are disjoint on their first
// character, which is what keeps the match linear on an unclosed `color(` run.
const COLOR_FN =
  /(?:color-mix|light-dark|rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\((?:[^()]|\([^()]*\))+\)/;
const TRAILING_ALPHA = /\/\s*([\d.]+%?)\s*\)$/;

/**
 * Colours `parseColor` can't decode keep their raw CSS string instead of being
 * clipped into hex, so the browser resolves them at full gamut and the alpha
 * embedded in the string isn't applied a second time on top of `opacity`.
 */
function resolvePaint(raw: string): { color: string; opacity: number } | undefined {
  const parsed = parseColor(raw);
  if (parsed) return parsed.opacity > 0 ? { color: parsed.hex, opacity: parsed.opacity } : undefined;
  if (COLOR_FN.exec(raw)?.[0] !== raw) return undefined;
  const alpha = raw.match(TRAILING_ALPHA)?.[1];
  return alpha && parseFloat(alpha) === 0 ? undefined : { color: raw, opacity: 1 };
}

/** The computed-style fields `parseBorder` reads. */
export type BorderStyleSource = Pick<
  CSSStyleDeclaration,
  "borderTopStyle" | "borderTopWidth" | "borderTopColor"
>;

/**
 * Read the computed border from an element as a BorderConfig.
 * Returns undefined when the border is effectively invisible (none/hidden,
 * width 0, or transparent).
 *
 * Pass a pre-read `cs` to reuse an existing `getComputedStyle` result (its
 * values must be snapshotted before any layout-dirtying write — computed
 * style is live); omit it and the element's computed style is read here.
 */
export function parseBorder(
  el: HTMLElement,
  cs: BorderStyleSource = getComputedStyle(el),
): BorderConfig | undefined {
  const style = cs.borderTopStyle;
  if (style === "none" || style === "hidden") return undefined;

  const width = parseFloat(cs.borderTopWidth);
  if (width <= 0 || isNaN(width)) return undefined;

  const color = resolvePaint(cs.borderTopColor);
  if (!color) return undefined;

  // "solid" is the default and stays implicit; only non-solid supported
  // styles are carried through. Anything else (inset/outset/…) is dropped.
  const nonSolid: Record<string, BorderStyle> = {
    dashed: "dashed", dotted: "dotted", double: "double", groove: "groove", ridge: "ridge",
  };
  const borderStyle = nonSolid[style];

  return {
    width,
    color: color.color,
    opacity: color.opacity,
    ...(borderStyle ? { style: borderStyle } : {}),
  };
}

/**
 * Parse a computed box-shadow string into outer and inset shadow arrays,
 * preserving CSS order within each group.
 */
export function parseBoxShadow(raw: string): {
  shadow?: ShadowConfig[];
  innerShadow?: ShadowConfig[];
} {
  if (!raw || raw === "none") return {};

  // Split on commas outside parentheses (rgb/rgba contain commas).
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] === "(") depth++;
    else if (raw[i] === ")") depth--;
    else if (raw[i] === "," && depth === 0) {
      parts.push(raw.slice(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(raw.slice(start).trim());

  const shadows: ShadowConfig[] = [];
  const innerShadows: ShadowConfig[] = [];

  for (const part of parts) {
    const isInset = part.includes("inset");
    const cleaned = part.replace("inset", "").trim();

    const colorMatch = cleaned.match(COLOR_FN);
    if (!colorMatch) continue;
    const paint = resolvePaint(colorMatch[0]);
    if (!paint) continue;

    const rest = cleaned.replace(colorMatch[0], "").trim();
    const values = rest.split(/\s+/).map(parseFloat).filter((v) => !isNaN(v));
    if (values.length < 2) continue;

    const config: ShadowConfig = {
      offsetX: values[0],
      offsetY: values[1],
      blur: values[2] ?? 0,
      spread: values[3] ?? 0,
      ...paint,
    };
    (isInset ? innerShadows : shadows).push(config);
  }

  return {
    shadow: shadows.length > 0 ? shadows : undefined,
    innerShadow: innerShadows.length > 0 ? innerShadows : undefined,
  };
}

/**
 * Extract CSS border and box-shadow from an element, strip them inline, and
 * return equivalent EffectsConfig values plus the saved styles needed to
 * restore the original inline state.
 */
export function extractAndStripEffects(el: HTMLElement): ExtractedEffects {
  const savedStyles = {
    border: el.style.border,
    boxShadow: el.style.boxShadow,
    paddingTop: el.style.paddingTop,
    paddingRight: el.style.paddingRight,
    paddingBottom: el.style.paddingBottom,
    paddingLeft: el.style.paddingLeft,
  };

  // ONE getComputedStyle for the whole element. Computed style is live, so
  // every value we need is snapshotted into plain strings/numbers here,
  // BEFORE the first layout-dirtying write below — including the fields
  // parseBorder needs, which are handed to it rather than re-read.
  const cs = getComputedStyle(el);
  const borderStyleSource: BorderStyleSource = {
    borderTopStyle: cs.borderTopStyle,
    borderTopWidth: cs.borderTopWidth,
    borderTopColor: cs.borderTopColor,
  };
  const boxShadow = cs.boxShadow;
  const boxSizing = cs.boxSizing;
  const borderTopW = parseFloat(cs.borderTopWidth) || 0;
  const borderRightW = parseFloat(cs.borderRightWidth) || 0;
  const borderBottomW = parseFloat(cs.borderBottomWidth) || 0;
  const borderLeftW = parseFloat(cs.borderLeftWidth) || 0;
  const paddingTop = parseFloat(cs.paddingTop) || 0;
  const paddingRight = parseFloat(cs.paddingRight) || 0;
  const paddingBottom = parseFloat(cs.paddingBottom) || 0;
  const paddingLeft = parseFloat(cs.paddingLeft) || 0;

  // The border box, derived from that same declaration so it costs no extra
  // read, letting the caller's first sync render without measuring. It survives
  // the strip below: on `border-box` the computed width/height are the border
  // box and dropping the border doesn't move them, and on `content-box` the
  // padding compensation adds back exactly the border widths it removes.
  const size = getLayoutSize(el, cs);

  const innerBorder = parseBorder(el, borderStyleSource);
  const { shadow, innerShadow } = parseBoxShadow(boxShadow);

  // Only strip what we successfully parsed. Wiping unparseable values
  // (currentcolor, oklch(), border-image, ...) without an SVG replacement
  // would silently lose them.
  if (innerBorder) el.style.border = "0";
  if (shadow || innerShadow) el.style.boxShadow = "none";

  // Compensate content-box padding so stripping the border doesn't shift
  // layout. Keyed on `innerBorder` so we only shift when the border was
  // actually parsed and stripped.
  if (
    innerBorder &&
    boxSizing === "content-box" &&
    (borderTopW > 0 || borderRightW > 0 || borderBottomW > 0 || borderLeftW > 0)
  ) {
    el.style.paddingTop = (paddingTop + borderTopW) + "px";
    el.style.paddingRight = (paddingRight + borderRightW) + "px";
    el.style.paddingBottom = (paddingBottom + borderBottomW) + "px";
    el.style.paddingLeft = (paddingLeft + borderLeftW) + "px";
  }

  const effects: EffectsConfig = {};
  if (innerBorder) effects.innerBorder = innerBorder;
  if (shadow) effects.shadow = shadow;
  if (innerShadow) effects.innerShadow = innerShadow;

  return { effects, size, savedStyles };
}

/** True when `config` defines any renderable effect. */
export function hasEffects(config: EffectsConfig | undefined | null): boolean {
  if (!config) return false;
  return !!(
    config.innerBorder ||
    config.outerBorder ||
    config.middleBorder ||
    config.innerShadow ||
    config.shadow
  );
}

/** Merge auto-extracted and explicit effects; explicit wins per key. */
export function mergeEffects(
  extracted: ExtractedEffects | undefined,
  explicit: EffectsConfig | undefined,
): EffectsConfig {
  return { ...extracted?.effects, ...explicit };
}

/**
 * Restore previously saved inline border/boxShadow/padding styles. An empty
 * saved value clears the inline override so stylesheet rules can reassert.
 */
export function restoreStyles(
  el: HTMLElement,
  saved: ExtractedEffects["savedStyles"],
): void {
  el.style.border = saved.border;
  el.style.boxShadow = saved.boxShadow;
  el.style.paddingTop = saved.paddingTop;
  el.style.paddingRight = saved.paddingRight;
  el.style.paddingBottom = saved.paddingBottom;
  el.style.paddingLeft = saved.paddingLeft;
}

// ---- upstream: packages/core/src/observe-resize.ts ----
/**
 * Border-box size per `getLayoutSize`, plus the element's offset within its
 * `offsetParent`. The offset rides along so consumers never read it in the write
 * pass, where it would force a relayout per element.
 */
export interface Measured extends MeasuredSize {
  offsetLeft: number;
  offsetTop: number;
}

/**
 * Receives what was measured at the start of this flush; callers may ignore it
 * and re-measure. Extra parameters are ignored by `() => void` callbacks, so
 * this stays backward-compatible.
 */
type Callback = (measured?: Measured) => void;

let observer: ResizeObserver | null = null;
let rafId: number | undefined;
const callbackMap = new Map<Element, Set<Callback>>();
const pendingElements = new Set<Element>();

/**
 * What the last flush measured for each element, so the observer callback can
 * tell a notification that carries news from one that reports a box we already
 * have. `horizontal` records whether that measurement was taken in a horizontal
 * writing mode, because `borderBoxSize` is inline/block relative and only maps
 * onto width/height there.
 */
const lastMeasured = new WeakMap<Element, { width: number; height: number; horizontal: boolean }>();

function flush() {
  rafId = undefined;
  const elements = [...pendingElements];
  pendingElements.clear();

  // READ PASS: resolve every element's size before any callback runs, so a
  // later callback's write can't invalidate an earlier callback's style read.
  // Batched like this it costs one style recalc for the whole flush.
  //
  // Measured here rather than taken from the `ResizeObserverEntry`: the entry's
  // `borderBoxSize` was captured when the RO fired, which is the frame *before*
  // this flush. Anything that resizes the element in between — a spring
  // committing a tween frame, most visibly — makes that size stale, and a
  // consumer clipping to a stale-larger box gets its corners cut off by the
  // element's own edge. A live read is never staler than the entry, so the
  // saved `getComputedStyle` wasn't worth the frame of skew.
  //
  // The entry is still good for the opposite question, which the observer
  // callback asks: does this notification report the size we already measured?
  // If so it carries no news and needs no read at all. The accepted cost is one
  // frame in a narrow case — if the element's box changes between the observer's
  // snapshot and our rAF, and the snapshot happened to report exactly our last
  // measured size, the re-clip lands a frame later, because the observer
  // necessarily fires again with the new box.
  const sizes = new Map<Element, Measured>();
  for (const el of elements) {
    if (!callbackMap.has(el)) continue;
    const node = el as HTMLElement;
    const cs = window.getComputedStyle(node);
    const size = getLayoutSize(node, cs);
    // An element that specifies no writing mode of its own resolves to "" under
    // a DOM emulator, and so does a detached element in Chrome; the CSS initial value
    // is horizontal-tb, so "" is horizontal.
    lastMeasured.set(el, {
      width: size.width,
      height: size.height,
      horizontal: cs.writingMode === "horizontal-tb" || cs.writingMode === "",
    });
    sizes.set(el, { ...size, offsetLeft: node.offsetLeft, offsetTop: node.offsetTop });
  }

  // WRITE PASS: invoke callbacks with the pre-read size.
  for (const el of elements) {
    const cbs = callbackMap.get(el);
    // Snapshot: a callback may sync-unsubscribe a sibling (e.g. an unmount
    // triggered by the first sync's layout) and could otherwise disconnect
    // the shared observer mid-flush.
    if (cbs) {
      const size = sizes.get(el);
      for (const cb of [...cbs]) cb(size);
    }
  }
}

function getObserver(): ResizeObserver {
  if (!observer) {
    observer = new ResizeObserver((entries) => {
      let queued = false;
      for (const entry of entries) {
        const last = lastMeasured.get(entry.target);
        const box = entry.borderBoxSize?.[0];
        // A notification reporting the box the last flush already measured is a
        // no-op: the RO's guaranteed initial observation for a freshly observed
        // element is exactly that, arriving a frame after subscribe already
        // queued and measured it, and re-measuring costs a style recalc for a
        // size we hold. Only sound in a horizontal writing mode — `borderBoxSize`
        // is inline/block relative, so a vertical-mode element whose resize
        // transposed its box would compare equal here and be wrongly skipped;
        // that one falls through to a live measure.
        if (last?.horizontal && box && box.inlineSize === last.width && box.blockSize === last.height) {
          continue;
        }
        pendingElements.add(entry.target);
        queued = true;
      }
      if (queued && rafId === undefined) {
        rafId = requestAnimationFrame(flush);
      }
    });
  }
  return observer;
}

/**
 * Queue `el` for the next batched flush without reading layout. For work driven
 * by something other than `el`'s own resize, where measuring inline would land
 * in the write pass. Costs one frame. No-op if `el` isn't observed.
 *
 * Queues unconditionally: unlike an observer notification there is no entry box
 * to recognise as already-measured, and the caller asked precisely because
 * something other than `el` changed what `el` should render.
 */
export function requestMeasure(el: Element): void {
  if (!callbackMap.has(el)) return;
  pendingElements.add(el);
  if (rafId === undefined) {
    rafId = requestAnimationFrame(flush);
  }
}

/**
 * Observe `el` for resize via a shared ResizeObserver; callbacks are
 * rAF-batched (one frame per tick, across all observed elements) with an
 * immediate initial dispatch. The returned function unsubscribes; the
 * observer disconnects once the last element is released.
 */
export function observeResize(el: Element, callback: Callback): () => void {
  if (typeof ResizeObserver === "undefined") return () => {};

  const obs = getObserver();
  let set = callbackMap.get(el);
  if (!set) {
    set = new Set();
    callbackMap.set(el, set);
    obs.observe(el);
  }
  set.add(callback);

  pendingElements.add(el);
  if (rafId === undefined) {
    rafId = requestAnimationFrame(flush);
  }

  // Guard against double-invocation: a second call after the observer has
  // been torn down and rebuilt could otherwise delete a *new* subscriber's
  // registration for the same element (the `set` closed over here is stale).
  let done = false;
  return () => {
    if (done) return;
    done = true;
    set!.delete(callback);
    if (set!.size === 0) {
      callbackMap.delete(el);
      obs.unobserve(el);
      // A later re-subscribe re-observes from scratch, and its first
      // notification must not be dismissed against a size measured in a
      // previous life of this element.
      lastMeasured.delete(el);
    }
    if (callbackMap.size === 0) {
      if (rafId !== undefined) {
        cancelAnimationFrame(rafId);
        rafId = undefined;
      }
      pendingElements.clear();
      observer?.disconnect();
      observer = null;
    }
  };
}

/**
 * Re-measure `target` whenever `anchor` resizes.
 *
 * Skips the anchor's first dispatch. That one comes from the anchor's own
 * subscribe-time queueing, in the same flush that already measured `target` for
 * `target`'s own subscribe — re-queueing there buys nothing and costs `target` a
 * whole extra flush read.
 */
export function observeAnchor(anchor: Element, target: Element): () => void {
  let first = true;
  return observeResize(anchor, () => {
    if (first) {
      first = false;
      return;
    }
    requestMeasure(target);
  });
}

// ---- upstream: packages/torph/src/lib/utils/constants.ts ----

export const ATTR_ROOT = "torph-root";
export const ATTR_ITEM = "torph-item";
export const ATTR_ID = "torph-id";
export const ATTR_KIND = "torph-kind";
export const ATTR_SLOT = "torph-slot";
export const ATTR_EXITING = "torph-exiting";
export const ATTR_SR = "torph-sr"; // Not a segment — every walk of root.children skips it.
export const ATTR_DEBUG = "torph-debug";
export const EMPTY_ID = "empty";

// ---- upstream: packages/torph/src/lib/utils/types.ts ----

/** Numeric segments slide instead of fading, and digits and symbols slide opposite ways. */
export type SegmentKind = "digit" | "symbol";

export type Segment = {
  id: string;
  string: string;
  /** Absent for ordinary text. */
  kind?: SegmentKind;
};

export interface BaseMorphOptions {
  element: HTMLElement;
  /** Ignored when `ease` is a spring, which settles on its own physics. */
  duration?: number;
  ease?: string | SpringParams;
  locale?: Intl.LocalesArgument;
  disabled?: boolean;
  respectReducedMotion?: boolean;
  onAnimationStart?: () => void;
  onAnimationComplete?: () => void;
}

export const BASE_DEFAULTS = {
  locale: "en",
  duration: 400,
  ease: "cubic-bezier(0.19, 1, 0.22, 1)",
  disabled: false,
  respectReducedMotion: true,
} as const;

// ---- upstream: packages/torph/src/lib/utils/spring.ts ----

export interface SpringParams {
  stiffness?: number;
  damping?: number;
  mass?: number;
  precision?: number;
}

export interface SpringResult {
  easing: string;
  duration: number;
}

function springPosition(t: number, omega0: number, zeta: number): number {
  if (zeta < 1) {
    const omegaD = omega0 * Math.sqrt(1 - zeta * zeta);
    return (
      1 -
      Math.exp(-zeta * omega0 * t) *
        (Math.cos(omegaD * t) +
          ((zeta * omega0) / omegaD) * Math.sin(omegaD * t))
    );
  }

  // Overdamped (includes near-critically-damped)
  const s = Math.sqrt(zeta * zeta - 1);
  const r1 = -omega0 * (zeta + s);
  const r2 = -omega0 * (zeta - s);
  const B = -r1 / (r2 - r1);
  const A = 1 - B;
  return 1 - A * Math.exp(r1 * t) - B * Math.exp(r2 * t);
}

function computeDuration(
  omega0: number,
  zeta: number,
  precision: number,
): number {
  const step = 0.001;
  const maxDuration = 10;
  let settledSince = 0;

  for (let t = 0; t < maxDuration; t += step) {
    if (Math.abs(springPosition(t, omega0, zeta) - 1) > precision) {
      settledSince = 0;
    } else {
      settledSince += step;
      if (settledSince > 0.1) {
        return Math.ceil((t - settledSince + step) * 1000);
      }
    }
  }

  return Math.ceil(maxDuration * 1000);
}

export function resolveEase(
  ease: string | SpringParams,
  fallbackDuration: number,
): { ease: string; duration: number } {
  if (typeof ease === "object") {
    const resolved = spring(ease);
    return { ease: resolved.easing, duration: resolved.duration };
  }
  return { ease, duration: fallbackDuration };
}

const cache = new Map<string, SpringResult>();

export function spring(params?: SpringParams): SpringResult {
  const {
    stiffness = 100,
    damping = 10,
    mass = 1,
    precision = 0.001,
  } = params ?? {};

  const key = `${stiffness}:${damping}:${mass}:${precision}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const omega0 = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));

  const duration = computeDuration(omega0, zeta, precision);
  const numPoints = Math.min(100, Math.max(32, Math.round(duration / 15)));

  const points: string[] = [];
  for (let i = 0; i < numPoints; i++) {
    const t = (i / (numPoints - 1)) * (duration / 1000);
    const value = i === numPoints - 1 ? 1 : springPosition(t, omega0, zeta);
    points.push(Math.round(value * 10000) / 10000 + "");
  }

  // Trim trailing "1" values (keep at least 2)
  while (points.length > 2 && points[points.length - 2] === "1") {
    points.splice(points.length - 2, 1);
  }

  const result: SpringResult = {
    easing: `linear(${points.join(", ")})`,
    duration,
  };

  cache.set(key, result);
  return result;
}

// ---- upstream: packages/torph/src/lib/utils/easing.ts ----

/**
 * Evaluating a CSS easing in JS, so an interrupted animation can be asked how
 * fast it was travelling at the moment it was replaced. Only the forms the
 * library can hand out are understood; anything else returns null, and the
 * caller falls back to starting the next animation from rest.
 */

export type EasingFn = (t: number) => number;

const KEYWORDS: Record<string, [number, number, number, number]> = {
  linear: [0, 0, 1, 1],
  ease: [0.25, 0.1, 0.25, 1],
  "ease-in": [0.42, 0, 1, 1],
  "ease-out": [0, 0, 0.58, 1],
  "ease-in-out": [0.42, 0, 0.58, 1],
};

const axis = (p1: number, p2: number, t: number) => {
  const u = 1 - t;
  return 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t;
};

function cubicBezier(x1: number, y1: number, x2: number, y2: number): EasingFn {
  return (t) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 24; i += 1) {
      const mid = (lo + hi) / 2;
      if (axis(x1, x2, mid) < t) lo = mid;
      else hi = mid;
    }
    return axis(y1, y2, (lo + hi) / 2);
  };
}

/** Positions left out are spread evenly between the nearest given ones. */
function fillStops(stops: (number | null)[]): number[] {
  const filled = [...stops];
  if (filled[0] === null || filled[0] === undefined) filled[0] = 0;
  if (filled[filled.length - 1] === null) filled[filled.length - 1] = 1;

  for (let i = 1; i < filled.length; i += 1) {
    if (filled[i] !== null) continue;
    let next = i;
    while (filled[next] === null) next += 1;
    const start = filled[i - 1]!;
    const step = (filled[next]! - start) / (next - i + 1);
    for (let j = i; j < next; j += 1) filled[j] = start + step * (j - i + 1);
  }

  // Monotonic, so a segment can never span backwards.
  return filled.map((stop, i, all) =>
    i === 0 ? stop! : Math.max(stop!, all[i - 1]!),
  ) as number[];
}

function linearEasing(body: string): EasingFn | null {
  const values: number[] = [];
  const stops: (number | null)[] = [];

  for (const part of body.split(",")) {
    const tokens = part.trim().split(/\s+/).filter(Boolean);
    const value = Number(tokens[0]);
    if (!Number.isFinite(value)) return null;

    const percents = tokens.slice(1);
    if (percents.length > 2) return null;
    if (percents.length === 0) {
      values.push(value);
      stops.push(null);
      continue;
    }
    // Two stops hold the value across the span between them.
    for (const percent of percents) {
      if (!percent.endsWith("%")) return null;
      const stop = Number(percent.slice(0, -1));
      if (!Number.isFinite(stop)) return null;
      values.push(value);
      stops.push(stop / 100);
    }
  }

  if (values.length < 2) return null;
  const positions = fillStops(stops);

  return (t) => {
    if (t <= positions[0]!) return values[0]!;
    const last = positions.length - 1;
    if (t >= positions[last]!) return values[last]!;

    let i = 0;
    while (i < last && positions[i + 1]! < t) i += 1;
    const span = positions[i + 1]! - positions[i]!;
    if (span === 0) return values[i + 1]!;
    return (
      values[i]! + ((values[i + 1]! - values[i]!) * (t - positions[i]!)) / span
    );
  };
}

export function parseEasing(ease: string): EasingFn | null {
  const value = ease.trim().toLowerCase();

  const keyword = KEYWORDS[value];
  if (keyword) return cubicBezier(...keyword);

  const bezier = /^cubic-bezier\(([^)]*)\)$/.exec(value);
  if (bezier) {
    const n = bezier[1]!.split(",").map((part) => Number(part.trim()));
    if (n.length !== 4 || n.some((v) => !Number.isFinite(v))) return null;
    return cubicBezier(n[0]!, n[1]!, n[2]!, n[3]!);
  }

  const linear = /^linear\(([^)]*)\)$/.exec(value);
  if (linear) return linearEasing(linear[1]!);

  return null;
}

const H = 1e-4;

/** Progress per unit of normalised time. Forward, so a knot reports the segment ahead. */
export function slopeAt(easing: EasingFn, t: number): number {
  const a = Math.min(Math.max(t, 0), 1 - H);
  return (easing(a + H) - easing(a)) / H;
}

// ---- upstream: packages/torph/src/lib/utils/lcs.ts ----

/**
 * Longest common subsequence as paired indices. Walked forwards so ties go to the
 * earliest match — backwards, a repeated word flies across the block.
 */
export function lcsIndices(a: string[], b: string[]): [number[], number[]] {
  const m = a.length;
  const n = b.length;
  // dp[i][j] = length of the LCS of a[i..] and b[j..]
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0),
  );

  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i]![j] =
        a[i] === b[j]
          ? dp[i + 1]![j + 1]! + 1
          : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
    }
  }

  const ai: number[] = [];
  const bi: number[] = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      ai.push(i);
      bi.push(j);
      i++;
      j++;
    } else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) {
      i++;
    } else {
      j++;
    }
  }

  return [ai, bi];
}

// ---- upstream: packages/torph/src/lib/utils/animate.ts ----

// A share of the morph, never a fixed length — a cap here leaves a character opaque
// and motionless for the rest of a long duration.
export function fadeDuration(duration: number, fraction: number): number {
  return duration * fraction;
}

export function parseTranslate(element: HTMLElement): {
  tx: number;
  ty: number;
} {
  const transform = getComputedStyle(element).transform;
  if (!transform || transform === "none") return { tx: 0, ty: 0 };
  const match = transform.match(/matrix\(([^)]+)\)/);
  if (!match) return { tx: 0, ty: 0 };
  const v = match[1]!.split(",").map(Number);
  return { tx: v[4] || 0, ty: v[5] || 0 };
}

// The box a `width`/`height` write means. `getBoundingClientRect` is the visual box, so
// a rotated or scaled ancestor inflates it — and the container transition writes what it
// measures straight back, compounding every morph.
export function layoutSize(element: HTMLElement): {
  width: number;
  height: number;
} {
  const style = getComputedStyle(element);
  const width = parseFloat(style.width);
  const height = parseFloat(style.height);
  if (Number.isNaN(width) || Number.isNaN(height)) {
    const rect = element.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  }
  return { width, height };
}

export function cancelAnimations(element: HTMLElement): {
  tx: number;
  ty: number;
  opacity: number;
} {
  const { tx, ty } = parseTranslate(element);
  const opacity = Number(getComputedStyle(element).opacity) || 1;
  element.getAnimations().forEach((a) => a.cancel());
  return { tx, ty, opacity };
}

type PendingTransition = {
  stop: () => void;
  onCancel?: () => void;
  /** Read before the abort, while the animations are still running. */
  snapshot: () => { width: AxisState; height: AxisState };
};

type Axis = {
  anim: Animation;
  from: number;
  to: number;
  easing: string;
  /** The curve actually in effect, carry included. */
  curve: EasingFn | null;
  /** When the curve notionally began, so elapsed survives a resume. */
  startedAt: number;
};

/** An axis mid-flight: where it was headed, how far it got, how fast it was going. */
type AxisState = {
  from: number;
  to: number;
  easing: string;
  curve: EasingFn | null;
  /** null once settled or cancelled — nothing to resume or carry. */
  elapsed: number | null;
  velocity: number;
};

// Normalised velocity is distance-relative, so a near-zero distance would launch the
// box across the screen. These bound that, and the overshoot the carry can produce.
const CARRY_MAX = 8;
const CARRY_OVERSHOOT = 0.1;
const CARRY_MIN_DELTA = 0.5;

// Measurement noise, not a moved target.
const SAME_TARGET = 0.5;

/**
 * Not `anim.currentTime`: a fresh animation is play-pending with an unresolved start
 * time, so seeking it sets a hold time that reads back unchanged until it is ready on
 * the next frame. Resuming once a frame lands exactly on that boundary, and elapsed
 * would stop accumulating — the box would sit still while the curve was replaced.
 */
const now = () => performance.now();

/**
 * The author's curve, leaving at the speed the box is already travelling.
 *
 * A morph arriving mid-transition restarts the curve at t=0, so a fast run of them
 * only ever plays each curve's opening sliver — the box crawls while the value races
 * ahead. Adding `k · t(1-t)^m` fixes the start slope to the carried velocity without
 * moving either endpoint; `m` narrows as `k` grows, holding the peak inside
 * CARRY_OVERSHOOT. Momentum is only ever added, never subtracted: a curve that starts
 * faster than the box was moving is the author's business, and slowing it to match
 * would make a value that had settled start sluggishly.
 */
export function carry(
  base: EasingFn,
  normalisedVelocity: number,
): { curve: EasingFn; k: number } {
  // `Math.max(0, NaN)` is NaN and `NaN <= 0` is false, so the guard has to be positive.
  const k = Math.max(
    0,
    Math.min(CARRY_MAX, normalisedVelocity) - slopeAt(base, 0),
  );
  if (!(k > 0)) return { curve: base, k: 0 };

  const bump = Math.max(3, Math.ceil(k / (Math.E * CARRY_OVERSHOOT)) - 1);
  return {
    curve: (t) => (t >= 1 ? 1 : base(t) + k * t * Math.pow(1 - t, bump)),
    k,
  };
}

/** Sampled fine enough that a segment is shorter than a frame at 120Hz. */
export function sampleEasing(curve: EasingFn, duration: number): string {
  const points = Math.min(120, Math.max(32, Math.round(duration / 8)));
  const values: string[] = [];
  for (let i = 0; i < points; i += 1) {
    const t = i / (points - 1);
    const value = i === points - 1 ? 1 : curve(t);
    values.push(`${Math.round(value * 10000) / 10000}`);
  }
  return `linear(${values.join(", ")})`;
}

function animateAxis(
  element: HTMLElement,
  property: "width" | "height",
  from: number,
  to: number,
  previous: AxisState | undefined,
  duration: number,
  ease: string,
  base: EasingFn | null,
): Axis {
  const run = (
    from: number,
    to: number,
    easing: string,
    curve: EasingFn | null,
    seek?: number,
  ): Axis => {
    const anim = element.animate(
      [{ [property]: `${from}px` }, { [property]: `${to}px` }],
      { duration, easing, fill: "both" },
    );
    if (seek !== undefined) anim.currentTime = seek;
    return { anim, from, to, easing, curve, startedAt: now() - (seek ?? 0) };
  };

  /**
   * The target has not moved, so the curve already in flight is still the right one —
   * resumed at the phase it had reached rather than started over. A value updated
   * faster than the morph settles restarts this every frame, and a curve that is slow
   * to leave never gets past its opening sliver: the box crawls while the text races
   * ahead. Nothing to carry here, because nothing was interrupted.
   */
  if (
    previous &&
    previous.elapsed !== null &&
    Math.abs(previous.to - to) < SAME_TARGET
  ) {
    return run(
      previous.from,
      previous.to,
      previous.easing,
      previous.curve,
      previous.elapsed,
    );
  }

  const delta = to - from;
  let easing = ease;
  let curve = base;

  if (base && Math.abs(delta) > CARRY_MIN_DELTA) {
    const carried = carry(base, ((previous?.velocity ?? 0) * duration) / delta);
    if (carried.k > 0) {
      curve = carried.curve;
      easing = sampleEasing(carried.curve, duration);
    }
  }

  return run(from, to, easing, curve);
}

function axisState(axis: Axis, duration: number): AxisState {
  // A cancelled animation has nothing left to resume or carry, and reads back as null.
  const gone = axis.anim.currentTime === null;
  const run = now() - axis.startedAt;
  const settled = gone || !Number.isFinite(run) || run >= duration || run < 0;
  const elapsed = settled ? null : run;

  return {
    from: axis.from,
    to: axis.to,
    easing: axis.easing,
    curve: axis.curve,
    elapsed,
    velocity:
      elapsed === null || !axis.curve
        ? 0
        : ((axis.to - axis.from) * slopeAt(axis.curve, elapsed / duration)) /
          duration,
  };
}

const pending = new WeakMap<HTMLElement, PendingTransition>();

function inFlight(element: HTMLElement) {
  return pending.get(element)?.snapshot();
}

/**
 * Releases the size to the author's CSS rather than pinning it to `auto` — an inline
 * style outranks a stylesheet, so `auto` would override the page for good and a root
 * set to `width: 100%` would shrink to its content on the first morph.
 */
function restoreSize(element: HTMLElement) {
  element.style.width = "";
  element.style.height = "";
  element.style.transitionProperty = "";
}

// A running transition's `fill: "both"` outranks inline styles, so stop it first.
export function abortContainerTransition(element: HTMLElement) {
  const entry = pending.get(element);
  if (!entry) return;
  pending.delete(element);
  entry.stop();
  entry.onCancel?.();
}

// Fires neither callback — teardown is not an animation event.
export function clearContainerTransition(element: HTMLElement) {
  const entry = pending.get(element);
  if (entry) {
    pending.delete(element);
    entry.stop();
  }
  restoreSize(element);
}

export function transitionContainerSize(
  element: HTMLElement,
  oldWidth: number,
  oldHeight: number,
  duration: number,
  ease: string,
  onComplete?: () => void,
  onCancel?: () => void,
) {
  // Read before the abort, off the curves the box is still riding.
  const previous = inFlight(element);
  abortContainerTransition(element);

  if (oldWidth === 0 || oldHeight === 0) {
    restoreSize(element);
    onCancel?.();
    return;
  }

  // WAAPI drives the size instead, sharing a start time with the items. Cleared, not
  // set to `auto`, so what gets measured is the size the author's CSS asks for.
  element.style.transitionProperty = "none";
  element.style.width = "";
  element.style.height = "";
  void element.offsetWidth;

  const { width: newWidth, height: newHeight } = layoutSize(element);
  const base = parseEasing(ease);

  // One per axis: each carries its own momentum, so they need their own curves.
  const width = animateAxis(
    element,
    "width",
    oldWidth,
    newWidth,
    previous?.width,
    duration,
    ease,
    base,
  );
  const height = animateAxis(
    element,
    "height",
    oldHeight,
    newHeight,
    previous?.height,
    duration,
    ease,
    base,
  );

  const stop = () => {
    width.anim.cancel();
    height.anim.cancel();
  };

  width.anim.onfinish = () => {
    pending.delete(element);
    stop();
    restoreSize(element);
    onComplete?.();
  };

  pending.set(element, {
    stop,
    onCancel,
    snapshot: () => ({
      width: axisState(width, duration),
      height: axisState(height, duration),
    }),
  });
}

// An emptied value has nothing left to size to, so the container would collapse and
// drag the exiting text with it when centred.
export function holdContainerSize(
  element: HTMLElement,
  width: number,
  height: number,
  duration: number,
  onComplete?: () => void,
  onCancel?: () => void,
) {
  abortContainerTransition(element);

  element.style.transitionProperty = "none";
  element.style.width = `${width}px`;
  element.style.height = `${height}px`;

  const timer = setTimeout(() => {
    pending.delete(element);
    restoreSize(element);
    onComplete?.();
  }, duration);

  // Pinned, not animated — there is no motion to hand on.
  const held = (value: number): AxisState => ({
    from: value,
    to: value,
    easing: "linear",
    curve: null,
    elapsed: null,
    velocity: 0,
  });
  pending.set(element, {
    stop: () => clearTimeout(timer),
    onCancel,
    snapshot: () => ({ width: held(width), height: held(height) }),
  });
}

// ---- upstream: packages/torph/src/lib/utils/flip.ts ----

export type Measures = {
  [key: string]: { x: number; y: number };
};

export function measure(element: HTMLElement): Measures {
  const children = Array.from(element.children) as HTMLElement[];
  const measures: Measures = {};
  const rootRect = element.getBoundingClientRect();

  children.forEach((child, index) => {
    if (child.hasAttribute(ATTR_EXITING)) return;
    if (child.hasAttribute(ATTR_SR)) return;
    if (child.tagName === "BR") return;
    const key = child.getAttribute(ATTR_ID) || `child-${index}`;
    const rect = child.getBoundingClientRect();
    const { tx, ty } = parseTranslate(child);
    measures[key] = {
      // Subtracting the transform keeps this subpixel, where offsets would round.
      x: rect.left - rootRect.left - tx,
      y: rect.top - rootRect.top - ty,
    };
  });

  return measures;
}

export function computeDelta(
  prev: Measures,
  current: Measures,
  key: string,
): { dx: number; dy: number } {
  const p = prev[key];
  const c = current[key];
  if (!p || !c) return { dx: 0, dy: 0 };
  return { dx: p.x - c.x, dy: p.y - c.y };
}

/** Nearest persisting neighbour by ID, searching backward first, then forward. */
export function findNearestAnchor(
  targetIndex: number,
  ids: string[],
  persistentIds: Set<string>,
  direction: "backward-first" | "forward-first" = "backward-first",
): string | null {
  const [firstDir, secondDir] =
    direction === "backward-first"
      ? (["backward", "forward"] as const)
      : (["forward", "backward"] as const);

  const search = (dir: "backward" | "forward"): string | null => {
    if (dir === "backward") {
      for (let j = targetIndex - 1; j >= 0; j--) {
        if (persistentIds.has(ids[j]!)) return ids[j]!;
      }
    } else {
      for (let j = targetIndex + 1; j < ids.length; j++) {
        if (persistentIds.has(ids[j]!)) return ids[j]!;
      }
    }
    return null;
  };

  return search(firstDir) ?? search(secondDir);
}

export function resolveExitingAnchors(
  oldChildren: HTMLElement[],
  exiting: Set<HTMLElement>,
  oldIds: string[],
  newIds: Set<string>,
): Map<HTMLElement, string | null> {
  const persistentOldIds = new Set(
    oldIds.filter((id, i) => newIds.has(id) && !exiting.has(oldChildren[i]!)),
  );

  const anchors = new Map<HTMLElement, string | null>();
  for (let i = 0; i < oldChildren.length; i++) {
    const child = oldChildren[i]!;
    if (!exiting.has(child)) continue;
    anchors.set(
      child,
      findNearestAnchor(i, oldIds, persistentOldIds, "forward-first"),
    );
  }

  return anchors;
}

// ---- upstream: packages/torph/src/lib/utils/dom.ts ----

/**
 * Where a `left`/`top` write puts the box. Not `getBoundingClientRect`, which is the
 * visual box: a rotated or scaled ancestor inflates it, and the inflated numbers are
 * then read back as layout and transformed a second time. The walk stops at the
 * container when it is positioned, and otherwise carries on to the ancestor an
 * absolute child would resolve against — the same one either way.
 */
function layoutOffset(child: HTMLElement, container: HTMLElement) {
  let x = 0;
  let y = 0;
  for (
    let node: HTMLElement | null = child;
    node && node !== container;
    node = node.offsetParent as HTMLElement | null
  ) {
    x += node.offsetLeft;
    y += node.offsetTop;
  }
  return { x, y };
}

/** Every element here is a fragment of the value, so all of it is aria-hidden. */
function createItem(tagName: "span" | "br", id: string): HTMLElement {
  const element = document.createElement(tagName);
  element.setAttribute(ATTR_ITEM, "");
  element.setAttribute(ATTR_ID, id);
  element.setAttribute("aria-hidden", "true");
  return element;
}

export function detachFromFlow(
  container: HTMLElement,
  elements: HTMLElement[],
) {
  const snapshots = new Map<
    HTMLElement,
    {
      left: number;
      top: number;
      width: number;
      height: number;
      opacity: number;
    }
  >();
  for (const child of elements) {
    if (child.tagName === "BR") continue;
    const { x, y } = layoutOffset(child, container);
    // Where the box had got to, so an interrupt does not jump. Scale is dropped with
    // the animation, as it is everywhere else a running transform is picked up.
    const { tx, ty } = parseTranslate(child);
    const { width, height } = layoutSize(child);
    const opacity = Number(getComputedStyle(child).opacity) || 1;
    child.getAnimations().forEach((a) => a.cancel());
    snapshots.set(child, {
      left: x + tx,
      top: y + ty,
      width,
      height,
      opacity,
    });
  }

  // BRs can't be animated, so they leave the flow before reconciliation.
  for (let i = elements.length - 1; i >= 0; i--) {
    if (elements[i]!.tagName === "BR") {
      elements[i]!.remove();
      elements.splice(i, 1);
    }
  }

  elements.forEach((child) => {
    const snap = snapshots.get(child)!;
    child.setAttribute(ATTR_EXITING, "");
    child.style.position = "absolute";
    child.style.pointerEvents = "none";
    child.style.left = `${snap.left}px`;
    child.style.top = `${snap.top}px`;
    child.style.width = `${snap.width}px`;
    child.style.height = `${snap.height}px`;
    child.style.opacity = String(snap.opacity);
  });
}

export function splitWordSpans(
  element: HTMLElement,
  splits: Map<string, Segment[]>,
) {
  if (splits.size === 0) return;

  const children = Array.from(element.children) as HTMLElement[];
  const split = new Set<string>();

  for (const child of children) {
    if (child.hasAttribute(ATTR_EXITING)) continue;
    const id = child.getAttribute(ATTR_ID);
    if (!id || split.has(id)) continue;
    const charSegs = splits.get(id);
    if (!charSegs) continue;
    split.add(id);

    for (const seg of charSegs) {
      const span = createItem("span", seg.id);
      syncSlot(span, seg);
      child.before(span);
    }
    child.remove();
  }
}

/**
 * Gives a numeric character the nested box its slide needs, and takes it away when
 * it stops being one — both directions have to work on a reused element. The kind
 * goes on the element because an exit outlives the segment that described it.
 */
function syncSlot(element: HTMLElement, segment: Segment) {
  if (!segment.kind) {
    element.removeAttribute(ATTR_KIND);
    element.removeAttribute(ATTR_SLOT);
    // Also discards the inner span, if this element had one.
    element.textContent = segment.string;
    return;
  }

  element.setAttribute(ATTR_KIND, segment.kind);
  element.setAttribute(ATTR_SLOT, "");

  let inner = element.firstElementChild as HTMLElement | null;
  if (!inner) {
    element.textContent = "";
    inner = document.createElement("span");
    element.appendChild(inner);
  }
  inner.textContent = segment.string;
}

/** The box the slide is applied to — the nested span for a slot, else the element. */
export function moverOf(element: HTMLElement): HTMLElement {
  return element.hasAttribute(ATTR_SLOT)
    ? ((element.firstElementChild as HTMLElement | null) ?? element)
    : element;
}

export function reconcileChildren(
  element: HTMLElement,
  oldChildren: HTMLElement[],
  newIds: Set<string>,
  segments: Segment[],
) {
  const reusable = new Map<string, HTMLElement>();
  oldChildren.forEach((child) => {
    const id = child.getAttribute(ATTR_ID) as string;
    if (newIds.has(id) && !child.hasAttribute(ATTR_EXITING)) {
      reusable.set(id, child);
      child.remove();
    }
  });

  // Remove stale text nodes left over from disabled-mode textContent updates
  Array.from(element.childNodes).forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      node.remove();
    }
  });

  segments.forEach((segment) => {
    // Claimed once only: a shared ID would leave the earlier position empty.
    const existing = reusable.get(segment.id);
    if (existing) reusable.delete(segment.id);

    if (segment.string === "\n") {
      if (existing && existing.tagName === "BR") {
        element.appendChild(existing);
      } else {
        element.appendChild(createItem("br", segment.id));
      }
      return;
    }

    if (existing && existing.tagName !== "BR") {
      // A group replacement leaves a shared origin behind; the next morph would use it.
      existing.style.transformOrigin = "";
      syncSlot(existing, segment);
      element.appendChild(existing);
    } else {
      const span = createItem("span", segment.id);
      syncSlot(span, segment);
      element.appendChild(span);
    }
  });
}

// ---- upstream: packages/torph/src/lib/utils/styles.ts ----

const TORPH_CSS = `
[${ATTR_ROOT}] {
  display: inline-block;
  position: relative;
  vertical-align: top;
  will-change: width, height;
  white-space: nowrap;
  text-align: inherit;
}

[${ATTR_ITEM}]:not(br) {
  display: inline-block;
  position: relative;
  will-change: opacity, transform;
  transform: none;
  opacity: 1;
}

/*
 * The value once as plain text — every other child is an aria-hidden fragment.
 * Out of flow, because the engine measures every child of the root. Clipped
 * rather than display: none, which would take it out of the a11y tree as well.
 * user-select: none, or a copied selection pastes the value twice.
 */
[${ATTR_SR}] {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  border: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: pre;
  -webkit-user-select: none;
  user-select: none;
}

/*
 * A digit slides a whole line box to arrive, so it needs its own box to hide
 * behind. Not the root: that spans every line, so clipping there leaves a digit
 * on a middle line sliding over its neighbour in view. The transform sits on the
 * child, so the slide never touches the slot's rect and the FLIP pass stays
 * oblivious. clip-path, not overflow — an inline-block whose overflow is
 * anything but visible has its baseline synthesized to the bottom margin edge
 * (CSS 2.1 §10.8.1), and engines disagree on whether overflow: clip counts.
 * The inline axis stays open so glyph overhang is not shaved.
 */
[${ATTR_SLOT}] {
  clip-path: inset(0 -100vw);
}

[${ATTR_SLOT}] > span {
  display: inline-block;
  will-change: opacity, transform;
}

/*
 * Softens the clip above into a gradient, positionally rather than on a timer, so
 * it stays in step with the slide at any duration. The band (--torph-fade, 0 for a
 * hard edge) must eat into the box: the clip trims at the border box, so a ramp
 * reaching past it sits in territory already removed and is never seen. no-clip
 * plus repeat-x is what carries the profile across glyph overhang.
 */
@supports (mask-clip: no-clip) or (-webkit-mask-clip: no-clip) {
  [${ATTR_SLOT}] {
    --torph-mask: linear-gradient(
      to bottom,
      transparent,
      #000 var(--torph-fade, 0.15em),
      #000 calc(100% - var(--torph-fade, 0.15em)),
      transparent
    );
    -webkit-mask-image: var(--torph-mask);
    mask-image: var(--torph-mask);
    -webkit-mask-repeat: repeat-x;
    mask-repeat: repeat-x;
    -webkit-mask-clip: no-clip;
    mask-clip: no-clip;
  }
}

[${ATTR_ROOT}][${ATTR_DEBUG}] {
  outline: 2px solid magenta;
  [${ATTR_ITEM}] {
    outline: 2px solid cyan;
    outline-offset: -4px;
  }
}`;

let styleEl: HTMLStyleElement | null = null;
let refCount = 0;

export function addStyles() {
  refCount++;
  if (styleEl) return;

  styleEl = document.createElement("style");
  styleEl.dataset.torph = "true";
  styleEl.textContent = TORPH_CSS;
  document.head.appendChild(styleEl);
}

export function removeStyles() {
  refCount--;
  if (refCount > 0 || !styleEl) return;

  styleEl.remove();
  styleEl = null;
}

// ---- upstream: packages/torph/src/lib/utils/reduced-motion.ts ----

export type ReducedMotionState = {
  readonly prefersReducedMotion: boolean;
  destroy: () => void;
};

export function createReducedMotionListener(): ReducedMotionState {
  if (typeof window === "undefined") {
    return { prefersReducedMotion: false, destroy: () => {} };
  }

  const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const state = { prefersReducedMotion: mediaQuery.matches, destroy };

  function onChange(event: MediaQueryListEvent) {
    state.prefersReducedMotion = event.matches;
  }

  function destroy() {
    mediaQuery.removeEventListener("change", onChange);
  }

  mediaQuery.addEventListener("change", onChange);
  return state;
}

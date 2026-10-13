"use client";

import { type Ref, type MutableRefObject, type RefCallback, Children, cloneElement, forwardRef, Fragment, isValidElement, useMemo, type ComponentPropsWithoutRef, type ElementType, type ForwardedRef, type ReactElement, type ReactNode, useEffect, useLayoutEffect, useRef, useCallback, useState, createElement, type CSSProperties, type ComponentPropsWithRef } from "react";
import { generateClipPath, type SmoothCornerOptions, type CornerConfig, type PerCornerConfig, type EffectsConfig, type ShadowConfig, type BorderConfig } from "@/lib/smooth-corners-path";
import { createSvgEffects, createDropShadow, observeResize, observeAnchor, getLayoutSize, DEFAULT_SHADOW, extractAndStripEffects, restoreStyles, acquirePosition, releasePosition, hasEffects, mergeEffects, type Measured, type MeasuredSize, type OverlayOffset, acquireIsolation, releaseIsolation, cornerOptionsToBorderRadius } from "@/lib/smooth-corners-effects";

// ---- upstream: packages/react/src/compose-refs.ts ----
function setRef<T>(ref: Ref<T> | undefined | null, value: T | null): void | (() => void) {
  if (typeof ref === "function") return ref(value);
  if (ref) (ref as MutableRefObject<T | null>).current = value;
}

/**
 * Compose refs (callback or object) into one callback ref, preserving
 * React 19 callback-ref cleanups.
 */
export function composeRefs<T>(
  ...refs: Array<Ref<T> | undefined | null>
): RefCallback<T> {
  return (node) => {
    let hasCleanup = false;
    const cleanups = refs.map((ref) => {
      const cleanup = setRef(ref, node);
      if (typeof cleanup === "function") hasCleanup = true;
      return cleanup;
    });

    if (!hasCleanup) return;

    return () => {
      for (let i = 0; i < cleanups.length; i++) {
        const cleanup = cleanups[i];
        if (typeof cleanup === "function") cleanup();
        else setRef(refs[i], null);
      }
    };
  };
}

// ---- upstream: packages/react/src/slot.tsx ----
type AnyProps = Record<string, unknown>;

function mergeProps(parent: AnyProps, child: AnyProps): AnyProps {
  const merged: AnyProps = { ...parent };
  for (const key of Object.keys(child)) {
    const childValue = child[key];
    const parentValue = merged[key];

    if (/^on[A-Z]/.test(key) && typeof childValue === "function") {
      if (typeof parentValue === "function") {
        merged[key] = (...args: unknown[]) => {
          (childValue as (...a: unknown[]) => unknown)(...args);
          // Child's event.preventDefault() opts out of the composed parent handler.
          const first = args[0] as { defaultPrevented?: boolean } | undefined;
          if (first && first.defaultPrevented) return;
          (parentValue as (...a: unknown[]) => unknown)(...args);
        };
      } else {
        merged[key] = childValue;
      }
    } else if (key === "className") {
      merged[key] = [parentValue, childValue].filter(Boolean).join(" ");
    } else if (key === "style") {
      merged[key] = { ...(parentValue as object), ...(childValue as object) };
    } else {
      merged[key] = childValue;
    }
  }
  return merged;
}

/**
 * Element-specific props shape for `Slot`. The generic parameter only
 * tightens what TypeScript accepts at the call site; the runtime forwards
 * every prop to the cloned child regardless of type.
 *
 * ```tsx
 * <Slot<"a"> href="/x"><a>link</a></Slot>
 * ```
 */
export type SlotPropsFor<E extends ElementType> = Omit<
  ComponentPropsWithoutRef<E>,
  "children"
> & {
  children?: ReactNode;
};

function SlotImpl<E extends ElementType = ElementType>(
  props: SlotPropsFor<E>,
  forwardedRef: ForwardedRef<HTMLElement>,
): ReactElement | null {
  const { children, ...rest } = props as SlotPropsFor<ElementType>;
  const array = Children.toArray(children);
  if (array.length === 0) {
    throw new Error("Slot: `asChild` expects a single child element, received none.");
  }
  if (array.length > 1) {
    throw new Error(
      "Slot: `asChild` expects a single child element, received " + array.length + ".",
    );
  }
  const child = array[0];
  if (!isValidElement(child)) {
    throw new Error(
      "Slot: `asChild` expects a React element as its child (e.g. <button>), not a " +
        (typeof child === "string" ? "string." : typeof child + "."),
    );
  }
  if (child.type === Fragment) {
    throw new Error(
      "Slot: `asChild` expects a single element as its child, not a Fragment. Unwrap the Fragment so Slot can merge props onto a real element.",
    );
  }

  const childElement = child as ReactElement<AnyProps> & { ref?: Ref<HTMLElement> };
  const childProps = (childElement.props ?? {}) as AnyProps;
  // React 19 moves refs onto `element.props.ref`; React 18 keeps them on the
  // element's own `.ref` slot and emits a deprecation `console.error` in dev
  // when read from there. Prefer `props.ref` with a fallback so we work on
  // both versions without warning.
  const existingRef =
    (childProps as { ref?: Ref<HTMLElement> }).ref ??
    (childElement as unknown as { ref?: Ref<HTMLElement> }).ref;
  const merged = mergeProps(rest as AnyProps, childProps);
  // Memoize so an unrelated parent re-render doesn't hand the child a fresh
  // callback ref, which React would detach then re-attach.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const composedRef = useMemo(
    () => composeRefs(forwardedRef, existingRef),
    [forwardedRef, existingRef],
  );
  return cloneElement(childElement, {
    ...merged,
    ref: composedRef,
  } as AnyProps);
}

/**
 * Clones its single child element, merging the Slot's own props onto the
 * child and composing event handlers and refs. Backs the `asChild` prop on
 * <SmoothCorners />.
 */
export const Slot = forwardRef(SlotImpl) as <E extends ElementType = ElementType>(
  props: SlotPropsFor<E> & { ref?: Ref<HTMLElement> },
) => ReactElement | null;

// ---- upstream: packages/react/src/use-smooth-corners.ts ----
/**
 * `useLayoutEffect` on the client, `useEffect` during SSR — mutate the DOM
 * synchronously after layout (no flash of un-clipped corners or un-stripped
 * borders) without triggering React's SSR warning.
 */
export const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

function syncEffects(
  options: SmoothCornerOptions,
  merged: EffectsConfig,
  effectsHandle: ReturnType<typeof createSvgEffects>,
  shadowHandle: ReturnType<typeof createDropShadow> | undefined,
  width: number, height: number,
  offset: OverlayOffset,
): void {
  effectsHandle.update(options, merged, width, height, offset);
  // shadowHandle is lazy — border-only consumers never mount the drop-shadow SVG.
  shadowHandle?.update(options, merged.shadow ?? DEFAULT_SHADOW, width, height, offset);
}

interface State {
  el: HTMLElement;
  savedClipPath: string;
  extracted: ReturnType<typeof extractAndStripEffects> | undefined;
  effectsHandle: ReturnType<typeof createSvgEffects> | undefined;
  shadowHandle: ReturnType<typeof createDropShadow> | undefined;
  anchor: HTMLElement | null;
  didAcquire: boolean;
  unobserveAnchor: (() => void) | undefined;
  // Border-box size an extraction just measured, handed to the next sync so it
  // doesn't read the same element's computed style a second time in the same
  // commit — and that second read would be a full style recalc, because the
  // extraction's border/padding strip dirtied style in between. Consumed once
  // (extraction and the sync that follows it are the same layout state);
  // every later sync measures for itself.
  pendingSize: MeasuredSize | undefined;
  // Last-synced snapshot. runSync bails when nothing changed, which keeps
  // the every-commit re-clip at one computed-style read per render. `null`
  // key = invalidated (effects state mutated outside the render keys).
  lastWidth: number;
  lastHeight: number;
  lastSyncKey: string | null;
  lastOffsetX: number;
  lastOffsetY: number;
  // SSR border-radius fallback the wrapper wrote (undefined when the user
  // supplied their own border-radius). CSS intersects border-radius with the
  // clip-path, and the rounded rect is a strict subset of the squircle, so the
  // fallback must be cleared once the clip-path lands or it cancels smoothing
  // on the element's own background. Restored on teardown for remount safety.
  fallbackBorderRadius: string | undefined;
  clearedFallbackRadius: boolean;
}

interface SyncRefs {
  optionsRef: React.MutableRefObject<SmoothCornerOptions>;
  effectsPropRef: React.MutableRefObject<EffectsConfig | undefined>;
  wrapperRefRef: React.MutableRefObject<React.RefObject<HTMLElement | null> | undefined>;
  skipShadowHandleRef: React.MutableRefObject<boolean>;
  onExtractedShadowRef: React.MutableRefObject<
    ((shadow: ShadowConfig | ShadowConfig[] | undefined) => void) | undefined
  >;
  syncKeyRef: React.MutableRefObject<string>;
  fallbackBorderRadiusRef: React.MutableRefObject<string | undefined>;
}

/**
 * Apply the latest corner options and effects. Idempotent and lazy:
 * handles are created on first sight of effects, reused thereafter, and a
 * zero-size element bails out (the next resize tick picks it up).
 */
function runSync(s: State, refs: SyncRefs, measured?: Measured | MeasuredSize): void {
  const merged = mergeEffects(s.extracted, refs.effectsPropRef.current);
  if (hasEffects(merged))
    ensureHandles(s, merged, refs.wrapperRefRef.current, refs.skipShadowHandleRef.current);

  // Resize ticks thread the size the observer measured for this flush, and a
  // just-finished extraction threads the size it already read (see
  // `State.pendingSize`). Only a sync with neither — the every-commit one —
  // reads here, deliberately, for WebKit mid-animation correctness. The
  // pending size is dropped either way: once a caller has threaded its own
  // measurement, an older extraction snapshot can only be staler.
  const pending = s.pendingSize;
  s.pendingSize = undefined;
  const { width, height } = measured ?? pending ?? getLayoutSize(s.el);
  if (width <= 0 || height <= 0) return;

  // In the guard because an anchor can move the element without resizing it;
  // threaded from the read pass so it never becomes a write-pass layout read.
  // An extraction size carries no offsets, on purpose: `offsetLeft` is not a
  // computed-style read, so the mount path is free to take it directly.
  const placed = measured && "offsetLeft" in measured ? measured : undefined;
  const anchored = s.effectsHandle !== undefined;
  const offsetX = anchored ? (placed?.offsetLeft ?? s.el.offsetLeft) : 0;
  const offsetY = anchored ? (placed?.offsetTop ?? s.el.offsetTop) : 0;

  const key = refs.syncKeyRef.current;
  if (
    width === s.lastWidth && height === s.lastHeight && key === s.lastSyncKey &&
    offsetX === s.lastOffsetX && offsetY === s.lastOffsetY
  ) return;
  s.lastWidth = width;
  s.lastHeight = height;
  s.lastSyncKey = key;
  s.lastOffsetX = offsetX;
  s.lastOffsetY = offsetY;

  s.el.style.clipPath = generateClipPath(width, height, refs.optionsRef.current);
  s.el.setAttribute("data-state", "ready");

  // The clip-path is now the silhouette; drop the SSR border-radius fallback so
  // it stops intersecting (and squaring off) the squircle. Only clears the
  // fallback the wrapper wrote — a user-supplied border-radius leaves this unset.
  if (s.fallbackBorderRadius !== undefined && !s.clearedFallbackRadius) {
    s.el.style.borderRadius = "";
    s.clearedFallbackRadius = true;
  }

  if (s.effectsHandle) {
    syncEffects(refs.optionsRef.current, merged, s.effectsHandle, s.shadowHandle, width, height, { x: offsetX, y: offsetY });
  }
}

/**
 * Ensure the overlay handles exist for `merged`. The anchor is captured
 * once so a late-arriving shadow piggy-backs on the same ref-counted
 * position; drop-shadow setup (and its `isolation:isolate` anchor mutation)
 * is skipped for border-only configs. Idempotent, so no path double-acquires.
 */
function ensureHandles(
  s: State,
  merged: EffectsConfig,
  wrapperRef: React.RefObject<HTMLElement | null> | undefined,
  skipShadowHandle: boolean,
): void {
  if (!s.anchor) {
    // A ref aimed at the element itself is ignored: `clip-path` clips its own
    // subtree, so an overlay nested there could never paint an outer border.
    const supplied = wrapperRef?.current;
    const wrapper = supplied && supplied !== s.el ? supplied : null;
    const anchor = wrapper ?? s.el.parentElement;
    if (!anchor) return;
    s.anchor = anchor;
    s.didAcquire = acquirePosition(anchor);
    // An anchor can move the element without resizing it, so the element is
    // re-measured whenever the anchor resizes. The re-measure is queued rather
    // than taken inline because the dispatch runs in the write pass. The
    // anchor's own first dispatch is suppressed: it lands in the same flush
    // that already measured the element for its own subscribe, so re-queueing
    // there would buy nothing and cost the element an extra layout read.
    s.unobserveAnchor = observeAnchor(anchor, s.el);
  }
  if (!s.effectsHandle) {
    s.effectsHandle = createSvgEffects(s.anchor, s.el);
  }
  if (!s.shadowHandle && merged.shadow && !skipShadowHandle) {
    s.shadowHandle = createDropShadow(s.anchor, s.el);
  }
}

export interface UseEffectsOptions {
  wrapperRef?: React.RefObject<HTMLElement | null>;
  effects?: EffectsConfig;
  autoEffects?: boolean;
  /**
   * Opt out of the SVG drop-shadow handle. Set this when you're rendering
   * the shadow yourself — e.g. a CSS `box-shadow` on a sibling element, or
   * any other non-SVG drop-shadow technique — so the hook doesn't also
   * mount an SVG filter or set `isolation:isolate` on the anchor. Border
   * effects and inner shadows are unaffected; any `effects.shadow` config
   * you pass is ignored while this is true.
   *
   * `<SmoothCorners shadowStrategy="box-shadow">` toggles this internally.
   * Default: `false` (SVG drop-shadow active).
   */
  skipShadowHandle?: boolean;
  /**
   * Called whenever the hook auto-extracts (or stops auto-extracting) a
   * CSS `box-shadow` from the consumer element. Receives the parsed
   * shadow chain, or `undefined` when no shadow is currently extracted
   * (initial mount with no CSS shadow, `autoEffects=false`, or unmount).
   *
   * `<SmoothCorners shadowStrategy="box-shadow">` uses this to route an
   * extracted chain into its CSS sibling div when the SVG handle is
   * skipped — without it the extracted shadow would be stripped from the
   * consumer element and never re-rendered.
   */
  onExtractedShadow?: (shadow: ShadowConfig | ShadowConfig[] | undefined) => void;
  /**
   * The inline `border-radius` fallback the caller rendered for SSR/first
   * paint. When set, the hook clears it from the DOM once the clip-path lands
   * (CSS intersects border-radius with clip-path, so leaving it squares off the
   * squircle) and restores it on teardown. Pass `undefined` when the user
   * supplied their own `border-radius` so it's left untouched.
   *
   * `<SmoothCorners>` wires this internally; it's not needed for direct hook use.
   */
  fallbackBorderRadius?: string;
}

/**
 * React hook that applies a smooth-cornered clip-path to a referenced
 * element, kept in sync on resize via a shared ResizeObserver.
 *
 * @remarks
 * `effectsOptions.wrapperRef` must be a stable ref (created with
 * `useRef`). `effects` and `autoEffects` are read by value, so passing a
 * freshly-allocated object each render is fine.
 *
 * @example
 * ```tsx
 * const ref = useRef<HTMLDivElement>(null);
 * useSmoothCorners(ref, { radius: 20, smoothing: 0.6 });
 * return <div ref={ref}>...</div>;
 * ```
 */
export function useSmoothCorners(
  ref: React.RefObject<HTMLElement | null>,
  options: SmoothCornerOptions,
  effectsOptions?: UseEffectsOptions,
): void {
  const { wrapperRef, effects, autoEffects, skipShadowHandle, onExtractedShadow, fallbackBorderRadius } =
    effectsOptions ?? {};

  const optionsRef = useRef(options);
  optionsRef.current = options;

  const effectsPropRef = useRef(effects);
  effectsPropRef.current = effects;

  const wrapperRefRef = useRef(wrapperRef);
  wrapperRefRef.current = wrapperRef;

  // Read via ref so the resize callback sees current value without re-subscribing.
  const skipShadowHandleRef = useRef(skipShadowHandle ?? false);
  skipShadowHandleRef.current = skipShadowHandle ?? false;

  const onExtractedShadowRef = useRef(onExtractedShadow);
  onExtractedShadowRef.current = onExtractedShadow;

  const fallbackBorderRadiusRef = useRef(fallbackBorderRadius);
  fallbackBorderRadiusRef.current = fallbackBorderRadius;

  // Stable signatures for the effect deps. JSON.stringify is safe on these
  // bounded objects; useMemo would never hit since callers pass fresh literals.
  const optionsKey = JSON.stringify(options);
  const effectsKey = JSON.stringify(effects ?? null);
  const autoEffectsKey = autoEffects ?? true;
  const skipShadowHandleKey = skipShadowHandle ?? false;

  // `skipShadowHandleKey` is part of the sync key: toggling the SVG drop-shadow
  // on/off changes the rendered overlay, so a commit that flips only that flag
  // (options/effects unchanged) must still get past runSync's unchanged-key
  // guard and re-run ensureHandles/syncEffects.
  const syncKeyRef = useRef("");
  syncKeyRef.current = `${optionsKey}|${effectsKey}|${skipShadowHandleKey ? 1 : 0}`;

  const refsRef = useRef<SyncRefs>({
    optionsRef, effectsPropRef, wrapperRefRef, skipShadowHandleRef, onExtractedShadowRef, syncKeyRef,
    fallbackBorderRadiusRef,
  });

  // Per-mount state. SVG handles are created lazily on first sync that
  // sees effects and destroyed only on unmount — toggling props on/off
  // doesn't rebuild the overlay.
  const stateRef = useRef<State | null>(null);

  // `autoEffectsKey` is captured at mount here; later toggles are handled by
  // the separate effect below, so this effect depends only on `ref`.
  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const savedClipPath = el.style.clipPath;
    el.setAttribute("data-slot", "smooth-corners");
    el.setAttribute("data-state", "pending");

    const initialExtracted = autoEffectsKey ? extractAndStripEffects(el) : undefined;

    const s: State = {
      el,
      savedClipPath,
      extracted: initialExtracted,
      effectsHandle: undefined,
      shadowHandle: undefined,
      anchor: null,
      didAcquire: false,
      unobserveAnchor: undefined,
      pendingSize: initialExtracted?.size,
      lastWidth: 0,
      lastHeight: 0,
      lastSyncKey: null,
      lastOffsetX: 0,
      lastOffsetY: 0,
      fallbackBorderRadius: fallbackBorderRadiusRef.current,
      clearedFallbackRadius: false,
    };
    stateRef.current = s;

    // Eager handle creation so the overlay exists before the first resize
    // callback fires, avoiding a frame where it's missing.
    const initialMerged = mergeEffects(s.extracted, effectsPropRef.current);
    if (hasEffects(initialMerged))
      ensureHandles(s, initialMerged, wrapperRefRef.current, skipShadowHandleRef.current);

    onExtractedShadowRef.current?.(s.extracted?.effects.shadow);

    const unobserve = observeResize(el, (size) => runSync(s, refsRef.current, size));

    return () => {
      unobserve();
      s.unobserveAnchor?.();
      s.effectsHandle?.destroy();
      s.shadowHandle?.destroy();
      if (s.extracted) restoreStyles(el, s.extracted.savedStyles);
      onExtractedShadowRef.current?.(undefined);
      if (s.didAcquire && s.anchor) releasePosition(s.anchor);
      stateRef.current = null;

      // Restore the SSR fallback we cleared, so an SSR→unmount→remount cycle
      // that reuses this element still shows rounded corners pre-clip-path.
      if (s.clearedFallbackRadius && s.fallbackBorderRadius !== undefined) {
        el.style.borderRadius = s.fallbackBorderRadius;
      }

      el.style.clipPath = savedClipPath;
      el.removeAttribute("data-slot");
      el.removeAttribute("data-state");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref]);

  // Re-sync on EVERY commit, not just option changes: renders that resize
  // the element through style props would otherwise wait for the resize
  // observer, which delivers a frame late — painted as a stale clip
  // mid-animation (flat corners on WebKit under load). The snapshot memo in
  // runSync keeps the idle-render cost at a single computed-style read.
  useIsoLayoutEffect(() => {
    const s = stateRef.current;
    if (!s) return;
    runSync(s, refsRef.current);
  });

  // Tear down the SVG drop-shadow handle when the consumer opts out at
  // runtime (e.g. shadowStrategy "svg" → "box-shadow"). Re-creation in the
  // other direction is handled by `ensureHandles` on the next sync.
  useIsoLayoutEffect(() => {
    const s = stateRef.current;
    if (!s) return;
    if (skipShadowHandleKey) {
      if (!s.shadowHandle) return;
      s.shadowHandle.destroy();
      s.shadowHandle = undefined;
      s.lastSyncKey = null; // effects state changed outside the render keys
    } else {
      // Re-enabling the SVG drop-shadow: invalidate so the next sync re-runs
      // ensureHandles (which re-creates the handle) and renders the shadow.
      s.lastSyncKey = null;
    }
  }, [skipShadowHandleKey]);

  useIsoLayoutEffect(() => {
    const s = stateRef.current;
    if (!s) return;
    const hadExtraction = s.extracted !== undefined;
    if (autoEffectsKey && !hadExtraction) {
      s.extracted = extractAndStripEffects(s.el);
      s.pendingSize = s.extracted.size;
    } else if (!autoEffectsKey && hadExtraction) {
      restoreStyles(s.el, s.extracted!.savedStyles);
      s.extracted = undefined;
    } else {
      return;
    }
    onExtractedShadowRef.current?.(s.extracted?.effects.shadow);
    s.lastSyncKey = null; // extraction changed the merged effects
    runSync(s, refsRef.current);
  }, [autoEffectsKey]);
}

// ---- upstream: packages/react/src/smooth-corners.tsx ----
/**
 * How to render the `shadow` prop chain.
 *
 * - `"svg"`: path-based filter that traces the squircle silhouette exactly,
 *   but is subject to a Safari `<filter>` rasterisation bug.
 * - `"box-shadow"`: native CSS `box-shadow` on a sibling div, immune to the
 *   WebKit bug but with a rounded-rectangle (not squircle) silhouette.
 *   Border, clip-path, and content stay squircle-shaped.
 *
 * An auto-extracted CSS `box-shadow` is routed through the sibling div too;
 * the explicit `shadow` prop takes precedence over the extracted chain.
 */
export type ShadowStrategy = "svg" | "box-shadow";

/** Own props of <SmoothCorners /> independent of the rendered element. */
export type SmoothCornersOwnProps = {
  children?: ReactNode;
  /** Corner configuration: uniform `{ radius, smoothing }` or per-corner `{ topLeft, topRight, ... }`.
   *  Labs: per-corner logical names (`topStart`, `topEnd`, `bottomStart`, `bottomEnd`) follow the text direction. */
  corners?: SmoothCornersOptions;
  innerBorder?: BorderConfig;
  outerBorder?: BorderConfig;
  middleBorder?: BorderConfig;
  innerShadow?: ShadowConfig | ShadowConfig[];
  shadow?: ShadowConfig | ShadowConfig[];
  /** Automatically extract CSS border and box-shadow as SVG effects. Default: true */
  autoEffects?: boolean;
  /**
   * Selects the render path for the `shadow` prop chain. See
   * {@link ShadowStrategy} for the squircle-vs-Safari trade-off.
   * Default: `"svg"`.
   */
  shadowStrategy?: ShadowStrategy;
  /**
   * Merge SmoothCorners onto its single child element instead of rendering
   * its own. The child receives the internal ref and any spread props. When
   * set, the `as` prop is ignored. Default: false.
   */
  asChild?: boolean;
};

type ReservedKeys = keyof SmoothCornersOwnProps | "as";

/**
 * Polymorphic props for <SmoothCorners />. The element passed via `as`
 * determines the available HTML attributes.
 */
export type SmoothCornersProps<E extends ElementType = "div"> = SmoothCornersOwnProps & {
  /** The HTML element or component to render. Default: "div" */
  as?: E;
} & Omit<ComponentPropsWithoutRef<E>, ReservedKeys>;

/** CSS `box-shadow` chain; first entry renders topmost. Invisible entries are dropped. */
function buildBoxShadowChain(shadows: ShadowConfig | ShadowConfig[]): string {
  const arr = Array.isArray(shadows) ? shadows : [shadows];
  const parts: string[] = [];
  for (const s of arr) {
    if (s.opacity <= 0) continue;
    const { offsetX, offsetY, blur, spread, color, opacity } = s;
    const geometry = `${offsetX}px ${offsetY}px ${blur}px ${spread}px`;
    const rgb = hexToRgbChannels(color);
    // Non-hex colors (oklch/lab/color()…) can't be split into channels —
    // parseInt would yield `rgba(NaN,…)`, which CSS treats as invalid and
    // drops the entire box-shadow declaration. Extraction embeds alpha in the
    // string with opacity 1 (verbatim is exact); API-supplied opacity < 1 is
    // applied via color-mix to match the SVG strategy's fill-opacity.
    const paint = rgb
      ? `rgba(${rgb.r},${rgb.g},${rgb.b},${opacity})`
      : opacity < 1
        ? `color-mix(in srgb, ${color} ${opacity * 100}%, transparent)`
        : color;
    parts.push(`${geometry} ${paint}`);
  }
  return parts.join(", ");
}

// Core's exported hexToRgb returns a formatted `rgb(...)` string; box-shadow
// needs the raw channels to compose `rgba(r,g,b,opacity)`. Returns null for
// anything that isn't a 3- or 6-digit hex, so the caller can fall back to the
// original color string.
function hexToRgbChannels(hex: string): { r: number; g: number; b: number } | null {
  if (!/^#?[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(hex)) return null;
  const h = hex.replace("#", "");
  const expanded = h.length === 3 ? h[0] + h[0] + h[1] + h[1] + h[2] + h[2] : h;
  return {
    r: parseInt(expanded.substring(0, 2), 16),
    g: parseInt(expanded.substring(2, 4), 16),
    b: parseInt(expanded.substring(4, 6), 16),
  };
}

/** The `style` of the single element `asChild` clones onto. */
function childSuppliedStyle(children: ReactNode): CSSProperties | undefined {
  const child = Children.toArray(children)[0];
  if (!isValidElement(child)) return undefined;
  return (child.props as { style?: CSSProperties }).style;
}

// `borderRadius` plus every per-corner longhand, physical and logical
// (`borderTopLeftRadius`, `borderStartEndRadius`, …).
const RADIUS_PROPERTY = /^border[A-Za-z]*Radius$/;

/**
 * True when `style` sets any corner radius. Longhands count: the teardown
 * clears the `border-radius` shorthand, which erases the longhands with it, so
 * a single per-corner value the consumer set is enough to disable the fallback.
 */
function styleHasBorderRadius(style: CSSProperties | undefined): boolean {
  if (!style) return false;
  const record = style as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (record[key] !== undefined && RADIUS_PROPERTY.test(key)) return true;
  }
  return false;
}

function SmoothCornersImpl<E extends ElementType = "div">(
  props: SmoothCornersProps<E>,
  externalRef: ForwardedRef<Element>,
) {
  const {
    as,
    asChild,
    children,
    corners,
    innerBorder,
    outerBorder,
    middleBorder,
    innerShadow,
    shadow,
    autoEffects,
    shadowStrategy,
    ...rest
  } = props;

  const Component = (as ?? "div") as ElementType;

  const internalRef = useRef<HTMLElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const setInnerRef = useMemo(
    () => composeRefs<HTMLElement>(internalRef, externalRef as ForwardedRef<HTMLElement>),
    [externalRef],
  );

  // Labs: logical corner names (`topStart`, ...) resolve against the
  // element's computed direction, read after layout (see below).
  const logical = corners !== undefined && hasLogicalCorners(corners);
  const [direction, setDirection] = useState<CornerDirection>("ltr");
  useIsoLayoutEffect(() => {
    if (!logical || !internalRef.current) return;
    const next = readDirection(internalRef.current);
    if (next !== direction) setDirection(next);
  });
  const options: SmoothCornerOptions =
    corners === undefined
      ? { radius: 0 }
      : logical
        ? resolveLogicalCorners(corners, direction)
        : (corners as SmoothCornerOptions);
  const useBoxShadow = shadowStrategy === "box-shadow";

  // SSR/first-paint fallback: emit an inline `border-radius` derived from the
  // corner radius so server markup (and the client's initial, pre-mount render)
  // shows rounded corners instead of square ones before the clip-path lands.
  // Rendered identically on server and client → hydration-safe. After mount the
  // clip-path (set imperatively in useSmoothCorners) takes over the silhouette.
  // A user-supplied `style.borderRadius` always wins.
  //
  // The fallback value is frozen at first render: it only matters before the
  // clip-path lands (SSR + first client paint), and the clip-path governs the
  // silhouette for every subsequent frame. Re-deriving it each render would
  // rewrite `style.borderRadius` on the DOM on every commit — a wasted style
  // recalc that, because the element also carries a large imperatively-set
  // clip-path string, is disproportionately expensive to churn.
  const fallbackRadiusRef = useRef<string | null>(null);
  if (fallbackRadiusRef.current === null) {
    fallbackRadiusRef.current = cornerOptionsToBorderRadius(options);
  }
  const userStyle = (rest as { style?: CSSProperties }).style;
  // Under `asChild` the radius that reaches the DOM may come from the child,
  // because Slot merges the child's style last. Clearing that would discard a
  // value the consumer set, so it counts as user-supplied here too.
  const childStyle = asChild ? childSuppliedStyle(children) : undefined;
  const userSuppliedRadius = styleHasBorderRadius(userStyle) || styleHasBorderRadius(childStyle);
  const innerStyle: CSSProperties = {
    borderRadius: fallbackRadiusRef.current,
    ...userStyle,
  };

  // Box-shadow strategy: suppress the `shadow` prop on its way to the SVG
  // layer — the CSS sibling div below renders the chain instead.
  // `innerShadow` is unaffected (inside the clip, no WebKit bug).
  const effectiveShadow = useBoxShadow ? undefined : shadow;

  // Explicit `shadow` prop wins over the auto-extracted one, matching mergeEffects.
  const [extractedShadow, setExtractedShadow] = useState<
    ShadowConfig | ShadowConfig[] | undefined
  >(undefined);
  const onExtractedShadow = useCallback(
    (next: ShadowConfig | ShadowConfig[] | undefined) => setExtractedShadow(next),
    [],
  );

  const explicitEffects = {
    innerBorder,
    outerBorder,
    middleBorder,
    innerShadow,
    shadow: effectiveShadow,
  };
  const hasExplicit = hasEffects(explicitEffects);
  const siblingShadow = useBoxShadow ? (shadow ?? extractedShadow) : undefined;
  const shadowChain = siblingShadow === undefined ? "" : buildBoxShadowChain(siblingShadow);
  const hasShadowSibling = shadowChain !== "";
  // Wrapper is required when any effect renders OR when the box-shadow
  // sibling div needs its relative positioning context.
  const needsWrapper =
    (autoEffects ?? true) || hasExplicit || siblingShadow !== undefined;

  const effectsOptions = {
    wrapperRef: needsWrapper
      ? (wrapperRef as React.RefObject<HTMLElement | null>)
      : undefined,
    effects: hasExplicit ? explicitEffects : undefined,
    autoEffects,
    skipShadowHandle: useBoxShadow,
    onExtractedShadow: useBoxShadow ? onExtractedShadow : undefined,
    // Hand the SSR fallback to the hook so it can clear it from the DOM once
    // the clip-path lands; a user-supplied border-radius is left untouched.
    fallbackBorderRadius: userSuppliedRadius ? undefined : (fallbackRadiusRef.current ?? undefined),
  };

  // Declared before useSmoothCorners: the acquire must land before the hook's
  // teardown releases core's count, or the handover passes through zero.
  useIsoLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper || !hasShadowSibling) return;
    // Our own declaration is already committed; blank it so the count saves ""
    // and doesn't restore ours once the sibling goes.
    wrapper.style.isolation = "";
    acquireIsolation(wrapper);
    return () => releaseIsolation(wrapper);
  }, [hasShadowSibling]);

  useSmoothCorners(internalRef, options, effectsOptions);

  const inner = asChild
    ? createElement(Slot, { ...rest, style: innerStyle, ref: setInnerRef }, children)
    : createElement(Component, { ...rest, style: innerStyle, ref: setInnerRef }, children);

  if (!needsWrapper) return inner;

  // Box-shadow strategy: absolutely-positioned sibling div behind the
  // clipped element (z-index:-1) carries the chain. Must be a sibling —
  // clip-path on the consumer's element would otherwise crop the halo.
  let shadowSibling: ReactNode = null;
  if (hasShadowSibling) {
    const style: CSSProperties = {
      position: "absolute",
      inset: 0,
      borderRadius: cornerOptionsToBorderRadius(options),
      boxShadow: shadowChain,
      pointerEvents: "none",
      zIndex: -1,
    };
    shadowSibling = createElement("div", {
      "aria-hidden": true,
      "data-slot": "smooth-corners-box-shadow",
      style,
    });
  }

  return createElement(
    "div",
    {
      ref: wrapperRef,
      style: {
        position: "relative" as const,
        // `isolation: isolate` keeps the z-index:-1 sibling from sinking
        // behind ancestors — same trick the SVG path uses.
        ...(shadowSibling ? { isolation: "isolate" as const } : {}),
      },
    },
    shadowSibling,
    inner,
  );
}

/**
 * Renders an element with smooth corners applied via clip-path. When any
 * effect prop is set, or when `autoEffects` is enabled (default), a
 * wrapper div is created to host the SVG overlay and drop-shadow filter.
 *
 * @example
 * ```tsx
 * <SmoothCorners as="section" corners={{ radius: 20, smoothing: 0.6 }}>
 *   <p>Content</p>
 * </SmoothCorners>
 * ```
 */
export const SmoothCorners = forwardRef(SmoothCornersImpl) as <E extends ElementType = "div">(
  props: SmoothCornersProps<E> & { ref?: ComponentPropsWithRef<E>["ref"] },
) => ReturnType<typeof SmoothCornersImpl>;

// ---- Labs: logical corners for right-to-left layouts ----
/** Per-corner configuration by logical position: `start` is the left in a
 *  left-to-right layout and the right in a right-to-left one. */
export interface LogicalCornerConfig {
  topStart?: CornerConfig | number;
  topEnd?: CornerConfig | number;
  bottomStart?: CornerConfig | number;
  bottomEnd?: CornerConfig | number;
}

/** Everything `corners` accepts: upstream's options, or logical corner names
 *  (physical names, when also given, win for their corner). */
export type SmoothCornersOptions = SmoothCornerOptions | (LogicalCornerConfig & PerCornerConfig);

/** The inline direction a corner set is resolved against. */
export type CornerDirection = "ltr" | "rtl";

const LOGICAL_KEYS = ["topStart", "topEnd", "bottomStart", "bottomEnd"] as const;

function hasLogicalCorners(options: SmoothCornersOptions): boolean {
  if ("radius" in options) return false;
  return LOGICAL_KEYS.some((key) => (options as LogicalCornerConfig)[key] !== undefined);
}

function readDirection(el: HTMLElement): CornerDirection {
  return getComputedStyle(el).direction === "rtl" ? "rtl" : "ltr";
}

/**
 * Maps logical corner names to upstream's physical ones for a direction, so
 * the result can go to `useSmoothCorners` or `generatePath` unchanged.
 * Uniform options are returned as they are.
 */
export function resolveLogicalCorners(
  options: SmoothCornersOptions,
  direction: CornerDirection,
): SmoothCornerOptions {
  if ("radius" in options) return options;
  const { topStart, topEnd, bottomStart, bottomEnd, ...physical } = options as LogicalCornerConfig &
    PerCornerConfig;
  const rtl = direction === "rtl";
  return {
    topLeft: physical.topLeft ?? (rtl ? topEnd : topStart),
    topRight: physical.topRight ?? (rtl ? topStart : topEnd),
    bottomRight: physical.bottomRight ?? (rtl ? bottomStart : bottomEnd),
    bottomLeft: physical.bottomLeft ?? (rtl ? bottomEnd : bottomStart),
  };
}

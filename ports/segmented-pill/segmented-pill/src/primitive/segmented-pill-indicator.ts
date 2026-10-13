"use client";

import type { ReactNode, RefObject } from "react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

// The primitive variants (Radix, Base UI, React Aria) keep the default
// variant's API and look: the same props, the same `segmented-pill` classes
// and stylesheet, the pill drawn by the same measurements. The primitive owns
// the roles, the selection and the keyboard; this file owns the pill.

export interface SegmentedPillItem {
  value: string;
  label: ReactNode;
  disabled?: boolean;
}

/**
 * Labs: the pill is placed in the control's own (layout) pixels. Bounding
 * rects are in screen pixels, so under a scaled ancestor (a transform, as on
 * the wall's tiles and the gallery stills) they would size and place the pill
 * wrongly. The scale is the control's rect against its layout box (read from
 * its computed size, which a transform does not touch); without a transform
 * it is exactly 1 and the values are upstream's.
 */
function layoutScale(root: Element, rootRect: DOMRect) {
  const style = getComputedStyle(root);
  let width = Number.parseFloat(style.width);
  let height = Number.parseFloat(style.height);
  if (style.boxSizing !== "border-box") {
    width +=
      Number.parseFloat(style.paddingLeft) +
      Number.parseFloat(style.paddingRight) +
      Number.parseFloat(style.borderLeftWidth) +
      Number.parseFloat(style.borderRightWidth);
    height +=
      Number.parseFloat(style.paddingTop) +
      Number.parseFloat(style.paddingBottom) +
      Number.parseFloat(style.borderTopWidth) +
      Number.parseFloat(style.borderBottomWidth);
  }
  const x = rootRect.width / width;
  const y = rootRect.height / height;
  const valid = (scale: number) =>
    Number.isFinite(scale) && scale > 0 && Math.abs(scale - 1) > 0.001;
  return { x: valid(x) ? x : 1, y: valid(y) ? y : 1 };
}

/** Controlled or uncontrolled selection; defaults to the first enabled item. */
export function useSegmentedPillValue(
  items: readonly SegmentedPillItem[],
  value: string | undefined,
  defaultValue: string | undefined,
  onValueChange: ((value: string) => void) | undefined,
) {
  const [uncontrolled, setUncontrolled] = useState(
    () => defaultValue ?? items.find((item) => !item.disabled)?.value,
  );
  const current = value ?? uncontrolled;
  const select = useCallback(
    (next: string) => {
      // A toggle group can deselect its pressed item; a segmented control
      // always keeps one selected.
      if (!next || next === current) return;
      if (items.some((item) => item.value === next && item.disabled)) return;
      setUncontrolled(next);
      onValueChange?.(next);
    },
    [current, items, onValueChange],
  );
  return [current, select] as const;
}

/**
 * The reading direction around the control, read from its parent (Radix
 * writes its own `dir` on the root) and re-read when any `dir` changes.
 */
export function useParentDirection(rootRef: RefObject<HTMLElement | null>) {
  const [rtl, setRtl] = useState(false);
  useLayoutEffect(() => {
    const parent = rootRef.current?.parentElement;
    if (!parent) return;
    const read = () => setRtl(getComputedStyle(parent).direction === "rtl");
    read();
    const observer = new MutationObserver(read);
    observer.observe(parent.ownerDocument.documentElement, {
      subtree: true,
      attributeFilter: ["dir"],
    });
    return () => observer.disconnect();
  }, [rootRef]);
  return rtl;
}

/**
 * Positions the pill on the item whose `data-value` is `value`, as upstream's
 * positionIndicator does, and plays upstream's squash when the value changes
 * (never under reduced motion). Re-measures on resize and on a direction
 * change (`rtl` is the direction the primitive was rendered with).
 */
export function useSegmentedPillIndicator(
  rootRef: RefObject<HTMLElement | null>,
  value: string | undefined,
  animated: boolean,
  rtl: boolean,
) {
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const valueRef = useRef(value);
  valueRef.current = value;
  const previous = useRef(value);
  const squash = useRef<Animation | undefined>(undefined);

  const position = useCallback(() => {
    const root = rootRef.current;
    const indicator = indicatorRef.current;
    if (!root || !indicator) return;
    const item = [...root.children].find(
      (child): child is HTMLElement =>
        child instanceof HTMLElement &&
        child !== indicator &&
        child.dataset.value === valueRef.current,
    );
    if (!item) {
      indicator.style.width = "0px";
      indicator.style.height = "0px";
      return;
    }
    // Physical on purpose: the offset is measured from the two boxes' left
    // edges, so the pill lands on the selected item in either direction.
    const rootRect = root.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    const scale = layoutScale(root, rootRect);
    indicator.style.width = `${itemRect.width / scale.x}px`;
    indicator.style.height = `${itemRect.height / scale.y}px`;
    indicator.style.transform = `translate3d(${(itemRect.left - rootRect.left) / scale.x}px, ${(itemRect.top - rootRect.top) / scale.y}px, 0)`;
  }, [rootRef]);

  // `rtl` re-measures after the primitive re-renders in the new direction.
  useLayoutEffect(() => {
    position();
    const indicator = indicatorRef.current;
    if (previous.current === value || !indicator) return;
    previous.current = value;
    const reduceMotion =
      typeof globalThis.matchMedia === "function" &&
      globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!animated || reduceMotion || typeof indicator.animate !== "function") {
      return;
    }
    squash.current?.cancel();
    squash.current = indicator.animate(
      [
        { scale: "1 1" },
        { scale: "1.07 0.93", offset: 0.55 },
        { scale: "1 1" },
      ],
      { duration: 260, easing: "cubic-bezier(0.2, 0, 0, 1)" },
    );
  }, [value, animated, position, rtl]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const resize = new ResizeObserver(position);
    resize.observe(root);
    // A direction switch reorders the items without resizing the row.
    const direction = new MutationObserver(position);
    direction.observe(root.ownerDocument.documentElement, {
      subtree: true,
      attributeFilter: ["dir"],
    });
    return () => {
      resize.disconnect();
      direction.disconnect();
      squash.current?.cancel();
    };
  }, [rootRef, position]);

  return indicatorRef;
}

"use client";

import * as React from "react";
import type { SheetController, SheetState } from "./sheet-controller";
import { parseSnapPoints } from "./snap-points";

/** What every part of one sheet shares, whichever dialog layer it uses. */
interface BottomSheetContextValue {
  controller: SheetController;
  /** The id the dialog's accessible name points at (BottomSheetTitle). */
  titleId: string;
  /** Opens the sheet; focus returns to `trigger` when it closes. */
  show: (trigger?: HTMLElement | null) => boolean;
  /** Closes the sheet; `trigger`'s data-result is reported to onHidden. */
  hide: (trigger?: HTMLElement | null) => boolean;
  /** Current lifecycle state, for parts that render differently by state. */
  state: SheetState;
  /** Whether snap points are declared (the dialog renders data-snap-points). */
  hasSnaps: boolean;
}

const BottomSheetContext = React.createContext<BottomSheetContextValue | null>(
  null,
);

function useSheetContext(part: string): BottomSheetContextValue {
  const context = React.useContext(BottomSheetContext);
  if (!context) {
    throw new Error(`<${part}> must be rendered inside <BottomSheet>.`);
  }
  return context;
}

/**
 * Joins refs so a part can hand its element to the sheet and to the caller.
 * The returned callback is stable: a new one on every render would detach
 * and reattach the element, and cancel a drag in progress.
 */
function useMergedRef<T>(
  ...refs: (React.Ref<T> | undefined)[]
): React.RefCallback<T> {
  const latest = React.useRef(refs);
  latest.current = refs;
  return React.useCallback((value: T | null) => {
    for (const ref of latest.current) {
      if (typeof ref === "function") ref(value);
      else if (ref) (ref as React.RefObject<T | null>).current = value;
    }
  }, []);
}

/** `spring` prop to the controller's attribute form. */
function springValue(spring: boolean | readonly [number, number] | undefined) {
  if (spring === false) return "none";
  if (Array.isArray(spring)) return `${spring[0]},${spring[1]}`;
  return null;
}

interface SheetAttributes {
  snapPoints?: number[];
  snap?: number;
  defaultSnap?: number;
  spring?: boolean | readonly [number, number];
  maxDisplayWidth?: number;
}

/**
 * Hands the root's props to the controller (upstream: the element's
 * observed attributes). Before the dialog mounts they are set during render,
 * so its first paint has the resting height; afterwards in a layout effect,
 * never during render. The setters ignore unchanged values, so a re-render
 * never disturbs a settle or a drag. Returns whether snap points are set.
 */
function useSheetAttributes(
  controller: SheetController,
  { snapPoints, snap, defaultSnap, spring, maxDisplayWidth }: SheetAttributes,
): boolean {
  const initialSnap = React.useRef(snap ?? defaultSnap);
  const apply = () => {
    controller.snapPoints = snapPoints ?? null;
    controller.snap = snap ?? initialSnap.current ?? null;
    controller.spring = springValue(spring);
    controller.maxDisplayWidth = maxDisplayWidth;
  };
  if (!controller.connected) apply();
  React.useLayoutEffect(apply);
  return parseSnapPoints(snapPoints).length > 0;
}

export {
  BottomSheetContext,
  springValue,
  useMergedRef,
  useSheetAttributes,
  useSheetContext,
};
export type { BottomSheetContextValue, SheetAttributes };

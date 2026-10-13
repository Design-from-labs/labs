"use client";

import * as React from "react";
import { useMergedRef, useSheetContext } from "./bottom-sheet-context";
import type { Surface } from "./sheet-controller";

// ---- upstream: src/bottom-sheet.js (BottomSheetHeader, -Content, -Footer) ----
// The three regions of a sheet. Each registers its element with the sheet, so
// the header and footer are drag surfaces and the content hands its scroll to
// the drag the moment it runs out (upstream: the custom elements the sheet
// queried in connectedCallback).

function useSurface(surface: Surface, part: string) {
  const { controller } = useSheetContext(part);
  return React.useCallback(
    (el: HTMLDivElement | null) => controller.setSurface(surface, el),
    [controller, surface],
  );
}

/** The fixed top region: draws the handle and is always a drag surface. */
function BottomSheetHeader({ ref, ...props }: React.ComponentProps<"div">) {
  const register = useSurface("header", "BottomSheetHeader");
  return (
    <div
      data-slot="bottom-sheet-header"
      ref={useMergedRef(register, ref)}
      {...props}
    />
  );
}

/**
 * The scrolling region between header and footer. A downward drag at the
 * top of its scroll (or an upward one below the tallest snap) moves the sheet.
 * It is a tab stop (added; upstream relies on the browser making scrollers
 * focusable), so the keyboard can scroll content that has no controls.
 */
function BottomSheetContent({
  ref,
  tabIndex = 0,
  ...props
}: React.ComponentProps<"div">) {
  const register = useSurface("content", "BottomSheetContent");
  return (
    <div
      data-slot="bottom-sheet-content"
      ref={useMergedRef(register, ref)}
      tabIndex={tabIndex}
      {...props}
    />
  );
}

/** An optional pinned bottom region; owns the safe-area padding. A drag surface. */
function BottomSheetFooter({ ref, ...props }: React.ComponentProps<"div">) {
  const register = useSurface("footer", "BottomSheetFooter");
  return (
    <div
      data-slot="bottom-sheet-footer"
      ref={useMergedRef(register, ref)}
      {...props}
    />
  );
}

/** The sheet's controls, for parts rendered inside <BottomSheet>. */
function useBottomSheet() {
  const { controller, show, hide, state } = useSheetContext("useBottomSheet");
  return React.useMemo(
    () => ({
      show,
      hide,
      state,
      /** Animates to a declared snap point; undeclared values are ignored. */
      snapTo: (value: number) => controller.snapTo(value),
      /** The snap the sheet rests at (null without snap points). */
      get snap() {
        return controller.snap;
      },
    }),
    [controller, show, hide, state],
  );
}

export { BottomSheetContent, BottomSheetFooter, BottomSheetHeader, useBottomSheet };

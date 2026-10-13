"use client";

import type * as React from "react";
import { Dialog, Heading, Modal, ModalOverlay } from "react-aria-components";
import { cn } from "@/lib/utils";
import { useMergedRef, useSheetContext } from "./bottom-sheet-context";
import { BottomSheetStyles } from "./bottom-sheet-styles";
import {
  BottomSheet,
  type BottomSheetProps,
  BottomSheetTrigger,
  usePresence,
} from "./presence-root";

// The bottom sheet on React Aria's ModalOverlay, Modal and Dialog: React Aria
// provides the portal, the focus trap, focus move and restore, Escape and
// outside-press dismissal, the hidden page and the scroll lock; the sheet's
// gestures, snap points and animated lifecycle are the same code as on the
// native <dialog>. The overlay stays open (mounted) until the exit
// transition has finished.

export {
  BottomSheetContent,
  BottomSheetFooter,
  BottomSheetHeader,
  useBottomSheet,
} from "./bottom-sheet-parts";
export type {
  SheetLifecycleEvent,
  SheetState,
  SnapChangeDetail,
} from "./sheet-controller";

interface BottomSheetDialogProps
  extends Omit<React.ComponentProps<"div">, "children"> {
  children?: React.ReactNode;
  /** Detached from the screen edges, all four corners rounded. */
  inset?: boolean;
  "aria-label"?: string;
}

/**
 * The sheet itself, in a portal over a scrim, with the header, content and
 * footer inside. Name it with a BottomSheetTitle (or aria-label).
 */
function BottomSheetDialog({
  inset = false,
  className,
  children,
  ref,
  "aria-label": ariaLabel,
  ...props
}: BottomSheetDialogProps) {
  const { hasSnaps } = useSheetContext("BottomSheetDialog");
  const { mounted, state, surfaceRef, requestClose } =
    usePresence("BottomSheetDialog");
  const setRef = useMergedRef<HTMLDivElement>(surfaceRef, ref);
  return (
    <>
      <BottomSheetStyles />
      <ModalOverlay
        isOpen={mounted}
        isDismissable
        onOpenChange={(next) => {
          // Closing is animated: the sheet decides when React Aria unmounts
          if (!next) requestClose();
        }}
        className="bottom-sheet-layer"
      >
        <div data-slot="bottom-sheet-overlay" data-sheet-state={state} />
        <Modal
          {...props}
          data-slot="bottom-sheet-dialog"
          data-sheet-state={state}
          data-snap-points={hasSnaps ? "" : undefined}
          data-inset={inset ? "" : undefined}
          ref={setRef}
          className={cn(className)}
        >
          <Dialog data-slot="bottom-sheet" aria-label={ariaLabel}>
            {children}
          </Dialog>
        </Modal>
      </ModalOverlay>
    </>
  );
}

/** The sheet's accessible name (React Aria links it to the dialog). */
function BottomSheetTitle({
  level = 2,
  ...props
}: React.ComponentProps<typeof Heading>) {
  useSheetContext("BottomSheetTitle");
  return (
    <Heading
      slot="title"
      level={level}
      data-slot="bottom-sheet-title"
      {...props}
    />
  );
}

/**
 * A button that closes the sheet. `data-result` on it is reported to
 * onHidden as `result`.
 */
function BottomSheetClose({
  type = "button",
  onClick,
  ...props
}: React.ComponentProps<"button">) {
  const { controller } = useSheetContext("BottomSheetClose");
  return (
    <button
      data-slot="bottom-sheet-close"
      type={type}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) controller.panel.hide(event.currentTarget);
      }}
      {...props}
    />
  );
}

export {
  BottomSheet,
  BottomSheetClose,
  BottomSheetDialog,
  BottomSheetTitle,
  BottomSheetTrigger,
};
export type { BottomSheetDialogProps, BottomSheetProps };

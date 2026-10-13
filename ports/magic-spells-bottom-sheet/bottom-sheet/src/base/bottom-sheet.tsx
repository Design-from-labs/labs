"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import type * as React from "react";
import { cn } from "@/lib/utils";
import { useMergedRef, useSheetContext } from "./bottom-sheet-context";
import { BottomSheetStyles } from "./bottom-sheet-styles";
import {
  BottomSheet,
  type BottomSheetProps,
  BottomSheetTrigger,
  usePresence,
} from "./presence-root";

// The bottom sheet on Base UI Dialog: Base UI provides the portal, the focus
// trap and focus move, Escape and outside-press dismissal, the inert page and
// the scroll lock; the sheet's gestures, snap points and animated lifecycle
// are the same code as on the native <dialog>. The dialog stays open
// (mounted) until the exit transition has finished.

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
  extends Omit<React.ComponentProps<typeof DialogPrimitive.Popup>, "className"> {
  className?: string;
  /** Detached from the screen edges, all four corners rounded. */
  inset?: boolean;
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
  ...props
}: BottomSheetDialogProps) {
  const { hasSnaps } = useSheetContext("BottomSheetDialog");
  const { mounted, state, surfaceRef, requestClose } =
    usePresence("BottomSheetDialog");
  const setRef = useMergedRef<HTMLDivElement>(surfaceRef, ref);
  return (
    <>
      <BottomSheetStyles />
      <DialogPrimitive.Root
        open={mounted}
        onOpenChange={(next) => {
          // Closing is animated: the sheet decides when Base UI unmounts
          if (!next) requestClose();
        }}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Backdrop
            data-slot="bottom-sheet-overlay"
            data-sheet-state={state}
          />
          <DialogPrimitive.Popup
            data-slot="bottom-sheet-dialog"
            data-sheet-state={state}
            data-snap-points={hasSnaps ? "" : undefined}
            data-inset={inset ? "" : undefined}
            ref={setRef}
            className={cn(className)}
            // The sheet returns focus to the trigger itself
            finalFocus={false}
            // A document without focus (a frame, a background tab) is not
            // given focus by a sheet that opens there (read on the client:
            // the popup renders in a portal, never on the server)
            initialFocus={
              typeof document !== "undefined" && !document.hasFocus()
                ? false
                : undefined
            }
            {...props}
          >
            <div data-slot="bottom-sheet">{children}</div>
          </DialogPrimitive.Popup>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
}

/** The sheet's accessible name (Base UI links it to the dialog). */
function BottomSheetTitle(
  props: React.ComponentProps<typeof DialogPrimitive.Title>,
) {
  useSheetContext("BottomSheetTitle");
  return <DialogPrimitive.Title data-slot="bottom-sheet-title" {...props} />;
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

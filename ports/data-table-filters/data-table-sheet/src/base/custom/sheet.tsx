"use client";

import { boxRadiusClassName } from "../lib/style";
import { cn } from "@/lib/utils";
import { Dialog as SheetPrimitive } from "@base-ui/react/dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import * as React from "react";

/**
 * The block's sheet on Base UI's dialog. Same look and API as the Radix
 * variant: the slide and fade use the same tw-animate-css keyframes, keyed on
 * Base UI's `data-open` / `data-closed` (Base UI waits for the exit animation
 * before it unmounts the popup).
 */
const Sheet = SheetPrimitive.Root;

const SheetTrigger = SheetPrimitive.Trigger;

const SheetClose = SheetPrimitive.Close;

const SheetPortal = SheetPrimitive.Portal;

function SheetOverlay({
  className,
  ...props
}: Omit<React.ComponentProps<typeof SheetPrimitive.Backdrop>, "className"> & {
  className?: string;
}) {
  return (
    <SheetPrimitive.Backdrop
      data-slot="sheet-overlay"
      className={cn(
        "bg-background/40 data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 fixed inset-0 z-50",
        "motion-reduce:data-open:animate-none motion-reduce:data-closed:animate-none",
        className,
      )}
      {...props}
    />
  );
}

const sheetVariants = cva(
  "bg-background data-open:animate-in data-closed:animate-out fixed z-50 gap-4 p-6 shadow-lg transition ease-in-out outline-none data-closed:duration-300 data-open:duration-500 motion-reduce:transition-none motion-reduce:data-open:animate-none motion-reduce:data-closed:animate-none",
  {
    variants: {
      // `left` and `right` are the inline start and end: they mirror under
      // `dir="rtl"`, so a detail sheet stays on the side away from the reading start.
      side: {
        top: "data-closed:slide-out-to-top data-open:slide-in-from-top inset-x-0 top-0 border-b",
        bottom:
          "data-closed:slide-out-to-bottom data-open:slide-in-from-bottom inset-x-0 bottom-0 border-t",
        left: "data-closed:slide-out-to-start data-open:slide-in-from-start inset-y-0 start-0 h-full w-3/4 border-e sm:max-w-sm",
        right:
          "data-closed:slide-out-to-end data-open:slide-in-from-end inset-y-0 end-0 h-full w-3/4 border-s sm:max-w-sm",
      },
    },
    defaultVariants: {
      side: "right",
    },
  },
);

interface SheetContentProps
  extends Omit<React.ComponentProps<typeof SheetPrimitive.Popup>, "className">,
    VariantProps<typeof sheetVariants> {
  className?: string;
  hideClose?: boolean;
}

function SheetContent({
  side = "right",
  className,
  children,
  hideClose,
  onKeyDown,
  ...props
}: SheetContentProps) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Popup
        data-slot="sheet-content"
        className={cn(sheetVariants({ side }), className)}
        onKeyDown={(event) => {
          onKeyDown?.(event);
          // Base UI's dialog stops arrow keys from leaving the popup; as on
          // Radix, let them bubble so a document listener (the row sheet's
          // ArrowUp / ArrowDown navigation) still receives them.
          if (event.key === "ArrowUp" || event.key === "ArrowDown") {
            event.preventBaseUIHandler();
          }
        }}
        {...props}
      >
        {children}
        {!hideClose ? (
          <SheetPrimitive.Close
            autoFocus={true}
            className={cn(
              "data-open:bg-secondary focus-visible:border-ring focus-visible:ring-ring/50 absolute top-4 end-4 opacity-70 transition-all outline-none hover:opacity-100 focus-visible:ring-[3px] disabled:pointer-events-none",
              boxRadiusClassName,
            )}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </SheetPrimitive.Close>
        ) : null}
      </SheetPrimitive.Popup>
    </SheetPortal>
  );
}

function SheetHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col space-y-2 text-center sm:text-start",
        className,
      )}
      {...props}
    />
  );
}

function SheetFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
        className,
      )}
      {...props}
    />
  );
}

function SheetTitle({
  className,
  ...props
}: Omit<React.ComponentProps<typeof SheetPrimitive.Title>, "className"> & {
  className?: string;
}) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn("text-foreground text-lg font-semibold", className)}
      {...props}
    />
  );
}

function SheetDescription({
  className,
  ...props
}: Omit<
  React.ComponentProps<typeof SheetPrimitive.Description>,
  "className"
> & {
  className?: string;
}) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};

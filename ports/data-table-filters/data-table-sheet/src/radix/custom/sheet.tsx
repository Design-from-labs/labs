"use client";

import { boxRadiusClassName } from "../lib/style";
import { cn } from "@/lib/utils";
import { Dialog as SheetPrimitive } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import * as React from "react";

const Sheet = SheetPrimitive.Root;

const SheetTrigger = SheetPrimitive.Trigger;

/**
 * Radix's close, plus Base UI's `render`.
 *
 * The shadcn CLI rewrites `asChild` into `render={<child />}` when it installs
 * into a Base UI project. This sheet is built on Radix in both cases — it
 * ships with the block rather than resolving from the project's library — so
 * it has to accept the prop the CLI writes.
 */
function SheetClose({
  render,
  children,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Close> & {
  render?: React.ReactElement;
}) {
  if (!render) {
    return <SheetPrimitive.Close {...props}>{children}</SheetPrimitive.Close>;
  }

  // `asChild` is spread rather than written as an attribute so the same CLI
  // codemod doesn't rewrite it here, inside the component implementing it.
  return (
    <SheetPrimitive.Close {...{ asChild: true }} {...props}>
      {children === undefined
        ? render
        : React.cloneElement(render, undefined, children)}
    </SheetPrimitive.Close>
  );
}

const SheetPortal = SheetPrimitive.Portal;

function SheetOverlay({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn(
        "bg-background/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50",
        "motion-reduce:data-[state=open]:animate-none motion-reduce:data-[state=closed]:animate-none",
        className,
      )}
      {...props}
    />
  );
}

const sheetVariants = cva(
  "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out fixed z-50 gap-4 p-6 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500 motion-reduce:transition-none motion-reduce:data-[state=open]:animate-none motion-reduce:data-[state=closed]:animate-none",
  {
    variants: {
      // `left` and `right` are the inline start and end: they mirror under
      // `dir="rtl"`, so a detail sheet stays on the side away from the reading start.
      side: {
        top: "data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top inset-x-0 top-0 border-b",
        bottom:
          "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom inset-x-0 bottom-0 border-t",
        left: "data-[state=closed]:slide-out-to-start data-[state=open]:slide-in-from-start inset-y-0 start-0 h-full w-3/4 border-e sm:max-w-sm",
        right:
          "data-[state=closed]:slide-out-to-end data-[state=open]:slide-in-from-end inset-y-0 end-0 h-full w-3/4 border-s sm:max-w-sm",
      },
    },
    defaultVariants: {
      side: "right",
    },
  },
);

interface SheetContentProps
  extends React.ComponentProps<typeof SheetPrimitive.Content>,
    VariantProps<typeof sheetVariants> {
  hideClose?: boolean;
}

function SheetContent({
  side = "right",
  className,
  children,
  hideClose,
  ...props
}: SheetContentProps) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        className={cn(sheetVariants({ side }), className)}
        {...props}
      >
        {children}
        {!hideClose ? (
          <SheetPrimitive.Close
            autoFocus={true}
            className={cn(
              "data-[state=open]:bg-secondary focus-visible:border-ring focus-visible:ring-ring/50 absolute top-4 end-4 opacity-70 transition-all outline-none hover:opacity-100 focus-visible:ring-[3px] disabled:pointer-events-none",
              boxRadiusClassName,
            )}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </SheetPrimitive.Close>
        ) : null}
      </SheetPrimitive.Content>
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
}: React.ComponentProps<typeof SheetPrimitive.Title>) {
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
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
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

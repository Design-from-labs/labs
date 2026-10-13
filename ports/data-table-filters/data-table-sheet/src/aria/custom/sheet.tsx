"use client";

import { boxRadiusClassName } from "../lib/style";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import * as React from "react";
import {
  Button,
  Dialog,
  Heading,
  Modal,
  ModalOverlay,
  Pressable,
} from "react-aria-components";

/**
 * The block's side sheet on React Aria: `ModalOverlay` (the dimmed backdrop,
 * dismissed by a press outside or Escape), `Modal` (the panel) and `Dialog`
 * (focus containment, the title as its name, focus restored on close).
 *
 * The parts and props keep the Radix sheet's API (`open`/`onOpenChange` on
 * `Sheet`, `side` and `hideClose` on `SheetContent`, `SheetClose` with
 * `asChild`), so the details sheet reads the same on every variant. React Aria
 * publishes `data-entering` and `data-exiting` while it animates in and out,
 * and keeps the sheet mounted until the exit animation ends; those drive the
 * same tw-animate-css slide and fade as the Radix `data-state` ones.
 */
type SheetContextValue = {
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  descriptionId: string;
  hasDescription: boolean;
  setHasDescription: (has: boolean) => void;
};

const SheetContext = React.createContext<SheetContextValue | null>(null);

function useSheet() {
  const context = React.useContext(SheetContext);
  if (!context) throw new Error("Sheet parts must be used within a Sheet");
  return context;
}

function Sheet({
  open,
  defaultOpen = false,
  onOpenChange,
  children,
}: {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const [hasDescription, setHasDescription] = React.useState(false);
  const descriptionId = React.useId();
  const isOpen = open ?? uncontrolledOpen;

  const setOpen = React.useCallback(
    (next: boolean) => {
      if (open === undefined) setUncontrolledOpen(next);
      onOpenChange?.(next);
    },
    [open, onOpenChange],
  );

  const value = React.useMemo(
    () => ({
      isOpen,
      setOpen,
      descriptionId,
      hasDescription,
      setHasDescription,
    }),
    [isOpen, setOpen, descriptionId, hasDescription],
  );

  return (
    <SheetContext.Provider value={value}>{children}</SheetContext.Provider>
  );
}

/** Opens the sheet on press; its child must be focusable (a button). */
function SheetTrigger({
  children,
}: {
  children: React.ComponentProps<typeof Pressable>["children"];
}) {
  const { setOpen } = useSheet();
  return <Pressable onPress={() => setOpen(true)}>{children}</Pressable>;
}

/**
 * Closes the sheet. With `asChild` (or `render`), the child becomes the close
 * button; it must be a React Aria `Button`, which `aria-nova`'s `ui/button` is.
 */
function SheetClose({
  asChild,
  render,
  children,
  className,
  ...props
}: Omit<React.ComponentProps<typeof Button>, "className"> & {
  asChild?: boolean;
  render?: React.ReactElement;
  className?: string;
}) {
  const child = render
    ? children === undefined
      ? render
      : React.cloneElement(render, undefined, children as React.ReactNode)
    : children;

  if ((asChild || render) && React.isValidElement(child)) {
    return React.cloneElement(child as React.ReactElement<object>, {
      slot: "close",
      ...props,
    });
  }

  return (
    <Button slot="close" className={className} {...props}>
      {children}
    </Button>
  );
}

/** React Aria portals the modal itself; kept so the parts match Radix's. */
function SheetPortal({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}

const overlayClassName = cn(
  "bg-background/40 fixed inset-0 z-50",
  "data-entering:animate-in data-entering:fade-in-0 data-exiting:animate-out data-exiting:fade-out-0",
  "motion-reduce:data-entering:animate-none motion-reduce:data-exiting:animate-none",
);

/**
 * The backdrop as a standalone part, for compositions that draw their own.
 * `SheetContent` already includes one.
 */
function SheetOverlay({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-overlay"
      className={cn(overlayClassName, className)}
      {...props}
    />
  );
}

const sheetVariants = cva(
  "bg-background data-entering:animate-in data-exiting:animate-out fixed z-50 gap-4 p-6 shadow-lg outline-none transition ease-in-out data-exiting:duration-300 data-entering:duration-500 motion-reduce:transition-none motion-reduce:data-entering:animate-none motion-reduce:data-exiting:animate-none",
  {
    variants: {
      // `left` and `right` are the inline start and end: they mirror under
      // `dir="rtl"`, so a detail sheet stays on the side away from the reading start.
      side: {
        top: "data-exiting:slide-out-to-top data-entering:slide-in-from-top inset-x-0 top-0 border-b",
        bottom:
          "data-exiting:slide-out-to-bottom data-entering:slide-in-from-bottom inset-x-0 bottom-0 border-t",
        left: "data-exiting:slide-out-to-start data-entering:slide-in-from-start inset-y-0 start-0 h-full w-3/4 border-e sm:max-w-sm",
        right:
          "data-exiting:slide-out-to-end data-entering:slide-in-from-end inset-y-0 end-0 h-full w-3/4 border-s sm:max-w-sm",
      },
    },
    defaultVariants: {
      side: "right",
    },
  },
);

interface SheetContentProps extends VariantProps<typeof sheetVariants> {
  className?: string;
  children?: React.ReactNode;
  hideClose?: boolean;
  /** Whether a press outside the sheet closes it (default, as on Radix). */
  isDismissable?: boolean;
}

function SheetContent({
  side = "right",
  className,
  children,
  hideClose,
  isDismissable = true,
}: SheetContentProps) {
  const { isOpen, setOpen, descriptionId, hasDescription } = useSheet();

  return (
    <ModalOverlay
      data-slot="sheet-overlay"
      isOpen={isOpen}
      onOpenChange={setOpen}
      isDismissable={isDismissable}
      className={overlayClassName}
    >
      <Modal
        data-slot="sheet-content"
        className={cn(sheetVariants({ side }), className)}
      >
        <Dialog
          aria-describedby={hasDescription ? descriptionId : undefined}
          className="outline-none"
        >
          {children}
          {!hideClose ? (
            <Button
              slot="close"
              autoFocus
              className={cn(
                "data-focus-visible:border-ring data-focus-visible:ring-ring/50 absolute top-4 end-4 opacity-70 transition-all outline-none hover:opacity-100 data-focus-visible:ring-[3px] data-disabled:pointer-events-none",
                boxRadiusClassName,
              )}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          ) : null}
        </Dialog>
      </Modal>
    </ModalOverlay>
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

/** The dialog's name: React Aria labels the dialog by its `title` slot. */
function SheetTitle({
  className,
  ...props
}: Omit<React.ComponentProps<typeof Heading>, "className"> & {
  className?: string;
}) {
  return (
    <Heading
      slot="title"
      level={2}
      data-slot="sheet-title"
      className={cn("text-foreground text-lg font-semibold", className)}
      {...props}
    />
  );
}

/** The dialog's description, wired to it with `aria-describedby`. */
function SheetDescription({ className, ...props }: React.ComponentProps<"p">) {
  const { descriptionId, setHasDescription } = useSheet();

  React.useEffect(() => {
    setHasDescription(true);
    return () => setHasDescription(false);
  }, [setHasDescription]);

  return (
    <p
      id={descriptionId}
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

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  BottomSheetContext,
  type BottomSheetContextValue,
  useMergedRef,
  useSheetAttributes,
  useSheetContext,
} from "./bottom-sheet-context";
import { BottomSheetStyles } from "./bottom-sheet-styles";
import { DialogPanel } from "./dialog-panel";
import {
  SheetController,
  type SheetLifecycleEvent,
  type SheetPanel,
  type SheetState,
  type SnapChangeDetail,
} from "./sheet-controller";

// The bottom sheet on the native <dialog> (upstream's own layer): showModal()
// gives the top layer, the ::backdrop scrim, inertness outside the sheet, the
// focus move and Escape; DialogPanel adds the animated state machine and
// focus return; SheetController adds the gestures and snap points.

export {
  BottomSheetContent,
  BottomSheetFooter,
  BottomSheetHeader,
  useBottomSheet,
} from "./bottom-sheet-parts";
export type { SheetLifecycleEvent, SheetState, SnapChangeDetail };

interface BottomSheetProps {
  children?: React.ReactNode;
  /** Controlled open state. */
  open?: boolean;
  /** Open on mount, already at rest (no slide); also renders open on the server. */
  defaultOpen?: boolean;
  /** Called when the sheet opens or starts closing (gesture, Escape, backdrop, close button). */
  onOpenChange?: (open: boolean) => void;
  /** Resting heights in percent of the viewport (dvh), for example [40, 70, 100]. */
  snapPoints?: number[];
  /** Controlled snap: setting it moves the sheet there. */
  snap?: number;
  /** The snap the sheet first opens at; defaults to the shortest. */
  defaultSnap?: number;
  /** Called when the sheet settles on a different snap ({ from, to }). */
  onSnapChange?: (detail: SnapChangeDetail) => void;
  /** Settle on a velocity-aware spring (default), on the CSS clock (false), or with [attraction, friction]. */
  spring?: boolean | readonly [number, number];
  /** Viewport width in px above which the sheet will not open, and closes. */
  maxDisplayWidth?: number;
  /** Fired before opening; call preventDefault() to refuse. */
  onBeforeShow?: (event: SheetLifecycleEvent) => void;
  /** Fired when the opening transition has finished. */
  onShown?: (event: SheetLifecycleEvent) => void;
  /** Fired before closing; call preventDefault() to refuse. */
  onBeforeHide?: (event: SheetLifecycleEvent) => void;
  /** Fired when the sheet is closed; `result` is the closing button's data-result. */
  onHidden?: (event: SheetLifecycleEvent) => void;
}

const SheetPanelContext = React.createContext<{
  setPanel: (panel: DialogPanel | null) => void;
  lifecycle: (event: SheetLifecycleEvent) => void;
  onState: (state: SheetState) => void;
  defaultOpen: boolean;
} | null>(null);

/**
 * The sheet's state and behavior. Renders no element of its own: put a
 * BottomSheetTrigger and a BottomSheetDialog inside.
 */
function BottomSheet({
  children,
  open,
  defaultOpen = false,
  onOpenChange,
  snapPoints,
  snap,
  defaultSnap,
  onSnapChange,
  spring,
  maxDisplayWidth,
  onBeforeShow,
  onShown,
  onBeforeHide,
  onHidden,
}: BottomSheetProps) {
  const titleId = React.useId();
  const props = React.useRef({
    onOpenChange,
    onSnapChange,
    onBeforeShow,
    onShown,
    onBeforeHide,
    onHidden,
  });
  props.current = {
    onOpenChange,
    onSnapChange,
    onBeforeShow,
    onShown,
    onBeforeHide,
    onHidden,
  };
  const panelRef = React.useRef<DialogPanel | null>(null);
  const [state, setState] = React.useState<SheetState>(
    defaultOpen ? "shown" : "hidden",
  );

  // The controller talks to whichever DialogPanel is mounted.
  const [controller] = React.useState(() => {
    const panel: SheetPanel = {
      get state() {
        return panelRef.current?.state ?? "hidden";
      },
      get isOpen() {
        return panelRef.current?.isOpen ?? false;
      },
      show: (trigger) => panelRef.current?.show(trigger) ?? false,
      hide: (trigger) => panelRef.current?.hide(trigger) ?? false,
    };
    return new SheetController({
      surface: () => panelRef.current?.dialog ?? null,
      panel,
      onSnapChange: (detail) => props.current.onSnapChange?.(detail),
    });
  });

  const hasSnaps = useSheetAttributes(controller, {
    snapPoints,
    snap,
    defaultSnap,
    spring,
    maxDisplayWidth,
  });

  const show = React.useCallback(
    (trigger?: HTMLElement | null) => controller.show(trigger),
    [controller],
  );
  const hide = React.useCallback(() => controller.hide(), [controller]);

  // Controlled `open`: follow the prop; focus returns to whatever had it.
  React.useEffect(() => {
    if (open === undefined) return;
    const panel = panelRef.current;
    if (!panel) return;
    if (open && !panel.isOpen) {
      const active = document.activeElement;
      controller.show(active instanceof HTMLElement ? active : null);
    } else if (!open && panel.isOpen) {
      controller.hide();
    }
  }, [open, controller]);

  const panelContext = React.useMemo(
    () => ({
      setPanel: (panel: DialogPanel | null) => {
        panelRef.current = panel;
      },
      lifecycle: (event: SheetLifecycleEvent) => {
        const p = props.current;
        // The sheet listens first (upstream registers its listeners on the
        // panel before any page script), then the author.
        if (event.type === "beforeShow") {
          controller.beforeShow();
          p.onBeforeShow?.(event);
        } else if (event.type === "beforeHide") {
          controller.beforeHide();
          p.onBeforeHide?.(event);
        } else if (event.type === "shown") {
          p.onShown?.(event);
        } else {
          p.onHidden?.(event);
        }
      },
      onState: (next: SheetState) => {
        setState((previous) => {
          const wasOpen = previous === "showing" || previous === "shown";
          const isOpen = next === "showing" || next === "shown";
          if (wasOpen !== isOpen) {
            queueMicrotask(() => props.current.onOpenChange?.(isOpen));
          }
          return next;
        });
      },
      defaultOpen,
    }),
    // defaultOpen is read once, on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [controller],
  );

  const value = React.useMemo<BottomSheetContextValue>(
    () => ({ controller, titleId, show, hide, state, hasSnaps }),
    [controller, titleId, show, hide, state, hasSnaps],
  );

  return (
    <BottomSheetContext.Provider value={value}>
      <SheetPanelContext.Provider value={panelContext}>
        {children}
      </SheetPanelContext.Provider>
    </BottomSheetContext.Provider>
  );
}

/** A button that opens the sheet; focus comes back to it on close. */
function BottomSheetTrigger({
  onClick,
  type = "button",
  ...props
}: React.ComponentProps<"button">) {
  const { show, state } = useSheetContext("BottomSheetTrigger");
  return (
    <button
      data-slot="bottom-sheet-trigger"
      type={type}
      aria-haspopup="dialog"
      aria-expanded={state === "showing" || state === "shown"}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) show(event.currentTarget);
      }}
      {...props}
    />
  );
}

interface BottomSheetDialogProps
  extends Omit<React.ComponentProps<"dialog">, "open"> {
  /** Detached from the screen edges, all four corners rounded. */
  inset?: boolean;
}

/**
 * The sheet itself: a native <dialog> in the top layer, with the header,
 * content and footer inside. Name it with a BottomSheetTitle, or with
 * aria-label / aria-labelledby.
 */
function BottomSheetDialog({
  inset = false,
  className,
  children,
  style,
  ref,
  ...props
}: BottomSheetDialogProps) {
  const { controller, titleId, hasSnaps } =
    useSheetContext("BottomSheetDialog");
  const panelContext = React.useContext(SheetPanelContext);
  if (!panelContext) {
    throw new Error("<BottomSheetDialog> must be rendered inside <BottomSheet>.");
  }
  const { setPanel, lifecycle, onState, defaultOpen } = panelContext;
  const dialogRef = React.useRef<HTMLDialogElement | null>(null);
  const setRef = useMergedRef(dialogRef, ref);

  // Rendered once and then owned by the DOM code: React never rewrites the
  // state, the height or the open attribute after the first render.
  const [initial] = React.useState(() => {
    const points = controller.snapPoints;
    const resting = controller.snap;
    return {
      state: defaultOpen ? "shown" : "hidden",
      height: points.length && resting !== null ? `${resting}dvh` : undefined,
      open: defaultOpen || undefined,
    };
  });

  React.useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const panel = new DialogPanel(dialog, lifecycle, onState);
    setPanel(panel);
    panel.connect();
    controller.connect();
    // Rendered open (defaultOpen): promote it to the modal top layer.
    panel.adoptOpen();
    return () => {
      controller.disconnect();
      panel.disconnect();
      setPanel(null);
    };
  }, [controller, lifecycle, onState, setPanel]);

  const labelled =
    props["aria-labelledby"] ?? (props["aria-label"] ? undefined : titleId);

  return (
    <>
      <BottomSheetStyles />
      <dialog
        data-slot="bottom-sheet-dialog"
        data-sheet-state={initial.state}
        data-snap-points={hasSnaps ? "" : undefined}
        data-inset={inset ? "" : undefined}
        open={initial.open}
        ref={setRef}
        className={cn(className)}
        style={{ ...style, height: initial.height }}
        {...props}
        aria-labelledby={labelled}
      >
        <div data-slot="bottom-sheet">{children}</div>
      </dialog>
    </>
  );
}

/** The sheet's accessible name; the dialog points at it. */
function BottomSheetTitle({ id, ...props }: React.ComponentProps<"h2">) {
  const { titleId } = useSheetContext("BottomSheetTitle");
  return <h2 data-slot="bottom-sheet-title" id={id ?? titleId} {...props} />;
}

/**
 * A button that closes the sheet. `data-result` on it is reported to
 * onHidden as `result`.
 */
function BottomSheetClose({
  type = "button",
  ...props
}: React.ComponentProps<"button">) {
  useSheetContext("BottomSheetClose");
  return (
    <button
      data-slot="bottom-sheet-close"
      data-action-hide-dialog=""
      type={type}
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

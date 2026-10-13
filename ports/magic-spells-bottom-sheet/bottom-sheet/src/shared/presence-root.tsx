"use client";

import * as React from "react";
import { flushSync } from "react-dom";
import {
  BottomSheetContext,
  type BottomSheetContextValue,
  useSheetAttributes,
  useSheetContext,
} from "./bottom-sheet-context";
import { PresencePanel } from "./presence-panel";
import {
  SheetController,
  type SheetLifecycleEvent,
  type SheetState,
  type SnapChangeDetail,
} from "./sheet-controller";

// The root and trigger shared by the headless dialog layers (Radix, Base UI,
// React Aria): the same props and behavior as the native-dialog root, with a
// PresencePanel that mounts the primitive's dialog for the lifetime of a
// show (open through the exit transition) instead of calling showModal().

interface BottomSheetProps {
  children?: React.ReactNode;
  /** Controlled open state. */
  open?: boolean;
  /** Open on mount, already at rest (no slide). */
  defaultOpen?: boolean;
  /** Called when the sheet opens or starts closing (gesture, Escape, outside press, close button). */
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

interface PresenceContextValue {
  /** Whether the primitive's dialog is mounted (open through the exit). */
  mounted: boolean;
  state: SheetState;
  /** The moving surface's ref: connects the gestures while it is mounted. */
  surfaceRef: (el: HTMLElement | null) => void;
  /** The primitive asked to close (Escape, outside press): animate out. */
  requestClose: () => void;
}

const PresenceContext = React.createContext<PresenceContextValue | null>(null);

function usePresence(part: string): PresenceContextValue {
  const context = React.useContext(PresenceContext);
  if (!context) {
    throw new Error(`<${part}> must be rendered inside <BottomSheet>.`);
  }
  return context;
}

const isOpenState = (state: SheetState) =>
  state === "showing" || state === "shown";

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
  const [mounted, setMounted] = React.useState(defaultOpen);
  const [state, setState] = React.useState<SheetState>(
    defaultOpen ? "shown" : "hidden",
  );
  const surface = React.useRef<HTMLElement | null>(null);

  const [{ controller, panel }] = React.useState(() => {
    let controllerRef: SheetController | null = null;
    const presence = new PresencePanel(
      {
        mount: (next) => flushSync(() => setMounted(next)),
        setState: (next) => {
          let changed = false;
          flushSync(() =>
            setState((previous) => {
              changed = isOpenState(previous) !== isOpenState(next);
              return next;
            }),
          );
          if (changed) props.current.onOpenChange?.(isOpenState(next));
        },
        surface: () => surface.current,
      },
      (event) => {
        const p = props.current;
        // The sheet listens first, then the author (as upstream).
        if (event.type === "beforeShow") {
          controllerRef?.beforeShow();
          p.onBeforeShow?.(event);
        } else if (event.type === "beforeHide") {
          controllerRef?.beforeHide();
          p.onBeforeHide?.(event);
        } else if (event.type === "shown") {
          p.onShown?.(event);
        } else {
          p.onHidden?.(event);
        }
      },
    );
    if (defaultOpen) presence.adoptOpen();
    controllerRef = new SheetController({
      surface: () => surface.current,
      panel: presence,
      onSnapChange: (detail) => props.current.onSnapChange?.(detail),
    });
    return { controller: controllerRef, panel: presence };
  });

  const hasSnaps = useSheetAttributes(controller, {
    snapPoints,
    snap,
    defaultSnap,
    spring,
    maxDisplayWidth,
  });

  React.useEffect(() => () => panel.dispose(), [panel]);

  // Controlled `open`: follow the prop; focus returns to whatever had it.
  React.useEffect(() => {
    if (open === undefined) return;
    queueMicrotask(() => {
      if (open && !panel.isOpen) {
        const active = document.activeElement;
        controller.show(active instanceof HTMLElement ? active : null);
      } else if (!open && panel.isOpen) {
        controller.hide();
      }
    });
  }, [open, controller, panel]);

  const show = React.useCallback(
    (trigger?: HTMLElement | null) => controller.show(trigger),
    [controller],
  );
  const hide = React.useCallback(() => controller.hide(), [controller]);

  const surfaceRef = React.useCallback(
    (el: HTMLElement | null) => {
      if (el) {
        surface.current = el;
        controller.connect();
        // Mounted for an open: arm the slide the way beforeShow would have,
        // had the surface existed when it ran.
        if (panel.state === "showing") controller.beforeShow();
      } else {
        controller.disconnect();
        surface.current = null;
      }
    },
    [controller, panel],
  );

  const presenceValue = React.useMemo<PresenceContextValue>(
    () => ({
      mounted,
      state,
      surfaceRef,
      requestClose: () => {
        panel.hide();
      },
    }),
    [mounted, state, surfaceRef, panel],
  );

  const value = React.useMemo<BottomSheetContextValue>(
    () => ({ controller, titleId, show, hide, state, hasSnaps }),
    [controller, titleId, show, hide, state, hasSnaps],
  );

  return (
    <BottomSheetContext.Provider value={value}>
      <PresenceContext.Provider value={presenceValue}>
        {children}
      </PresenceContext.Provider>
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
      aria-expanded={isOpenState(state)}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) show(event.currentTarget);
      }}
      {...props}
    />
  );
}

export { BottomSheet, BottomSheetTrigger, usePresence };
export type { BottomSheetProps, PresenceContextValue };

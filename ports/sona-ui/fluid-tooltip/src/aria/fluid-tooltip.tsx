"use client";

import { useReducedMotion } from "motion/react";
import {
  cloneElement,
  createContext,
  forwardRef,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
  type Ref,
  type RefObject,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Focusable,
  OverlayArrow,
  Tooltip,
  TooltipTrigger,
} from "react-aria-components";

import { cn } from "@/lib/utils";

/*
 * Ported from Dinil-Thilakarathne/sona-ui,
 * src/registry/sonaui/fluid-tooltip/fluid-tooltip.tsx, at commit 9a72ffe9648f:
 * https://github.com/Dinil-Thilakarathne/sona-ui
 *
 * The React Aria variant of the Base UI original (fluid-tooltip-base): the
 * same API, surface, timing and colors. React Aria gives every trigger its
 * own tooltip (and opens the next one at once while one is showing), so the
 * handoff is rebuilt: the new surface starts from the previous one and glides
 * to its own (FLIP, 200ms on the upstream curve) while its label slides in
 * 8px from the side of travel; the previous surface leaves at once.
 * Placement start and end follow the reading direction.
 */

type FluidTooltipOrientation = "horizontal" | "vertical" | "auto";
type FluidTooltipSide =
  | "top"
  | "right"
  | "bottom"
  | "left"
  | "inline-start"
  | "inline-end";
type FluidTooltipAlign = "start" | "center" | "end";

// The surface of the tooltip that was open last, kept for a moment after it
// closes so the next one can start from it (the "fluid" handoff).
interface FluidTooltipLast {
  id: string;
  rect: DOMRect;
  closedAt: number;
}

interface FluidTooltipGroupContextValue {
  disabled: boolean;
  defaultSide: FluidTooltipSide;
  orientation: FluidTooltipOrientation;
  openDelay: number;
  closeDelay: number;
  className?: string;
  reduce: boolean;
  /** The surface that closed last, for the handoff. */
  last: RefObject<FluidTooltipLast | null>;
  /** The surface on screen now (it may still be playing its exit). */
  current: RefObject<{ id: string; element: HTMLElement } | null>;
}

interface FluidTooltipRootContextValue {
  id: string;
  disabled: boolean;
  side?: FluidTooltipSide;
  align: FluidTooltipAlign;
  sideOffset: number;
  setKeepOpen: (keepOpen: boolean) => void;
  /** The previous surface when this one opened as a handoff, else null. */
  handoff: FluidTooltipLast | null;
  surfaceRef: RefObject<HTMLElement | null>;
}

const GroupContext = createContext<FluidTooltipGroupContextValue | null>(null);
const RootContext = createContext<FluidTooltipRootContextValue | null>(null);

// Upstream's surface timing: 200ms on cubic-bezier(0.22, 1, 0.36, 1); the
// label slides for 200ms and fades in for 120ms.
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const HANDOFF_WINDOW = 50;

// First appearance and exit, as upstream's starting and ending styles.
// React 19 hoists this <style> into <head> once.
const css = `
@keyframes fluid-tooltip-enter {
  from { opacity: 0; transform: translateY(var(--fluid-tooltip-enter-y, 0.25rem)) scale(0.96); }
}
@keyframes fluid-tooltip-exit {
  to { opacity: 0; transform: scale(0.98); }
}
[data-slot="fluid-tooltip"][data-entering] {
  animation: fluid-tooltip-enter 200ms ${EASE};
}
[data-slot="fluid-tooltip"][data-exiting] {
  animation: fluid-tooltip-exit 100ms ${EASE} forwards;
}
[data-slot="fluid-tooltip"][data-instant] {
  animation: none;
}
/* Scale from the trigger's side, as upstream's transform origin does. */
[data-slot="fluid-tooltip"]:is([data-side="top"], [data-placement="top"]) {
  transform-origin: bottom center;
}
[data-slot="fluid-tooltip"]:is([data-side="bottom"], [data-placement="bottom"]) {
  transform-origin: top center;
}
[data-slot="fluid-tooltip"]:is([data-side="left"], [data-placement="left"]) {
  transform-origin: center right;
}
[data-slot="fluid-tooltip"]:is([data-side="right"], [data-placement="right"]) {
  transform-origin: center left;
}
/* Reduced motion: no glide, no scale; it appears and disappears at once. */
@media (prefers-reduced-motion: reduce) {
  [data-slot="fluid-tooltip"][data-entering],
  [data-slot="fluid-tooltip"][data-exiting] {
    animation: none;
  }
}
`;

function useGroupContext(component: string) {
  const context = useContext(GroupContext);
  if (!context) {
    throw new Error(`${component} must be used inside FluidTooltip.Group.`);
  }
  return context;
}

function useRootContext(component: string) {
  const context = useContext(RootContext);
  if (!context) {
    throw new Error(`${component} must be used inside FluidTooltip.Root.`);
  }
  return context;
}

/**
 * Runs `done` with the element's rect as soon as it is positioned (before
 * that frame is painted), watching the style its positioner writes.
 */
function whenPlaced(element: HTMLElement, done: (rect: DOMRect) => void) {
  const wrapper = element.parentElement;
  // React Aria writes top/left (or bottom/right) once it has measured.
  const placed = () => {
    const { top, left, bottom, right } = element.style;
    const rect = element.getBoundingClientRect();
    return (top || bottom) && (left || right) && rect.width > 0 ? rect : null;
  };
  const now = placed();
  if (now) {
    done(now);
    return () => {};
  }
  const observer = new MutationObserver(() => {
    const rect = placed();
    if (rect) {
      observer.disconnect();
      done(rect);
    }
  });
  for (const node of [element, wrapper]) {
    if (node) observer.observe(node, { attributes: true, attributeFilter: ["style"] });
  }
  return () => observer.disconnect();
}

export interface FluidTooltipGroupProps {
  /** Related tooltip roots rendered inside the group. */
  children: ReactNode;
  /** Axis used to calculate directional content entry. @default "auto" */
  orientation?: FluidTooltipOrientation;
  /** Delay before the first pointer tooltip opens, in milliseconds. @default 350 */
  openDelay?: number;
  /** Grace period before a pointer tooltip closes, in milliseconds. @default 100 */
  closeDelay?: number;
  /** Disables tooltip behavior for every trigger in the group. @default false */
  disabled?: boolean;
  /** Additional CSS classes for the positioned tooltip surface. @default undefined */
  className?: string;
}

export function FluidTooltipGroup({
  children,
  orientation = "auto",
  openDelay = 350,
  closeDelay = 100,
  disabled = false,
  className,
}: FluidTooltipGroupProps) {
  const shouldReduceMotion = Boolean(useReducedMotion());
  const last = useRef<FluidTooltipLast | null>(null);
  const current = useRef<{ id: string; element: HTMLElement } | null>(null);

  const context = useMemo<FluidTooltipGroupContextValue>(
    () => ({
      disabled,
      defaultSide: orientation === "vertical" ? "inline-end" : "top",
      orientation,
      openDelay: Math.max(0, openDelay),
      closeDelay: Math.max(0, closeDelay),
      className,
      reduce: shouldReduceMotion,
      last,
      current,
    }),
    [className, closeDelay, disabled, openDelay, orientation, shouldReduceMotion],
  );

  return (
    <>
      <style href="designfrom-fluid-tooltip" precedence="default">
        {css}
      </style>
      <GroupContext.Provider value={context}>{children}</GroupContext.Provider>
    </>
  );
}

export interface FluidTooltipRootProps {
  /** Stable identifier used to key directional content transitions. */
  id: string;
  /** Trigger and content parts associated with this tooltip. */
  children: ReactNode;
  /** Preferred side of the trigger ("inline-start" and "inline-end" follow the reading direction). Overrides the group default when provided. @default undefined */
  side?: FluidTooltipSide;
  /** Alignment relative to the trigger. @default "center" */
  align?: FluidTooltipAlign;
  /** Distance between the trigger and tooltip, in pixels. @default 8 */
  sideOffset?: number;
  /** Disables this tooltip without disabling its trigger. @default false */
  disabled?: boolean;
}

export function FluidTooltipRoot({
  id,
  children,
  side,
  align = "center",
  sideOffset = 8,
  disabled = false,
}: FluidTooltipRootProps) {
  const group = useGroupContext("FluidTooltip.Root");
  const [open, setOpen] = useState(false);
  const [handoff, setHandoff] = useState<FluidTooltipLast | null>(null);
  const [keepOpen, setKeepOpen] = useState(false);
  const surfaceRef = useRef<HTMLElement | null>(null);
  const context = useMemo<FluidTooltipRootContextValue>(
    () => ({
      id,
      disabled,
      side,
      align,
      sideOffset,
      setKeepOpen,
      handoff,
      surfaceRef,
    }),
    [align, disabled, handoff, id, side, sideOffset],
  );
  const off = disabled || group.disabled;

  return (
    <RootContext.Provider value={context}>
      <TooltipTrigger
        delay={group.openDelay}
        closeDelay={group.closeDelay}
        isDisabled={off}
        isOpen={!off && open}
        shouldCloseOnPress={!keepOpen}
        onOpenChange={(next) => {
          if (next) {
            // Opened right after another one closed: a handoff, which
            // glides from that surface instead of appearing.
            const last = group.last.current;
            setHandoff(
              last &&
                last.id !== id &&
                performance.now() - last.closedAt <=
                  group.closeDelay + HANDOFF_WINDOW
                ? last
                : null,
            );
          } else if (surfaceRef.current) {
            group.last.current = {
              id,
              rect: surfaceRef.current.getBoundingClientRect(),
              closedAt: performance.now(),
            };
          }
          setOpen(next);
        }}
      >
        {children}
      </TooltipTrigger>
    </RootContext.Provider>
  );
}

export interface FluidTooltipTriggerProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "children"> {
  /** Existing button or link used as the actual trigger. */
  children: ReactElement;
  /** Uses the child element without introducing a wrapper. @default true */
  asChild?: boolean;
  /** Keeps the tooltip open when the trigger is activated. @default false */
  keepOpenOnClick?: boolean;
}

export const FluidTooltipTrigger = forwardRef<
  HTMLElement,
  FluidTooltipTriggerProps
>(function FluidTooltipTrigger(
  { children, asChild = true, keepOpenOnClick = false, ...props },
  ref,
) {
  useGroupContext("FluidTooltip.Trigger");
  const root = useRootContext("FluidTooltip.Trigger");
  const { setKeepOpen } = root;
  useLayoutEffect(() => {
    setKeepOpen(keepOpenOnClick);
  }, [keepOpenOnClick, setKeepOpen]);

  // React Aria's Focusable gives the child the trigger's focus, hover and
  // describedby wiring; without asChild the child goes in a plain button.
  const child = asChild ? (
    cloneElement(children as ReactElement<HTMLAttributes<HTMLElement>>, props)
  ) : (
    <button type="button" {...(props as HTMLAttributes<HTMLButtonElement>)}>
      {children}
    </button>
  );
  return <Focusable ref={ref as Ref<HTMLElement>}>{child}</Focusable>;
});

/**
 * The label inside a surface. Its layout effect runs when the surface mounts
 * (the tooltip opens): it records the surface and, for a handoff, glides it
 * from the previous one (FLIP) while the label slides in.
 */
function FluidTooltipLabel({ children }: { children: ReactNode }) {
  const group = useGroupContext("FluidTooltip.Content");
  const root = useRootContext("FluidTooltip.Content");
  const labelRef = useRef<HTMLSpanElement>(null);
  const { handoff } = root;

  useLayoutEffect(() => {
    const label = labelRef.current;
    const surface = label?.closest<HTMLElement>('[data-slot="fluid-tooltip"]');
    if (!label || !surface) return;
    root.surfaceRef.current = surface;
    const previous = group.current.current;
    group.current.current = { id: root.id, element: surface };
    if (!handoff) return;
    // The previous surface leaves at once instead of playing its exit.
    if (previous && previous.element !== surface) {
      previous.element.style.animation = "none";
      previous.element.style.visibility = "hidden";
    }
    if (group.reduce) return;
    const animations: Animation[] = [];
    const cancel = whenPlaced(surface, (rect) => {
      const dx = handoff.rect.left - rect.left;
      const dy = handoff.rect.top - rect.top;
      animations.push(
        surface.animate(
          [
            {
              translate: `${dx}px ${dy}px`,
              width: `${handoff.rect.width}px`,
              height: `${handoff.rect.height}px`,
            },
            {
              translate: "0px 0px",
              width: `${rect.width}px`,
              height: `${rect.height}px`,
            },
          ],
          { duration: 200, easing: EASE },
        ),
      );
      // The label enters from the side the pointer travelled toward.
      const horizontal =
        group.orientation === "horizontal" ||
        (group.orientation === "auto" && Math.abs(dx) >= Math.abs(dy));
      const delta = horizontal ? -dx : -dy;
      const shift = delta === 0 ? 0 : delta > 0 ? 8 : -8;
      label.style.width = `${label.getBoundingClientRect().width}px`;
      const slide = label.animate(
        [
          { translate: horizontal ? `${shift}px 0px` : `0px ${shift}px` },
          { translate: "0px 0px" },
        ],
        { duration: 200, easing: EASE },
      );
      animations.push(
        slide,
        label.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: 120,
          easing: EASE,
        }),
      );
      slide.finished
        .then(() => {
          label.style.width = "";
        })
        .catch(() => {});
    });
    return () => {
      cancel();
      for (const animation of animations) animation.cancel();
    };
  }, [group, handoff, root.id, root.surfaceRef]);

  return (
    <span ref={labelRef} data-current="" className="block">
      {children}
    </span>
  );
}

export interface FluidTooltipContentProps {
  /** Short, non-interactive tooltip label. */
  children: ReactNode;
  /** Additional CSS classes for this tooltip's surface. @default undefined */
  className?: string;
  /** Shows the arrow connecting the surface to its trigger. @default true */
  showArrow?: boolean;
}

/** React Aria placements; start and end follow the reading direction. */
const PLACEMENT = {
  top: "top",
  bottom: "bottom",
  left: "left",
  right: "right",
  "inline-start": "start",
  "inline-end": "end",
} as const;

export function FluidTooltipContent({
  children,
  className,
  showArrow = true,
}: FluidTooltipContentProps) {
  const group = useGroupContext("FluidTooltip.Content");
  const root = useRootContext("FluidTooltip.Content");
  const { handoff } = root;
  const side = root.side ?? group.defaultSide;

  return (
    <Tooltip
      data-slot="fluid-tooltip"
      data-instant={handoff ? "" : undefined}
      placement={PLACEMENT[side]}
      offset={root.sideOffset}
      containerPadding={8}
      className={cn(
        "relative z-9999 rounded-lg bg-[var(--fluid-tooltip-surface)] text-[12px] font-medium leading-none text-[var(--fluid-tooltip-label)] shadow-[0_8px_24px_-8px_var(--fluid-tooltip-shadow)] outline-none",
        group.className,
        className,
      )}
    >
      <div className="relative box-border h-full w-full overflow-clip px-2 py-1">
        <FluidTooltipLabel>{children}</FluidTooltipLabel>
      </div>
      {showArrow ? (
        <OverlayArrow>
          {({ placement }) => (
            <span
              className={cn(
                "block size-2 rotate-45 bg-[var(--fluid-tooltip-surface)]",
                placement === "top" && "-translate-y-1/2",
                placement === "bottom" && "translate-y-1/2",
                placement === "left" && "-translate-x-1/2",
                placement === "right" && "translate-x-1/2",
              )}
            />
          )}
        </OverlayArrow>
      ) : null}
    </Tooltip>
  );
}

export const FluidTooltip = {
  Group: FluidTooltipGroup,
  Root: FluidTooltipRoot,
  Trigger: FluidTooltipTrigger,
  Content: FluidTooltipContent,
};

export default FluidTooltip;

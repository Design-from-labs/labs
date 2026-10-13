"use client";

import { X } from "lucide-react";
import {
  AnimatePresence,
  animate as animateValue,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Tabs } from "radix-ui";
import { cn } from "@/lib/utils";

/*
 * Ported from starc007/ui-components (beUI), components/motion/morphing-tabs.tsx,
 * at commit 7bb802bc0123: https://github.com/starc007/ui-components
 *
 * Changes from upstream (the default look is unchanged):
 * - the tabs are Radix Tabs (Root, List, Trigger, Content): roving focus,
 *   arrow keys, Home and End, ids and aria wiring come from Radix; the
 *   hand-rolled roles, ids and arrow handling are gone. A press does not
 *   select on mousedown, so dragging a tab does not select it (as upstream);
 * - the close buttons sit outside the tablist (a tablist owns only tabs),
 *   in a layer that moves with their tab;
 * - right to left: the slots, the drag and the liquid surface are mirrored,
 *   and Alt+Arrow reorders in the reading direction;
 * - beUI's easing, spring and touch tokens are inlined below.
 * The liquid surface, the springs, the drag and the layout are upstream.
 */

// From beUI lib/ease.ts and lib/touch.ts (same commit).
const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const SPRING_PRESS = {
  type: "spring",
  stiffness: 500,
  damping: 30,
  mass: 0.6,
} as const;
const SPRING_GLIDE = {
  stiffness: 700,
  damping: 50,
  mass: 0.5,
} as const;
const TOUCH_GESTURE_CLASS = "select-none [-webkit-touch-callout:none]";
function capturePointer(element: Element, pointerId: number) {
  try {
    element.setPointerCapture(pointerId);
  } catch {
    // Pointer is no longer active; implicit capture still applies on touch.
  }
}

export type MorphingTabsItem = {
  id: string;
  label: string;
  icon?: ReactNode;
  content: ReactNode;
  disabled?: boolean;
};

export type MorphingTabsClassNames = {
  root?: string;
  rail?: string;
  tab?: string;
  activeTab?: string;
  icon?: string;
  label?: string;
  close?: string;
  content?: string;
};

export interface MorphingTabsProps {
  items: MorphingTabsItem[];
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (id: string | null) => void;
  /** Called once after a pointer drag or keyboard reorder completes. */
  onOrderChange?: (ids: string[]) => void;
  /** Enables the close affordance on every tab when provided. */
  onClose?: (id: string) => void;
  ariaLabel?: string;
  className?: string;
  classNames?: MorphingTabsClassNames;
}

type DragSession = {
  id: string;
  pointerId: number;
  originX: number;
  startLeft: number;
  startIndex: number;
  targetIndex: number;
  moved: boolean;
  finishing: boolean;
  startOrder: string[];
  slotLefts: number[];
};

type SpringTabProps = {
  id: string;
  targetLeft: number;
  dragging: boolean;
  dragLeft: MotionValue<number>;
  surfaceLeft: MotionValue<number>;
  reduce: boolean;
  active: boolean;
  anyDragging: boolean;
  surfaceHost: HTMLDivElement | null;
  overlayHost: HTMLDivElement | null;
  overlay?: ReactNode;
  rtl: boolean;
  surfaceWidth: number;
  tabWidth: number;
  surfaceClassName?: string;
  zIndex: number;
  className: string;
  children: ReactNode;
  registerPosition: (id: string, position: MotionValue<number> | null) => void;
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerCancel: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onLostPointerCapture: (event: ReactPointerEvent<HTMLDivElement>) => void;
};

const DRAG_THRESHOLD = 5;
// The design width of a tab, and the narrowest it may shrink to before the
// label stops reading. See `tabWidth` in MorphingTabs.
const MAX_TAB_WIDTH = 176;
const MIN_TAB_WIDTH = 96;
const TAB_HEIGHT = 56;
const TAB_TOP = 24;
const TAB_RADIUS = 24;
const RAIL_HEIGHT = 80;
const SURFACE_INSET = 16;
const LIQUID_JOIN = 24;
const PANEL_RADIUS = 28;

function sameOrder(a: string[], b: string[]) {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

function moveItem(order: string[], from: number, to: number) {
  if (from === to) return order.slice();
  const next = order.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function liquidTabPath(
  tabLeft: number,
  surfaceWidth: number,
  tabWidth: number,
) {
  const panelLeft = SURFACE_INSET;
  const panelRight = surfaceWidth - SURFACE_INSET;
  const left = Math.max(
    panelLeft,
    Math.min(panelRight - tabWidth, tabLeft),
  );
  const right = left + tabWidth;
  const top = RAIL_HEIGHT - TAB_HEIGHT;
  const bottom = RAIL_HEIGHT;
  const leftJoin = Math.max(panelLeft, left - LIQUID_JOIN);
  const rightJoin = Math.min(panelRight, right + LIQUID_JOIN);
  const leftDepth = Math.min(LIQUID_JOIN, left - leftJoin);
  const rightDepth = Math.min(LIQUID_JOIN, rightJoin - right);
  const leftControl = leftDepth * 0.55;
  const rightControl = rightDepth * 0.55;
  const leftPanelRadius = Math.min(PANEL_RADIUS, leftJoin - panelLeft);
  const rightPanelRadius = Math.min(PANEL_RADIUS, panelRight - rightJoin);

  return [
    `M${panelLeft} ${bottom + PANEL_RADIUS}`,
    `V${bottom + leftPanelRadius}`,
    `Q${panelLeft} ${bottom} ${panelLeft + leftPanelRadius} ${bottom}`,
    `H${leftJoin}`,
    `C${leftJoin + leftControl} ${bottom} ${left} ${bottom - leftDepth + leftControl} ${left} ${bottom - leftDepth}`,
    `V${top + TAB_RADIUS}`,
    `Q${left} ${top} ${left + TAB_RADIUS} ${top}`,
    `H${right - TAB_RADIUS}`,
    `Q${right} ${top} ${right} ${top + TAB_RADIUS}`,
    `V${bottom - rightDepth}`,
    `C${right} ${bottom - rightDepth + rightControl} ${rightJoin - rightControl} ${bottom} ${rightJoin} ${bottom}`,
    `H${panelRight - rightPanelRadius}`,
    `Q${panelRight} ${bottom} ${panelRight} ${bottom + rightPanelRadius}`,
    `V${bottom + PANEL_RADIUS}`,
    "Z",
  ].join(" ");
}

function SpringTab({
  id,
  targetLeft,
  dragging,
  dragLeft,
  surfaceLeft,
  reduce,
  active,
  anyDragging,
  surfaceHost,
  overlayHost,
  overlay,
  rtl,
  surfaceWidth,
  tabWidth,
  surfaceClassName,
  zIndex,
  className,
  children,
  registerPosition,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onLostPointerCapture,
}: SpringTabProps) {
  const target = useMotionValue(targetLeft);
  const position = useSpring(target, SPRING_GLIDE);
  // Slots are laid out from the start edge; right to left mirrors them.
  const x = (left: number) => (rtl ? surfaceWidth - tabWidth - left : left);
  const settledTransform = useTransform(
    reduce ? target : position,
    (left) => `translate3d(${x(left)}px, 0, 0)`,
  );
  const draggedTransform = useTransform(
    dragLeft,
    (left) => `translate3d(${x(left)}px, 0, 0)`,
  );

  useLayoutEffect(() => {
    target.set(targetLeft);
    if (reduce) position.jump(targetLeft);
  }, [position, reduce, target, targetLeft]);

  useLayoutEffect(() => {
    registerPosition(id, position);
    return () => registerPosition(id, null);
  }, [id, position, registerPosition]);

  const liquidDriver = anyDragging
    ? dragging
      ? dragLeft
      : position
    : surfaceLeft;

  return (
    <>
      {active && surfaceHost && surfaceWidth > SURFACE_INSET * 2
        ? createPortal(
            <svg
              aria-hidden="true"
              focusable="false"
              viewBox={`0 0 ${surfaceWidth} ${RAIL_HEIGHT + PANEL_RADIUS}`}
              preserveAspectRatio="none"
              className={cn(
                "pointer-events-none absolute inset-x-0 top-0 h-[108px] w-full text-[#fafaf8]",
                dragging ? "z-20" : "z-0",
                rtl && "-scale-x-100",
                surfaceClassName,
              )}
            >
              <LiquidSurfacePath
                key={
                  anyDragging
                    ? dragging
                      ? "dragged"
                      : "displaced"
                    : "idle"
                }
                left={liquidDriver}
                surfaceWidth={surfaceWidth}
                tabWidth={tabWidth}
              />
            </svg>,
            surfaceHost,
          )
        : null}
      <motion.div
        style={{
          zIndex,
          transform: dragging ? draggedTransform : settledTransform,
        }}
        className={className}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onLostPointerCapture={onLostPointerCapture}
      >
        {children}
      </motion.div>
      {overlay && overlayHost
        ? createPortal(
            <motion.div
              style={{
                zIndex,
                transform: dragging ? draggedTransform : settledTransform,
              }}
              className="pointer-events-none absolute left-0 top-0"
            >
              {overlay}
            </motion.div>,
            overlayHost,
          )
        : null}
    </>
  );
}

function LiquidSurfacePath({
  left,
  surfaceWidth,
  tabWidth,
}: {
  left: MotionValue<number>;
  surfaceWidth: number;
  tabWidth: number;
}) {
  const path = useTransform(left, (value) =>
    liquidTabPath(value, surfaceWidth, tabWidth),
  );
  return <motion.path d={path} fill="currentColor" />;
}

export function MorphingTabs({
  items,
  value,
  defaultValue,
  onValueChange,
  onOrderChange,
  onClose,
  ariaLabel = "Tabs",
  className,
  classNames,
}: MorphingTabsProps) {
  const reduce = Boolean(useReducedMotion());
  const itemIds = useMemo(() => items.map((item) => item.id), [items]);
  const itemMap = useMemo(
    () => new Map(items.map((item) => [item.id, item])),
    [items],
  );
  const [order, setOrder] = useState(itemIds);
  const orderRef = useRef(order);
  orderRef.current = order;

  const [internalValue, setInternalValue] = useState<string | null>(
    defaultValue ?? itemIds[0] ?? null,
  );
  const controlled = value !== undefined;
  const currentValue = controlled ? (value ?? null) : internalValue;

  const rootRef = useRef<HTMLDivElement | null>(null);
  const railRef = useRef<HTMLDivElement | null>(null);
  const tabButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const tabPositionRefs = useRef<Record<string, MotionValue<number> | null>>(
    {},
  );
  const dragRef = useRef<DragSession | null>(null);
  const dragAnimationRef = useRef<ReturnType<typeof animateValue> | null>(null);
  const surfaceAnimationRef = useRef<ReturnType<typeof animateValue> | null>(
    null,
  );
  const [surfaceWidth, setSurfaceWidth] = useState(0);
  const [overlayHost, setOverlayHost] = useState<HTMLDivElement | null>(null);
  const [rtl, setRtl] = useState(false);
  const rtlRef = useRef(rtl);
  rtlRef.current = rtl;
  const [tabGap, setTabGap] = useState(12);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragTargetIndex, setDragTargetIndex] = useState(-1);
  const dragLeft = useMotionValue(SURFACE_INSET);
  const surfaceLeft = useMotionValue(SURFACE_INSET);

  useEffect(() => {
    setOrder((current) => {
      const available = new Set(itemIds);
      const retained = current.filter((id) => available.has(id));
      const retainedSet = new Set(retained);
      const added = itemIds.filter((id) => !retainedSet.has(id));
      const next = [...retained, ...added];
      return sameOrder(current, next) ? current : next;
    });
  }, [itemIds]);

  const orderedItems = useMemo(
    () =>
      order.flatMap((id) => {
        const item = itemMap.get(id);
        return item ? [item] : [];
      }),
    [itemMap, order],
  );

  const firstEnabledItem =
    orderedItems.find((item) => !item.disabled) ?? orderedItems[0] ?? null;
  const activeItem =
    currentValue && itemMap.has(currentValue)
      ? itemMap.get(currentValue) ?? null
      : firstEnabledItem;
  const activeId = activeItem?.id ?? null;

  // The rail cannot scroll: the liquid surface is one continuous shape spanning
  // the panel, so its notch has to stay over the tab that cut it. Slots narrow
  // to fit the panel instead, in that order of sacrifice:
  //   1. the design width, down to a floor where a truncated label still reads;
  //   2. the gap between slots, so the floor survives one panel narrower;
  //   3. the floor itself — a cramped tab is still tappable, a clipped one is
  //      not reachable at all.
  // Every tier fits inside the panel by construction, so no tab is ever cut off
  // and the notch never has to be clamped away from the tab that cut it.
  const { tabWidth, slotGap } = useMemo(() => {
    const count = order.length;
    if (!surfaceWidth || count === 0) {
      return { tabWidth: MAX_TAB_WIDTH, slotGap: tabGap };
    }
    const inner = surfaceWidth - SURFACE_INSET * 2;
    const widthAt = (gap: number) =>
      Math.floor((inner - gap * (count - 1)) / count);

    if (widthAt(tabGap) >= MIN_TAB_WIDTH) {
      return {
        tabWidth: Math.min(MAX_TAB_WIDTH, widthAt(tabGap)),
        slotGap: tabGap,
      };
    }
    if (count > 1 && widthAt(0) >= MIN_TAB_WIDTH) {
      const gap = Math.floor((inner - MIN_TAB_WIDTH * count) / (count - 1));
      return { tabWidth: MIN_TAB_WIDTH, slotGap: Math.max(0, gap) };
    }
    return { tabWidth: Math.max(0, widthAt(0)), slotGap: 0 };
  }, [order.length, surfaceWidth, tabGap]);

  const slotLefts = useMemo(
    () =>
      order.map(
        (_, index) => SURFACE_INSET + index * (tabWidth + slotGap),
      ),
    [order, slotGap, tabWidth],
  );

  const dragStartIndex = draggingId ? order.indexOf(draggingId) : -1;

  const visualIndexFor = useCallback(
    (index: number) => {
      if (dragStartIndex < 0 || dragTargetIndex < 0) return index;
      if (index === dragStartIndex) return dragTargetIndex;

      if (
        dragTargetIndex > dragStartIndex &&
        index > dragStartIndex &&
        index <= dragTargetIndex
      ) {
        return index - 1;
      }
      if (
        dragTargetIndex < dragStartIndex &&
        index >= dragTargetIndex &&
        index < dragStartIndex
      ) {
        return index + 1;
      }
      return index;
    },
    [dragStartIndex, dragTargetIndex],
  );

  useLayoutEffect(() => {
    const root = rootRef.current;
    const rail = railRef.current;
    if (!root || !rail) return;

    const measure = () => {
      setSurfaceWidth(root.clientWidth);
      // Read from the parent: Tabs.Root writes its own dir attribute.
      const parent = root.parentElement ?? root;
      setRtl(getComputedStyle(parent).direction === "rtl");
      const nextGap = Number.parseFloat(getComputedStyle(rail).columnGap);
      if (Number.isFinite(nextGap)) setTabGap(nextGap);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    // The reading direction can change without a resize (a dir attribute
    // set on an ancestor), so watch for that too.
    const direction = new MutationObserver(measure);
    direction.observe(root.ownerDocument.documentElement, {
      attributes: true,
      attributeFilter: ["dir"],
      subtree: true,
    });
    return () => {
      observer.disconnect();
      direction.disconnect();
    };
  }, []);

  const setActive = useCallback(
    (id: string | null) => {
      if (id && itemMap.get(id)?.disabled) return;
      if (!controlled) setInternalValue(id);
      onValueChange?.(id);
    },
    [controlled, itemMap, onValueChange],
  );

  useEffect(() => {
    if (currentValue && itemMap.has(currentValue)) return;
    if (firstEnabledItem && firstEnabledItem.id !== currentValue) {
      setActive(firstEnabledItem.id);
    }
  }, [currentValue, firstEnabledItem, itemMap, setActive]);

  const activeOrderIndex = activeId ? order.indexOf(activeId) : -1;
  const activeVisualIndex =
    activeOrderIndex < 0 ? -1 : visualIndexFor(activeOrderIndex);

  useLayoutEffect(() => {
    if (
      !activeId ||
      activeVisualIndex < 0 ||
      activeId === draggingId ||
      !slotLefts[activeVisualIndex]
    ) {
      return;
    }

    surfaceAnimationRef.current?.stop();

    if (draggingId) return;

    surfaceAnimationRef.current = animateValue(
      surfaceLeft,
      slotLefts[activeVisualIndex],
      reduce ? { duration: 0 } : SPRING_GLIDE,
    );
  }, [
    activeId,
    activeVisualIndex,
    draggingId,
    reduce,
    slotLefts,
    surfaceLeft,
  ]);

  const commitOrder = useCallback(
    (next: string[], notify: boolean) => {
      orderRef.current = next;
      setOrder((current) => (sameOrder(current, next) ? current : next));
      if (notify) onOrderChange?.(next);
    },
    [onOrderChange],
  );

  const registerPosition = useCallback(
    (id: string, position: MotionValue<number> | null) => {
      tabPositionRefs.current[id] = position;
    },
    [],
  );

  const startDrag = useCallback(
    (id: string, event: ReactPointerEvent<HTMLDivElement>) => {
      if (
        event.button !== 0 ||
        itemMap.get(id)?.disabled ||
        dragRef.current
      ) {
        return;
      }

      const startIndex = orderRef.current.indexOf(id);
      if (startIndex < 0) return;
      const capturedSlots = orderRef.current.map(
        (_, index) => SURFACE_INSET + index * (tabWidth + slotGap),
      );
      const startLeft = capturedSlots[startIndex];

      dragAnimationRef.current?.stop();
      dragAnimationRef.current = null;
      dragLeft.set(startLeft);
      dragRef.current = {
        id,
        pointerId: event.pointerId,
        originX: event.clientX,
        startLeft,
        startIndex,
        targetIndex: startIndex,
        moved: false,
        finishing: false,
        startOrder: orderRef.current.slice(),
        slotLefts: capturedSlots,
      };
    },
    [dragLeft, itemMap, slotGap, tabWidth],
  );

  const moveDrag = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.finishing || drag.pointerId !== event.pointerId) return;

      const delta = (event.clientX - drag.originX) * (rtlRef.current ? -1 : 1);
      if (!drag.moved && Math.abs(delta) < DRAG_THRESHOLD) return;
      event.preventDefault();

      if (!drag.moved) {
        drag.moved = true;
        capturePointer(event.currentTarget, event.pointerId);
        if (drag.id === activeId) {
          surfaceAnimationRef.current?.stop();
          surfaceLeft.set(drag.startLeft);
        }
        setDraggingId(drag.id);
        setDragTargetIndex(drag.startIndex);
      }

      const minLeft = drag.slotLefts[0];
      const maxLeft = drag.slotLefts[drag.slotLefts.length - 1];
      const visualLeft = Math.max(
        minLeft,
        Math.min(maxLeft, drag.startLeft + delta),
      );
      let targetIndex = drag.startIndex;

      if (visualLeft >= drag.startLeft) {
        for (
          let index = drag.startIndex + 1;
          index < drag.slotLefts.length;
          index += 1
        ) {
          if (visualLeft + tabWidth / 2 >= drag.slotLefts[index]) {
            targetIndex = index;
          }
        }
      } else {
        for (let index = drag.startIndex - 1; index >= 0; index -= 1) {
          if (visualLeft <= drag.slotLefts[index] + tabWidth / 2) {
            targetIndex = index;
          }
        }
      }

      dragLeft.set(visualLeft);
      if (targetIndex !== drag.targetIndex) {
        drag.targetIndex = targetIndex;
        setDragTargetIndex(targetIndex);
      }
    },
    [activeId, dragLeft, surfaceLeft, tabWidth],
  );

  const finishDrag = useCallback(
    (pointerId: number) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== pointerId || drag.finishing) return;

      if (!drag.moved) {
        dragRef.current = null;
        return;
      }

      drag.finishing = true;
      const targetLeft = drag.slotLefts[drag.targetIndex];
      const controls = animateValue(
        dragLeft,
        targetLeft,
        reduce ? { duration: 0 } : SPRING_GLIDE,
      );
      dragAnimationRef.current = controls;

      controls.then(async () => {
        if (dragAnimationRef.current !== controls) return;
        const next = moveItem(
          drag.startOrder,
          drag.startIndex,
          drag.targetIndex,
        );

        if (!reduce) {
          await new Promise<void>((resolve) => {
            const startedAt = performance.now();
            const check = () => {
              const settled = next.every((id, index) => {
                if (id === drag.id) return true;
                const position = tabPositionRefs.current[id];
                if (!position) return true;
                return (
                  Math.abs(position.get() - drag.slotLefts[index]) < 0.5 &&
                  Math.abs(position.getVelocity()) < 10
                );
              });

              if (settled || performance.now() - startedAt > 500) {
                resolve();
                return;
              }
              requestAnimationFrame(check);
            };
            check();
          });
        }

        if (dragAnimationRef.current !== controls) return;
        if (drag.id === activeId) {
          surfaceLeft.set(targetLeft);
        } else if (activeId) {
          const activePosition = tabPositionRefs.current[activeId];
          if (activePosition) surfaceLeft.set(activePosition.get());
        }
        tabPositionRefs.current[drag.id]?.jump(targetLeft);
        dragAnimationRef.current = null;
        dragRef.current = null;
        commitOrder(next, !sameOrder(drag.startOrder, next));
        setDraggingId(null);
        setDragTargetIndex(-1);
      });
    },
    [activeId, commitOrder, dragLeft, reduce, surfaceLeft],
  );

  useEffect(() => {
    const finishFromWindow = (event: PointerEvent) => {
      finishDrag(event.pointerId);
    };
    window.addEventListener("pointerup", finishFromWindow, true);
    window.addEventListener("pointercancel", finishFromWindow, true);
    return () => {
      window.removeEventListener("pointerup", finishFromWindow, true);
      window.removeEventListener("pointercancel", finishFromWindow, true);
    };
  }, [finishDrag]);

  const moveBy = useCallback(
    (id: string, direction: -1 | 1) => {
      const current = orderRef.current;
      const index = current.indexOf(id);
      const nextIndex = index + direction;
      if (
        index < 0 ||
        nextIndex < 0 ||
        nextIndex >= current.length ||
        itemMap.get(id)?.disabled
      ) {
        return;
      }
      commitOrder(moveItem(current, index, nextIndex), true);
    },
    [commitOrder, itemMap],
  );

  // Alt+Arrow reorders, in the reading direction. Plain arrows, Home and
  // End are Radix's roving focus (automatic activation).
  const handleTabKeyDown = useCallback(
    (id: string, event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (
        event.altKey &&
        (event.key === "ArrowLeft" || event.key === "ArrowRight")
      ) {
        event.preventDefault();
        const forward = (event.key === "ArrowRight") !== rtlRef.current;
        moveBy(id, forward ? 1 : -1);
      }
    },
    [moveBy],
  );

  if (!orderedItems.length) return null;

  return (
    <Tabs.Root
      ref={rootRef}
      value={activeId ?? ""}
      onValueChange={(id) => setActive(id)}
      activationMode="automatic"
      dir={rtl ? "rtl" : "ltr"}
      data-slot="morphing-tabs"
      className={cn(
        "relative isolate min-w-0 overflow-hidden rounded-[2rem] bg-[#292929] text-white",
        classNames?.root,
        className,
      )}
    >
      <div className="relative h-20">
        <div className="relative z-30 h-full">
        <Tabs.List
          ref={railRef}
          aria-label={ariaLabel}
          className={cn(
            "flex h-full gap-3 md:gap-4",
            classNames?.rail,
          )}
        >
          {orderedItems.map((item, index) => {
            const isActive = item.id === activeId;
            const isDragging = item.id === draggingId;
            const visualIndex = visualIndexFor(index);
            const targetLeft = slotLefts[visualIndex] ?? SURFACE_INSET;

            return (
              <SpringTab
                key={item.id}
                id={item.id}
                targetLeft={targetLeft}
                dragging={isDragging}
                dragLeft={dragLeft}
                surfaceLeft={surfaceLeft}
                reduce={reduce}
                active={isActive}
                anyDragging={Boolean(draggingId)}
                surfaceHost={rootRef.current}
                overlayHost={overlayHost}
                rtl={rtl}
                surfaceWidth={surfaceWidth}
                tabWidth={tabWidth}
                surfaceClassName={classNames?.activeTab}
                zIndex={isDragging ? 30 : isActive ? 20 : 1}
                className={cn(
                  // The drag is ours end to end, so iPadOS must not answer the
                  // press with its callout or a native drag of the label.
                  "group absolute left-0 top-0 flex touch-pan-y items-stretch",
                  TOUCH_GESTURE_CLASS,
                  item.disabled && "cursor-not-allowed",
                  isDragging ? "cursor-grabbing" : "cursor-grab",
                )}
                overlay={
                  onClose ? (
                    <div
                      style={{
                        width: tabWidth,
                        height: TAB_HEIGHT,
                        marginTop: TAB_TOP,
                      }}
                      className="relative"
                    >
                      <button
                        type="button"
                        aria-label={`Close ${item.label}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          onClose(item.id);
                        }}
                        className={cn(
                          "pointer-events-auto absolute end-2 top-1/2 z-20 grid size-6 -translate-y-1/2 place-items-center rounded-full text-[#9aa0a8] transition-colors hover:bg-black/[0.06] hover:text-[#4b5563] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current",
                          !isActive &&
                            "top-[calc(50%-4px)] text-white/45 hover:bg-white/[0.08] hover:text-white/80",
                          classNames?.close,
                        )}
                      >
                        <X aria-hidden className="size-3.5 stroke-[1.5]" />
                      </button>
                    </div>
                  ) : null
                }
                registerPosition={registerPosition}
                onPointerDown={(event) => startDrag(item.id, event)}
                onPointerMove={moveDrag}
                onPointerUp={(event) => finishDrag(event.pointerId)}
                onPointerCancel={(event) => finishDrag(event.pointerId)}
                // A touch is implicitly captured by whatever it landed on —
                // here the label inside the tab — so the moment the drag takes
                // the capture for the tab itself, that child *loses* it, and
                // the notification bubbles straight back up to this handler.
                // Ending the drag on it kills the gesture on the frame it
                // starts. Only the tab losing its own capture means the
                // platform took the pointer away. A mouse has no implicit
                // capture, which is why this only ever bit on a real finger.
                onLostPointerCapture={(event) => {
                  if (event.target !== event.currentTarget) return;
                  finishDrag(event.pointerId);
                }}
              >
                <div
                  style={{
                    width: tabWidth,
                    height: TAB_HEIGHT,
                    marginTop: TAB_TOP,
                  }}
                  className="relative flex items-stretch"
                >
                  {!isActive ? (
                    <span
                      aria-hidden
                      className={cn(
                        "absolute inset-x-0 bottom-2 top-0 rounded-[1.25rem] transition-colors duration-200",
                        isDragging
                          ? "bg-[#3a3a3a]"
                          : "bg-transparent group-hover:bg-white/[0.06]",
                      )}
                    />
                  ) : null}

                  <Tabs.Trigger
                    value={item.id}
                    disabled={item.disabled}
                    ref={(node) => {
                      tabButtonRefs.current[item.id] = node;
                    }}
                    // A press selects on click, not on mousedown (Radix's
                    // default), so dragging a tab does not select it.
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={(event) => {
                      const drag = dragRef.current;
                      if (drag?.id === item.id && drag.moved) return;
                      setActive(item.id);
                      // Focus it as a native click would, without a focus ring
                      // (focusVisible is newer than some DOM typings).
                      const options: FocusOptions & { focusVisible?: boolean } =
                        { preventScroll: true, focusVisible: false };
                      event.currentTarget.focus(options);
                    }}
                    onKeyDown={(event) => handleTabKeyDown(item.id, event)}
                    className={cn(
                      "group relative z-10 flex h-full w-full min-w-0 items-center gap-2 overflow-hidden rounded-t-[1.5rem] px-3 text-start outline-none transition-colors",
                      isActive
                        ? "text-[#181818]"
                        : "pb-2 text-white/70 hover:text-white",
                      classNames?.tab,
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "pointer-events-none absolute inset-x-1 top-1 opacity-0 transition-opacity group-focus-visible:opacity-100",
                        isActive
                          ? "bottom-0 rounded-t-[1.25rem] border-x-2 border-t-2 border-black/20"
                          : "bottom-2 rounded-[1rem] border-2 border-white/60",
                      )}
                    />
                    {item.icon ? (
                      <span
                        aria-hidden
                        className={cn(
                          "grid size-8 shrink-0 place-items-center",
                          classNames?.icon,
                        )}
                      >
                        {item.icon}
                      </span>
                    ) : null}
                    <span
                      className={cn(
                        "min-w-0 truncate whitespace-nowrap text-base font-medium leading-none tracking-[-0.025em]",
                        classNames?.label,
                      )}
                    >
                      {item.label}
                    </span>
                  </Tabs.Trigger>

                </div>
              </SpringTab>
            );
          })}
        </Tabs.List>
        <div ref={setOverlayHost} className="contents" />
        </div>
      </div>

      <Tabs.Content
        value={activeId ?? ""}
        forceMount
        className={cn(
          "relative z-20 mx-4 min-h-64 overflow-hidden rounded-[1.75rem] bg-[#fafaf8] text-[#181818]",
          classNames?.content,
        )}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {activeItem ? (
            <motion.div
              key={activeItem.id}
              initial={
                reduce
                  ? { opacity: 0 }
                  : { opacity: 0, y: 8, filter: "blur(6px)" }
              }
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={
                reduce
                  ? {
                      opacity: 0,
                      transition: { duration: 0.08, ease: EASE_OUT },
                    }
                  : {
                      opacity: 0,
                      y: -5,
                      filter: "blur(5px)",
                      transition: { duration: 0.12, ease: EASE_OUT },
                    }
              }
              transition={
                reduce
                  ? { duration: 0.12, ease: EASE_OUT }
                  : SPRING_PRESS
              }
              className="min-h-64"
            >
              {activeItem.content}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </Tabs.Content>
    </Tabs.Root>
  );
}

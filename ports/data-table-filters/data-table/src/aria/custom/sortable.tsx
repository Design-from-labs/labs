"use client";

import type {
  DndContextProps,
  DraggableSyntheticListeners,
  DropAnimation,
  UniqueIdentifier,
} from "@dnd-kit/core";
import {
  closestCenter,
  defaultDropAnimationSideEffects,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  restrictToHorizontalAxis,
  restrictToParentElement,
  restrictToVerticalAxis,
} from "@dnd-kit/modifiers";
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  type SortableContextProps,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { buttonVariants } from "@/components/ui/button";
import { composeRefs } from "../lib/compose-refs";
import { cn } from "@/lib/utils";
import * as React from "react";
import { createPortal } from "react-dom";

const orientationConfig = {
  vertical: {
    modifiers: [restrictToVerticalAxis, restrictToParentElement],
    strategy: verticalListSortingStrategy,
  },
  horizontal: {
    modifiers: [restrictToHorizontalAxis, restrictToParentElement],
    strategy: horizontalListSortingStrategy,
  },
  mixed: {
    modifiers: [restrictToParentElement],
    strategy: undefined,
  },
};

interface SortableProps<
  TData extends { id: UniqueIdentifier },
> extends DndContextProps {
  /**
   * An array of data items that the sortable component will render.
   * @example
   * value={[
   *   { id: 1, name: 'Item 1' },
   *   { id: 2, name: 'Item 2' },
   * ]}
   */
  value: TData[];

  /**
   * An optional callback function that is called when the order of the data items changes.
   * It receives the new array of items as its argument.
   * @example
   * onValueChange={(items) => console.log(items)}
   */
  onValueChange?: (items: TData[]) => void;

  /**
   * An optional callback function that is called when an item is moved.
   * It receives an event object with `activeIndex` and `overIndex` properties, representing the original and new positions of the moved item.
   * This will override the default behavior of updating the order of the data items.
   * @type (event: { activeIndex: number; overIndex: number }) => void
   * @example
   * onMove={(event) => console.log(`Item moved from index ${event.activeIndex} to index ${event.overIndex}`)}
   */
  onMove?: (event: { activeIndex: number; overIndex: number }) => void;

  /**
   * A collision detection strategy that will be used to determine the closest sortable item.
   * @default closestCenter
   * @type DndContextProps["collisionDetection"]
   */
  collisionDetection?: DndContextProps["collisionDetection"];

  /**
   * An array of modifiers that will be used to modify the behavior of the sortable component.
   * @default
   * [restrictToVerticalAxis, restrictToParentElement]
   * @type Modifier[]
   */
  modifiers?: DndContextProps["modifiers"];

  /**
   * A sorting strategy that will be used to determine the new order of the data items.
   * @default verticalListSortingStrategy
   * @type SortableContextProps["strategy"]
   */
  strategy?: SortableContextProps["strategy"];

  /**
   * Specifies the axis for the drag-and-drop operation. It can be "vertical", "horizontal", or "both".
   * @default "vertical"
   * @type "vertical" | "horizontal" | "mixed"
   */
  orientation?: "vertical" | "horizontal" | "mixed";

  /**
   * An optional React node that is rendered on top of the sortable component.
   * It can be used to display additional information or controls.
   * @default null
   * @type React.ReactNode | null
   * @example
   * overlay={<Skeleton className="w-full h-8" />}
   */
  overlay?: React.ReactNode | null;
}

function Sortable<TData extends { id: UniqueIdentifier }>({
  value,
  onValueChange,
  onDragStart,
  onDragEnd,
  onDragCancel,
  collisionDetection = closestCenter,
  modifiers,
  strategy,
  onMove,
  orientation = "vertical",
  overlay,
  children,
  ...props
}: SortableProps<TData>) {
  const [activeId, setActiveId] = React.useState<UniqueIdentifier | null>(null);
  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor),
  );

  const config = orientationConfig[orientation];

  return (
    <DndContext
      modifiers={modifiers ?? config.modifiers}
      sensors={sensors}
      onDragStart={(event) => {
        setActiveId(event.active.id);
        onDragStart?.(event);
      }}
      onDragEnd={(event) => {
        const { active, over } = event;
        if (over && active.id !== over?.id) {
          const activeIndex = value.findIndex((item) => item.id === active.id);
          const overIndex = value.findIndex((item) => item.id === over.id);

          if (onMove) {
            onMove({ activeIndex, overIndex });
          } else {
            onValueChange?.(arrayMove(value, activeIndex, overIndex));
          }
        }
        setActiveId(null);
        onDragEnd?.(event);
      }}
      onDragCancel={(event) => {
        setActiveId?.(null);
        onDragCancel?.(event);
      }}
      collisionDetection={collisionDetection}
      {...props}
    >
      <SortableContext items={value} strategy={strategy ?? config.strategy}>
        {children}
      </SortableContext>
      {overlay
        ? // https://docs.dndkit.com/api-documentation/draggable/drag-overlay#portals
          createPortal(
            <SortableOverlay activeId={activeId}>{overlay}</SortableOverlay>,
            document.body,
          )
        : null}
    </DndContext>
  );
}

const dropAnimationOpts: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: "0.4",
      },
    },
  }),
};

interface SortableOverlayProps extends React.ComponentPropsWithRef<
  typeof DragOverlay
> {
  activeId?: UniqueIdentifier | null;
}

function SortableOverlay({
  activeId,
  dropAnimation = dropAnimationOpts,
  children,
  ...props
}: SortableOverlayProps) {
  return (
    <DragOverlay dropAnimation={dropAnimation} {...props}>
      {activeId ? (
        // REMINDER: `asChild` is spread, not written as an attribute. When the
        // shadcn CLI installs into a Base UI project it rewrites a literal
        // `asChild` into `render={<child />}` — and where the child is an
        // expression rather than an element, as here, it drops the prop
        // instead, which would silently turn the overlay into a wrapper div.
        <SortableItem
          value={activeId}
          className="cursor-grabbing"
          {...{ asChild: true }}
        >
          {children}
        </SortableItem>
      ) : null}
    </DragOverlay>
  );
}

type SlotProps = React.HTMLAttributes<HTMLElement> & {
  children?: React.ReactNode;
};

/**
 * The props a slot merges into its child, the way Radix's `Slot` (and React
 * Aria's `mergeProps`) do: the child's own props win, event handlers run both
 * (the child's first), class names are joined and styles are merged. Local, so
 * the block needs nothing from React Aria beyond `react-aria-components`,
 * which does not re-export `mergeProps`.
 */
function mergeSlotProps(
  slotProps: Record<string, unknown>,
  childProps: Record<string, unknown>,
) {
  const merged: Record<string, unknown> = { ...slotProps, ...childProps };
  for (const key of Object.keys(slotProps)) {
    const slotValue = slotProps[key];
    const childValue = childProps[key];
    if (
      /^on[A-Z]/.test(key) &&
      typeof slotValue === "function" &&
      typeof childValue === "function"
    ) {
      merged[key] = (...args: unknown[]) => {
        childValue(...args);
        slotValue(...args);
      };
    } else if (
      key === "className" &&
      typeof slotValue === "string" &&
      typeof childValue === "string"
    ) {
      merged[key] = cn(slotValue, childValue);
    } else if (
      key === "style" &&
      typeof slotValue === "object" &&
      typeof childValue === "object"
    ) {
      merged[key] = { ...slotValue, ...childValue };
    }
  }
  return merged;
}

/** Renders its only child with the slot's props and ref merged in. */
function Slot({
  children,
  ref,
  ...props
}: SlotProps & { ref?: React.Ref<HTMLElement> }) {
  if (!React.isValidElement<Record<string, unknown>>(children)) return null;
  return React.cloneElement(children, {
    ...mergeSlotProps(props, children.props),
    ref: composeRefs(ref, children.props.ref as React.Ref<HTMLElement>),
  });
}

interface SortableItemContextProps {
  attributes: React.HTMLAttributes<HTMLElement>;
  listeners: DraggableSyntheticListeners | undefined;
  isDragging?: boolean;
}

const SortableItemContext = React.createContext<SortableItemContextProps>({
  attributes: {},
  listeners: undefined,
  isDragging: false,
});

function useSortableItem() {
  const context = React.useContext(SortableItemContext);

  if (!context) {
    throw new Error("useSortableItem must be used within a SortableItem");
  }

  return context;
}

interface SortableItemProps extends SlotProps {
  /**
   * The unique identifier of the item.
   * @example "item-1"
   * @type UniqueIdentifier
   */
  value: UniqueIdentifier;

  /**
   * Specifies whether the item should act as a trigger for the drag-and-drop action.
   * @default false
   * @type boolean | undefined
   */
  asTrigger?: boolean;

  /**
   * Merges the item's props into its immediate child.
   *
   * Not around an item of a React Aria collection (a menu, list box or grid
   * list item): React Aria renders those apart from their wrappers, so the
   * merged ref never reaches the element. Put the sortable item inside the
   * collection item instead, as the view options do.
   * @default false
   * @type boolean | undefined
   */
  asChild?: boolean;

  /**
   * The element to render as, with the item's props merged into it — Base UI's
   * spelling of `asChild`. The shadcn CLI rewrites `asChild` into `render` when
   * it installs into a Base UI project, so this component has to understand
   * both.
   * @type React.ReactElement | undefined
   */
  render?: React.ReactElement;
}

function SortableItem({
  value,
  asTrigger,
  asChild,
  render,
  className,
  children,
  ref,
  ...props
}: SortableItemProps & { ref?: React.Ref<HTMLDivElement> }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: value });

  const context = React.useMemo<SortableItemContextProps>(
    () => ({
      attributes,
      listeners,
      isDragging,
    }),
    [attributes, listeners, isDragging],
  );
  const style: React.CSSProperties = {
    opacity: isDragging ? 0.5 : 1,
    transform: CSS.Translate.toString(transform),
    transition,
  };

  const Comp = asChild || render ? Slot : "div";

  // Base UI nests the children inside the `render` element; Radix's `asChild`
  // expects them to already be there.
  const content = render
    ? children === undefined
      ? render
      : React.cloneElement(render, undefined, children)
    : children;

  return (
    <SortableItemContext.Provider value={context}>
      <Comp
        data-state={isDragging ? "dragging" : undefined}
        className={cn(
          "data-[state=dragging]:cursor-grabbing",
          { "cursor-grab": !isDragging && asTrigger },
          className,
        )}
        ref={composeRefs(ref, setNodeRef as React.Ref<HTMLDivElement>)}
        style={style}
        {...(asTrigger ? attributes : {})}
        {...(asTrigger ? listeners : {})}
        {...props}
      >
        {content}
      </Comp>
    </SortableItemContext.Provider>
  );
}

/**
 * A native button drawn with the project's `buttonVariants`, not the project's
 * `Button`: on `aria-nova` that is a React Aria `Button`, whose press handling
 * would take the pointer events dnd-kit needs. The handle usually sits inside a
 * React Aria collection item (the view options menu), whose own press handler
 * cancels the default of `pointerdown`, which stops the browser from firing the
 * `mousedown` dnd-kit's mouse sensor listens for. Stopping `pointerdown` (and
 * `pointerup`, on which a menu item also acts) here keeps the drag working;
 * dnd-kit itself listens to `mousedown`, `touchstart` and `keydown`, so
 * nothing else is lost.
 */
type ButtonVariantProps = NonNullable<Parameters<typeof buttonVariants>[0]>;

const DRAG_KEYS = new Set([
  " ",
  "Enter",
  "Escape",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
]);

interface SortableDragHandleProps
  extends
    React.ComponentProps<"button">,
    Pick<ButtonVariantProps, "variant" | "size"> {
  withHandle?: boolean;
}

function SortableDragHandle({
  className,
  variant,
  size,
  withHandle: _withHandle,
  onPointerDown,
  onPointerUp,
  onKeyDown,
  ref,
  ...props
}: SortableDragHandleProps) {
  const { attributes, listeners, isDragging } = useSortableItem();

  return (
    <button
      type="button"
      ref={composeRefs(ref)}
      data-slot="button"
      data-state={isDragging ? "dragging" : undefined}
      className={cn(
        buttonVariants({ variant, size }),
        "cursor-grab data-[state=dragging]:cursor-grabbing",
        className,
      )}
      {...attributes}
      {...listeners}
      onPointerDown={(event) => {
        event.stopPropagation();
        onPointerDown?.(event);
      }}
      // A React Aria menu item also acts on a pointer released over it.
      onPointerUp={(event) => {
        event.stopPropagation();
        onPointerUp?.(event);
      }}
      onKeyDown={(event) => {
        listeners?.onKeyDown?.(event);
        onKeyDown?.(event);
        // The keys of a keyboard drag stay with the handle: a React Aria
        // collection around it would otherwise act on them too (a menu in an
        // autocomplete moves focus and sends Space back to its field). Space
        // and Enter pick the item up; while it is dragged, dnd-kit's keyboard
        // sensor listens on the document, which a stopped event no longer
        // reaches, so the drag keys are handed to it there.
        if (isDragging && DRAG_KEYS.has(event.key)) {
          event.stopPropagation();
          event.preventDefault();
          event.currentTarget.ownerDocument.dispatchEvent(
            new KeyboardEvent("keydown", {
              key: event.key,
              code: event.code,
              cancelable: true,
            }),
          );
        } else if (event.key === " " || event.key === "Enter") {
          event.stopPropagation();
        }
      }}
      {...props}
    />
  );
}

export { Sortable, SortableDragHandle, SortableItem, SortableOverlay };

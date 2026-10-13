"use client";

import { Menu } from "@base-ui/react/menu";
import {
  type ComponentPropsWithRef,
  createContext,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

/*
 * The menu wiring of the liquid surfaces on Base UI's Menu. The default
 * variant writes the WAI-ARIA menu button pattern out (taffy-menu.tsx in the
 * default style); this file keeps the same exports, so the surfaces
 * themselves are shared.
 *
 * Base UI owns the roles and ids, the roving focus, the typeahead, Home and
 * End, and the Escape and outside dismissal. The liquid surfaces own the
 * rest, because the panel has to live in the SAME layer as its trigger (the
 * goo filter draws both as one mass), so:
 *
 * - the popup is portalled into the surface's own root (`container`) rather
 *   than the body, and stays mounted (`keepMounted`): the surface runs its
 *   own open and close choreography and keeps the panel visible until it has
 *   finished;
 * - Base UI's positioner box is made a plain layer over the anchor (see the
 *   stylesheet rule below), so the panel keeps the surface's own geometry
 *   instead of floating-ui's;
 * - the trigger opens on click, not on mouse down, so a press-and-drag on
 *   the button can pull the liquid finger without toggling the menu.
 */

/* Base UI places the popup beside the trigger with inline styles. The surface
   places its own panel, so the positioner becomes a plain layer over the
   anchor. */
const POSITIONER_STYLES = `
.taffy-menu-positioner {
  position: absolute !important;
  inset: 0 !important;
  width: 100% !important;
  height: 100% !important;
  min-width: 0 !important;
  transform: none !important;
  translate: none !important;
  /* The popup is appended after the trigger; one level under the surface's
     own z-index 2 keeps the trigger above it, as in the default order. */
  z-index: 1 !important;
  pointer-events: none;
}
.taffy-menu-positioner > :where([data-taffy-menu]) {
  pointer-events: auto;
}
`;

type Reason = "escape" | "outside" | "item" | "tab" | "trigger";

interface MenuContext {
  open: boolean;
  request: (open: boolean, reason?: Reason | "keyboard" | "keyboard-last") => void;
  listRef: RefObject<HTMLDivElement | null>;
  triggerRef: RefObject<HTMLElement | null>;
  containerRef: RefObject<HTMLElement | null>;
  /** The root element once mounted: where the popup is portalled to. */
  container: HTMLElement | null;
}

const Context = createContext<MenuContext | null>(null);

function useMenu() {
  const context = useContext(Context);
  if (!context) {
    throw new Error("Taffy menu parts must be inside TaffyMenuRoot.");
  }
  return context;
}

function itemsOf(list: HTMLElement | null) {
  return list
    ? [...list.querySelectorAll<HTMLElement>('[role^="menuitem"]')].filter(
        (item) => item.getAttribute("aria-disabled") !== "true" && !item.hasAttribute("data-disabled"),
      )
    : [];
}

function setRef<T>(ref: ComponentPropsWithRef<"div">["ref"] | undefined, value: T) {
  if (typeof ref === "function") {
    ref(value as never);
  } else if (ref) {
    (ref as { current: T }).current = value;
  }
}

export interface TaffyMenuRootProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The element that counts as inside (the component's root). */
  containerRef: RefObject<HTMLElement | null>;
  children: ReactNode;
}

export function TaffyMenuRoot({
  open,
  onOpenChange,
  containerRef,
  children,
}: TaffyMenuRootProps) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  /* Where focus goes once the menu has opened or closed. */
  const pending = useRef<"list" | "first" | "last" | "trigger" | null>(null);
  const changeRef = useRef(onOpenChange);
  changeRef.current = onOpenChange;
  /* The portal target is the surface's own root, known after the first
     commit. */
  const [container, setContainer] = useState<HTMLElement | null>(null);
  useEffect(() => setContainer(containerRef.current), [containerRef]);

  const context = useMemo<MenuContext>(
    () => ({
      open,
      listRef,
      triggerRef,
      containerRef,
      container,
      request(next, reason) {
        if (next) {
          pending.current =
            reason === "keyboard" ? "first" : reason === "keyboard-last" ? "last" : "list";
        } else {
          pending.current =
            reason === "escape" || reason === "item" || reason === "trigger" ? "trigger" : null;
        }
        changeRef.current(next);
      },
    }),
    [container, containerRef, open],
  );

  /* The hand-over of focus on open and close is done here: the popup is
     always mounted, so Base UI's own initial and final focus never run. The
     panel turns visible on the opening run's first frame, and a hidden
     element takes no focus: try again for a few frames. */
  useEffect(() => {
    const target = pending.current;
    if (!target) {
      return;
    }
    if (open && target !== "trigger") {
      pending.current = null;
      let frame = 0;
      let tries = 0;
      const attempt = () => {
        const items = itemsOf(listRef.current);
        const node =
          target === "first" ? items[0] : target === "last" ? items[items.length - 1] : listRef.current;
        node?.focus({ preventScroll: true });
        if ((!node || document.activeElement !== node) && tries < 30) {
          tries += 1;
          frame = requestAnimationFrame(attempt);
        }
      };
      attempt();
      return () => cancelAnimationFrame(frame);
    }
    if (!open && target === "trigger") {
      pending.current = null;
      triggerRef.current?.focus({ preventScroll: true });
    }
  }, [open]);

  return (
    <Context.Provider value={context}>
      <style href="designfrom-taffy-menu-base" precedence="default">
        {POSITIONER_STYLES}
      </style>
      <Menu.Root
        open={open}
        modal={false}
        onOpenChange={(next, details) => {
          if (next) {
            /* The trigger's click opens it, not Base UI's mouse down. */
            return;
          }
          const target = details.event?.target;
          if (
            target instanceof Node &&
            containerRef.current?.contains(target) &&
            (details.reason === "outside-press" || details.reason === "trigger-press")
          ) {
            /* A press on the trigger or the panel is not outside. */
            details.cancel();
            return;
          }
          context.request(
            false,
            details.reason === "escape-key"
              ? "escape"
              : details.reason === "item-press"
                ? "item"
                : details.reason === "outside-press"
                  ? "outside"
                  : undefined,
          );
        }}
      >
        {children}
      </Menu.Root>
    </Context.Provider>
  );
}

export type TaffyMenuTriggerProps = ComponentPropsWithRef<"button"> & {
  /** Opens only (the morphing dropdown's trigger is covered while open). */
  openOnly?: boolean;
};

export function TaffyMenuTrigger({
  ref,
  openOnly,
  onKeyDown,
  onClick,
  onMouseDown,
  onPointerDown,
  ...props
}: TaffyMenuTriggerProps) {
  const menu = useMenu();
  return (
    <Menu.Trigger
      {...props}
      ref={(node) => {
        menu.triggerRef.current = node;
        setRef(ref, node);
      }}
      render={<button type="button" />}
      onPointerDown={(event) => {
        onPointerDown?.(event);
      }}
      onMouseDown={(event) => {
        onMouseDown?.(event);
        /* Base UI opens on mouse down; a press here may be the start of a
           drag, so the click decides. */
        event.preventBaseUIHandler();
      }}
      onClick={(event) => {
        onClick?.(event);
        event.preventBaseUIHandler();
        if (!event.defaultPrevented) {
          if (menu.open && !openOnly) {
            menu.request(false, event.detail === 0 ? "trigger" : undefined);
          } else if (!menu.open) {
            menu.request(true, event.detail === 0 ? "keyboard" : undefined);
          }
        }
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (event.defaultPrevented) {
          return;
        }
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          event.preventBaseUIHandler();
          menu.request(true, event.key === "ArrowUp" ? "keyboard-last" : "keyboard");
        } else if (event.key === "Enter" || event.key === " ") {
          /* Base UI would toggle on the key; the click that follows does it. */
          event.preventBaseUIHandler();
        }
      }}
    />
  );
}

export type TaffyMenuListProps = ComponentPropsWithRef<"div"> & {
  label: string;
  /** "arc": items sit on an arc around the trigger; every arrow moves. */
  layout?: "list" | "arc";
};

export function TaffyMenuList({
  ref,
  label,
  layout = "list",
  onKeyDown,
  children,
  ...props
}: TaffyMenuListProps) {
  const menu = useMenu();

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || layout !== "arc") {
      return;
    }
    /* An arc has no vertical order: the horizontal arrows move too. */
    const items = itemsOf(menu.listRef.current);
    const current = items.indexOf(document.activeElement as HTMLElement);
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    const forward = rtl ? "ArrowLeft" : "ArrowRight";
    const back = rtl ? "ArrowRight" : "ArrowLeft";
    if (event.key === forward || event.key === back) {
      event.preventDefault();
      const step = event.key === forward ? 1 : -1;
      const to = current < 0 ? (step > 0 ? 0 : items.length - 1) : current + step;
      items[(to + items.length) % items.length]?.focus({ preventScroll: true });
    }
  };

  if (!menu.container) {
    return null;
  }
  return (
    <Menu.Portal container={menu.container} keepMounted>
      <Menu.Positioner className="taffy-menu-positioner" side="top" sideOffset={0}>
        <Menu.Popup
          {...props}
          ref={(node: HTMLDivElement | null) => {
            menu.listRef.current = node;
            setRef(ref, node);
          }}
          data-taffy-menu=""
          /* The surface hands focus over itself (see TaffyMenuRoot). */
          {...({ initialFocus: false, finalFocus: false } as object)}
          aria-label={label}
          aria-labelledby={undefined}
          tabIndex={-1}
          /* The panel is closed to the page the moment `open` is false. */
          {...(menu.open ? {} : { inert: true })}
          onKeyDown={handleKeyDown}
        >
          {children}
        </Menu.Popup>
      </Menu.Positioner>
    </Menu.Portal>
  );
}

export type TaffyMenuCheckboxItemProps = ComponentPropsWithRef<"button"> & {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  textValue: string;
};

/* A click handler that prevents the default cancels the toggle (the
   surfaces do, for the click that ends a press-and-drag). */
export function TaffyMenuCheckboxItem({
  checked,
  onCheckedChange,
  textValue,
  onClick,
  ...props
}: TaffyMenuCheckboxItemProps) {
  return (
    <Menu.CheckboxItem
      {...props}
      render={<button type="button" />}
      nativeButton
      checked={checked}
      label={textValue}
      /* A tick keeps the menu open. */
      closeOnClick={false}
      onCheckedChange={onCheckedChange}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) {
          event.preventBaseUIHandler();
        }
      }}
    />
  );
}

export type TaffyMenuItemProps = ComponentPropsWithRef<"button"> & {
  onAction: () => void;
  textValue: string;
};

/* Activating an item runs `onAction` and closes the menu; a click handler
   that prevents the default cancels both. */
export function TaffyMenuItem({
  onAction,
  textValue,
  onClick,
  onKeyDown,
  ...props
}: TaffyMenuItemProps) {
  const menu = useMenu();
  const keyboard = useRef(false);
  return (
    <Menu.Item
      {...props}
      render={<button type="button" />}
      nativeButton
      label={textValue}
      closeOnClick={false}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        keyboard.current = event.key === "Enter" || event.key === " ";
      }}
      onClick={(event) => {
        onClick?.(event);
        const byKeyboard = keyboard.current || event.detail === 0;
        keyboard.current = false;
        if (event.defaultPrevented) {
          event.preventBaseUIHandler();
          return;
        }
        onAction();
        menu.request(false, byKeyboard ? "item" : undefined);
      }}
    />
  );
}

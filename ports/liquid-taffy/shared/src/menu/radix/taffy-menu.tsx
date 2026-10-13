"use client";

import { DropdownMenu } from "radix-ui";
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
} from "react";

/*
 * The menu wiring of the liquid surfaces on Radix's DropdownMenu. The default
 * variant writes the WAI-ARIA menu button pattern out (taffy-menu.tsx in the
 * default style); this file keeps the same exports, so the surfaces
 * themselves are shared.
 *
 * Radix owns the roles, the ids and the roving focus, the typeahead, Home and
 * End, and the Escape and outside dismissal. The liquid surfaces own the
 * rest, because the panel has to live in the SAME layer as its trigger (the
 * goo filter draws both as one mass), so:
 *
 * - the content is never portalled and is always mounted (`forceMount`): the
 *   surface runs its own open and close choreography and keeps the panel
 *   visible until it has finished;
 * - Radix's positioner wrapper is made a plain box over the anchor (see the
 *   stylesheet rule at the end), so the panel keeps the surface's own
 *   geometry instead of floating-ui's;
 * - the trigger opens on click, not on pointer down, so a press-and-drag on
 *   the button can pull the liquid finger without toggling the menu.
 */

/* Radix wraps its content in a positioner box that floats it beside the
   trigger. The surface places its own panel, so the box becomes a plain layer
   over the anchor and the panel keeps the surface's own geometry. */
const WRAPPER_STYLES = `
[data-radix-popper-content-wrapper]:has(> [data-taffy-menu]) {
  position: absolute !important;
  inset: 0 !important;
  width: 100% !important;
  height: 100% !important;
  min-width: 0 !important;
  transform: none !important;
  pointer-events: none;
}
:where([data-taffy-menu]) {
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

  const context = useMemo<MenuContext>(
    () => ({
      open,
      listRef,
      triggerRef,
      containerRef,
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
    [containerRef, open],
  );

  /* A content that is always mounted never runs Radix's own open and close
     focus handling, so the hand-over is done here. The panel turns visible on
     the opening run's first frame, and a hidden element takes no focus: try
     again for a few frames. */
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
      <style href="designfrom-taffy-menu-radix" precedence="default">
        {WRAPPER_STYLES}
      </style>
      <DropdownMenu.Root
        open={open}
        modal={false}
        onOpenChange={(next) => {
          /* Radix asks to open from its own trigger handling and to close on
             Escape, an outside press or a focus move; the trigger's click is
             the surface's. */
          if (!next) {
            context.request(false, undefined);
          }
        }}
      >
        {children}
      </DropdownMenu.Root>
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
  onPointerDown,
  ...props
}: TaffyMenuTriggerProps) {
  const menu = useMenu();
  return (
    <DropdownMenu.Trigger asChild>
      <button
        {...props}
        ref={(node) => {
          menu.triggerRef.current = node;
          setRef(ref, node);
        }}
        type="button"
        onPointerDown={(event) => {
          onPointerDown?.(event);
          /* Radix toggles on pointer down; a press here may be the start of a
             drag, so the click decides. */
          event.preventDefault();
        }}
        onClick={(event) => {
          onClick?.(event);
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
            menu.request(true, event.key === "ArrowUp" ? "keyboard-last" : "keyboard");
          } else if (event.key === "Enter" || event.key === " ") {
            /* Radix would toggle on the key; the click that follows does it. */
            event.preventDefault();
            event.currentTarget.click();
          }
        }}
      />
    </DropdownMenu.Trigger>
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
    if (event.defaultPrevented) {
      return;
    }
    if (event.key === "Tab") {
      /* Radix keeps Tab inside an open menu. Here it closes the menu and
         hands focus back to the trigger, so the next Tab moves on. */
      event.preventDefault();
      menu.request(false, "trigger");
      return;
    }
    if (layout !== "arc") {
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

  return (
    <DropdownMenu.Content
      {...props}
      ref={(node) => {
        menu.listRef.current = node;
        setRef(ref, node);
      }}
      data-taffy-menu=""
      forceMount
      loop
      aria-label={label}
      aria-labelledby={undefined}
      tabIndex={-1}
      /* The panel is closed to the page the moment `open` is false. */
      {...(menu.open ? {} : { inert: true })}
      onKeyDown={handleKeyDown}
      /* Presses on the trigger and inside the component are not outside. */
      onInteractOutside={(event) => {
        if (menu.containerRef.current?.contains(event.target as Node)) {
          event.preventDefault();
        }
      }}
      onEscapeKeyDown={(event) => {
        event.preventDefault();
        menu.request(false, "escape");
      }}
      onCloseAutoFocus={(event) => event.preventDefault()}
    >
      {children}
    </DropdownMenu.Content>
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
  const cancelled = useRef(false);
  return (
    <DropdownMenu.CheckboxItem
      asChild
      checked={checked}
      textValue={textValue}
      /* A tick keeps the menu open. */
      onSelect={(event) => event.preventDefault()}
      onCheckedChange={(next) => {
        if (!cancelled.current) {
          onCheckedChange(next);
        }
      }}
    >
      <button
        {...props}
        type="button"
        onClick={(event) => {
          /* Radix selects right after this handler, whatever it did. */
          onClick?.(event);
          cancelled.current = event.defaultPrevented;
        }}
      />
    </DropdownMenu.CheckboxItem>
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
  const cancelled = useRef(false);
  return (
    <DropdownMenu.Item
      asChild
      textValue={textValue}
      onSelect={(event) => {
        event.preventDefault();
        const byKeyboard = keyboard.current;
        keyboard.current = false;
        if (cancelled.current) {
          return;
        }
        onAction();
        menu.request(false, byKeyboard ? "item" : undefined);
      }}
    >
      <button
        {...props}
        type="button"
        onKeyDown={(event) => {
          onKeyDown?.(event);
          keyboard.current = event.key === "Enter" || event.key === " ";
        }}
        onClick={(event) => {
          onClick?.(event);
          cancelled.current = event.defaultPrevented;
        }}
      />
    </DropdownMenu.Item>
  );
}

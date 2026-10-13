"use client";

import {
  type ComponentPropsWithRef,
  createContext,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
} from "react";

/*
 * The menu wiring of the liquid surfaces, without a headless primitive: the
 * WAI-ARIA menu button pattern written out (the default variant). The
 * Radix, Base UI and React Aria variants replace this file with the same
 * exports, so the surfaces themselves are shared.
 *
 * - The trigger opens with Enter, Space, ArrowDown (first item) or ArrowUp
 *   (last item); a pointer open focuses the menu itself, a keyboard open
 *   its first (or last) item.
 * - In the menu: arrow keys move (and wrap), Home and End jump, a letter
 *   jumps to the next item starting with it, Enter and Space activate,
 *   Escape closes and returns focus to the trigger, Tab closes and moves on.
 * - A pointer press outside closes it.
 */

type Close = "escape" | "outside" | "item" | "tab" | "trigger";

interface MenuContext {
  open: boolean;
  request: (open: boolean, reason?: Close | "keyboard" | "keyboard-last") => void;
  listId: string;
  listRef: RefObject<HTMLDivElement | null>;
  triggerRef: RefObject<HTMLElement | null>;
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
        (item) => item.getAttribute("aria-disabled") !== "true",
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
  const listId = useId();
  const listRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  /* Where focus goes once the menu has opened or closed. */
  const pending = useRef<"list" | "first" | "last" | "trigger" | null>(null);
  const changeRef = useRef(onOpenChange);
  changeRef.current = onOpenChange;

  const context = useMemo<MenuContext>(
    () => ({
      open,
      listId,
      listRef,
      triggerRef,
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
    [listId, open],
  );

  useEffect(() => {
    const target = pending.current;
    if (!target) {
      return;
    }
    if (open && target !== "trigger") {
      pending.current = null;
      /* The panel turns visible on the opening run's first frame, and a
         hidden element takes no focus: try again for a few frames. */
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

  /* Outside presses and Escape anywhere close it (upstream's own wiring). */
  useEffect(() => {
    if (!open) {
      return;
    }
    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        context.request(false, "outside");
      }
    };
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) {
        context.request(false, "escape");
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [containerRef, context, open]);

  return <Context.Provider value={context}>{children}</Context.Provider>;
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
  ...props
}: TaffyMenuTriggerProps) {
  const menu = useMenu();
  return (
    <button
      {...props}
      ref={(node) => {
        menu.triggerRef.current = node;
        setRef(ref, node);
      }}
      type="button"
      aria-haspopup="menu"
      aria-expanded={menu.open}
      aria-controls={menu.listId}
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
  const typed = useRef({ text: "", at: 0 });

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) {
      return;
    }
    const items = itemsOf(menu.listRef.current);
    if (items.length === 0) {
      return;
    }
    const current = items.indexOf(document.activeElement as HTMLElement);
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    const move = (to: number) => {
      event.preventDefault();
      items[(to + items.length) % items.length]?.focus({ preventScroll: true });
    };
    const next = () => move(current < 0 ? 0 : current + 1);
    const previous = () => move(current < 0 ? items.length - 1 : current - 1);
    switch (event.key) {
      case "ArrowDown":
        return next();
      case "ArrowUp":
        return previous();
      case "ArrowRight":
        if (layout === "arc") {
          return rtl ? previous() : next();
        }
        return;
      case "ArrowLeft":
        if (layout === "arc") {
          return rtl ? next() : previous();
        }
        return;
      case "Home":
        return move(0);
      case "End":
        return move(items.length - 1);
      case "Escape":
        event.preventDefault();
        menu.request(false, "escape");
        return;
      case "Tab":
        menu.request(false, "tab");
        return;
    }
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      /* Typeahead: the next item whose label starts with what was typed. */
      const now = event.timeStamp;
      const running = now - typed.current.at < 500;
      if (event.key === " " && !running) {
        /* A space that starts nothing is the row's own key (it ticks or
           chooses); only inside a search does it belong to the word. */
        return;
      }
      const text = (running ? typed.current.text : "") + event.key;
      typed.current = { text: text.toLowerCase(), at: now };
      const start = current < 0 ? 0 : current + (text.length === 1 ? 1 : 0);
      for (let step = 0; step < items.length; step += 1) {
        const index = (start + step) % items.length;
        const name = (items[index].textContent || items[index].getAttribute("aria-label") || "")
          .trim()
          .toLowerCase();
        if (name.startsWith(typed.current.text)) {
          return move(index);
        }
      }
    }
  };

  return (
    // biome-ignore lint/a11y/useSemanticElements: a menu has no native element
    <div
      {...props}
      ref={(node) => {
        menu.listRef.current = node;
        setRef(ref, node);
      }}
      id={menu.listId}
      role="menu"
      aria-label={label}
      tabIndex={-1}
      inert={!menu.open}
      onKeyDown={handleKeyDown}
    >
      {children}
    </div>
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
  textValue: _textValue,
  onClick,
  ...props
}: TaffyMenuCheckboxItemProps) {
  return (
    <button
      {...props}
      type="button"
      role="menuitemcheckbox"
      aria-checked={checked}
      tabIndex={-1}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) {
          onCheckedChange(!checked);
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
  textValue: _textValue,
  onKeyDown,
  onClick,
  ...props
}: TaffyMenuItemProps) {
  const menu = useMenu();
  const keyboard = useRef(false);
  return (
    <button
      {...props}
      type="button"
      role="menuitem"
      tabIndex={-1}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        keyboard.current = event.key === "Enter" || event.key === " ";
      }}
      onClick={(event) => {
        onClick?.(event);
        const byKeyboard = keyboard.current || event.detail === 0;
        keyboard.current = false;
        if (event.defaultPrevented) {
          return;
        }
        onAction();
        menu.request(false, byKeyboard ? "item" : undefined);
      }}
    />
  );
}

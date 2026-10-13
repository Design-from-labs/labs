"use client";

import { Menu, MenuItem } from "react-aria-components";
import {
  Children,
  type ComponentPropsWithRef,
  createContext,
  isValidElement,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  type RefObject,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
} from "react";

/*
 * The menu wiring of the liquid surfaces on React Aria's Menu. The default
 * variant writes the WAI-ARIA menu button pattern out (taffy-menu.tsx in the
 * default style); this file keeps the same exports, so the surfaces
 * themselves are shared.
 *
 * React Aria owns the rows: the roles (menuitem, or menuitemcheckbox with
 * aria-checked), the roving focus, the typeahead, Home and End and the
 * selection. A Menu builds only from its items (any other child makes it
 * render nothing, measured), so the panel the surface animates is a plain box
 * around the Menu, and the travelling hover pill sits beside it. The trigger
 * and the outside and Escape dismissal are the default wiring: React Aria's
 * overlay would portal the panel away from its trigger, and the goo filter
 * needs both in one layer.
 *
 * - The trigger opens with Enter, Space, ArrowDown (first item) or ArrowUp
 *   (last item); a pointer open focuses the menu itself, a keyboard open
 *   its first (or last) item.
 * - In the menu: arrow keys move (and wrap), Home and End jump, a letter
 *   jumps to the next item starting with it, Enter and Space activate,
 *   Escape closes and returns focus to the trigger, Tab closes and moves on.
 * - A pointer press outside closes it.
 */

/* The Menu is a flex column of rows inside the panel box, with no outline of
   its own (the rows draw the focus ring). */
const MENU_STYLES = `
.taffy-menu-aria {
  display: flex;
  flex-direction: column;
  outline: none;
}
`;

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

  return (
    <Context.Provider value={context}>
      <style href="designfrom-taffy-menu-aria" precedence="default">
        {MENU_STYLES}
      </style>
      {children}
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

type RowProps = {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  textValue?: string;
};

function isRow(
  child: ReactNode,
): child is ReactElement<RowProps & { textValue: string }> {
  return (
    isValidElement(child) &&
    (child.type === TaffyMenuCheckboxItem || child.type === TaffyMenuItem)
  );
}

export function TaffyMenuList({
  ref,
  label,
  layout = "list",
  onKeyDown,
  children,
  ...props
}: TaffyMenuListProps) {
  const menu = useMenu();
  const items = Children.toArray(children);
  const rows = items.filter(isRow);
  const others = items.filter((child) => !isRow(child));
  const checkable = rows.some((row) => row.type === TaffyMenuCheckboxItem);
  const selected = new Set(
    rows.filter((row) => row.props.checked).map((row) => row.props.textValue),
  );

  /* An arc has no vertical order, so every arrow moves along it. React Aria's
     own arrows follow the rows' order down and up only; this runs first. */
  const handleArcKeys = (event: KeyboardEvent<HTMLDivElement>) => {
    if (layout !== "arc" || !event.key.startsWith("Arrow")) {
      return;
    }
    const list = itemsOf(menu.listRef.current);
    const current = list.indexOf(document.activeElement as HTMLElement);
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    const forward = ["ArrowDown", rtl ? "ArrowLeft" : "ArrowRight"];
    const back = ["ArrowUp", rtl ? "ArrowRight" : "ArrowLeft"];
    const step = forward.includes(event.key) ? 1 : back.includes(event.key) ? -1 : 0;
    if (step === 0 || list.length === 0) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const to = current < 0 ? (step > 0 ? 0 : list.length - 1) : current + step;
    list[(to + list.length) % list.length]?.focus({ preventScroll: true });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) {
      return;
    }
    if (event.key === "Tab") {
      menu.request(false, "tab");
      return;
    }
  };

  return (
    <div
      {...props}
      ref={ref}
      inert={!menu.open}
      onKeyDownCapture={handleArcKeys}
      onKeyDown={handleKeyDown}
    >
      {others}
      <Menu
        ref={(node: HTMLDivElement | null) => {
          menu.listRef.current = node;
        }}
        id={menu.listId}
        aria-label={label}
        className="taffy-menu-aria"
        selectionMode={checkable ? "multiple" : "none"}
        selectedKeys={selected}
        shouldCloseOnSelect={false}
        onSelectionChange={(next) => {
          const keys = new Set(next === "all" ? rows.map((r) => r.props.textValue) : next);
          for (const row of rows) {
            const on = keys.has(row.props.textValue);
            if (on !== Boolean(row.props.checked)) {
              row.props.onCheckedChange?.(on);
            }
          }
        }}
      >
        {rows}
      </Menu>
    </div>
  );
}

export type TaffyMenuCheckboxItemProps = Omit<
  ComponentPropsWithRef<"div">,
  "onClick"
> & {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  textValue: string;
  onClick?: (event: never) => void;
};

/* The row, as React Aria's MenuItem: the Menu above reads the tick state and
   the handler from these props and keeps the selection. */
export function TaffyMenuCheckboxItem({
  checked: _checked,
  onCheckedChange: _onCheckedChange,
  textValue,
  ...props
}: TaffyMenuCheckboxItemProps) {
  return <MenuItem {...(props as object)} id={textValue} textValue={textValue} />;
}

export type TaffyMenuItemProps = Omit<ComponentPropsWithRef<"div">, "onClick"> & {
  onAction: () => void;
  textValue: string;
  onClick?: (event: never) => void;
};

/* Activating an item runs `onAction` and closes the menu. */
export function TaffyMenuItem({
  onAction,
  textValue,
  onKeyDown,
  ...props
}: TaffyMenuItemProps) {
  const menu = useMenu();
  const keyboard = useRef(false);
  return (
    <MenuItem
      {...(props as object)}
      id={textValue}
      textValue={textValue}
      onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
        onKeyDown?.(event);
        keyboard.current = event.key === "Enter" || event.key === " ";
      }}
      onAction={() => {
        const byKeyboard = keyboard.current;
        keyboard.current = false;
        onAction();
        menu.request(false, byKeyboard ? "item" : undefined);
      }}
    />
  );
}

"use client";

// ---- upstream: packages/sileo/src/toast.tsx ----
// Merged line for line (the store, the toast API and the Toaster); every
// change is listed in docs/evidence/ports/pill-toast/fidelity.md. Renamed
// (sileo -> pillToast, Toaster -> PillToaster). Labs additions are marked "Labs:".
import {
  type CSSProperties,
  type ReactElement,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AUTO_COLLAPSE_DELAY,
  AUTO_EXPAND_DELAY,
  DEFAULT_TOAST_DURATION,
  EXIT_DURATION,
} from "./pill-toast-core";
import { PillToastCard } from "./pill-toast-view";
import { pillToastStyles } from "./pill-toast-styles";
import type { PillToastOptions, PillToastPosition, PillToastState } from "./pill-toast-core";

const pillAlign = (pos: PillToastPosition) =>
  pos.includes("right") ? "right" : pos.includes("center") ? "center" : "left";
const expandDir = (pos: PillToastPosition) =>
  pos.startsWith("top") ? ("bottom" as const) : ("top" as const);

/* ---------------------------------- Types --------------------------------- */

interface InternalPillToastOptions extends PillToastOptions {
  id?: string;
  state?: PillToastState;
}

interface PillToastItem extends InternalPillToastOptions {
  id: string;
  instanceId: string;
  exiting?: boolean;
  autoExpandDelayMs?: number;
  autoCollapseDelayMs?: number;
}

type PillToastOffsetValue = number | string;
type PillToastOffsetConfig = Partial<Record<"top" | "right" | "bottom" | "left", PillToastOffsetValue>>;

export interface PillToasterProps {
  children?: ReactNode;
  position?: PillToastPosition;
  offset?: PillToastOffsetValue | PillToastOffsetConfig;
  options?: Partial<PillToastOptions>;
  theme?: "light" | "dark" | "system";
  /** Labs: Escape dismisses the focused toast, or the newest one. Default true. */
  closeOnEscape?: boolean;
}

/* ------------------------------ Global State ------------------------------ */

type PillToastListener = (toasts: PillToastItem[]) => void;

const store = {
  toasts: [] as PillToastItem[],
  listeners: new Set<PillToastListener>(),
  position: "top-right" as PillToastPosition,
  options: undefined as Partial<PillToastOptions> | undefined,

  emit() {
    for (const fn of this.listeners) fn(this.toasts);
  },

  update(fn: (prev: PillToastItem[]) => PillToastItem[]) {
    this.toasts = fn(this.toasts);
    this.emit();
  },
};

let idCounter = 0;
const generateId = () =>
  `${++idCounter}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const timeoutKey = (t: PillToastItem) => `${t.id}:${t.instanceId}`;

/* ------------------------------- Toast API -------------------------------- */

const dismissToast = (id: string) => {
  const item = store.toasts.find((t) => t.id === id);
  if (!item || item.exiting) return;

  store.update((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)));

  setTimeout(() => store.update((prev) => prev.filter((t) => t.id !== id)), EXIT_DURATION);
};

const resolveAutopilot = (
  opts: InternalPillToastOptions,
  duration: number | null,
): { expandDelayMs?: number; collapseDelayMs?: number } => {
  if (opts.autopilot === false || !duration || duration <= 0) return {};
  const cfg = typeof opts.autopilot === "object" ? opts.autopilot : undefined;
  const clamp = (v: number) => Math.min(duration, Math.max(0, v));
  return {
    expandDelayMs: clamp(cfg?.expand ?? AUTO_EXPAND_DELAY),
    collapseDelayMs: clamp(cfg?.collapse ?? AUTO_COLLAPSE_DELAY),
  };
};

const mergeOptions = (options: InternalPillToastOptions) => ({
  ...store.options,
  ...options,
  styles: { ...store.options?.styles, ...options.styles },
});

const buildPillToastItem = (
  merged: InternalPillToastOptions,
  id: string,
  fallbackPosition?: PillToastPosition,
): PillToastItem => {
  const duration = merged.duration ?? DEFAULT_TOAST_DURATION;
  const auto = resolveAutopilot(merged, duration);
  return {
    ...merged,
    id,
    instanceId: generateId(),
    position: merged.position ?? fallbackPosition ?? store.position,
    autoExpandDelayMs: auto.expandDelayMs,
    autoCollapseDelayMs: auto.collapseDelayMs,
  };
};

/* ------------------------------ Announcements ----------------------------- */

// Labs: the toast's description is not rendered until the card opens, and a
// card that mounts inside a live region is announced unreliably, so every
// toast and every update is also written to a persistent pair of visually
// hidden live regions: polite for most states, assertive for warnings and
// errors.

type Politeness = "polite" | "assertive";
type Announcement = { message: string; politeness: Politeness };

const announcers = new Set<(announcement: Announcement) => void>();

const announce = (message: string, politeness: Politeness) => {
  for (const fn of announcers) fn({ message, politeness });
};

/** The plain text of a description, which may be a React node. */
const textOf = (node: ReactNode): string => {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).filter(Boolean).join(" ");
  const children = (node as ReactElement<{ children?: ReactNode }>).props?.children;
  return children === undefined ? "" : textOf(children);
};

const announceToast = (options: InternalPillToastOptions) => {
  const state = options.state ?? "success";
  const message = [options.title ?? state, textOf(options.description), options.button?.title]
    .filter(Boolean)
    .join(". ");
  announce(message, state === "error" || state === "warning" ? "assertive" : "polite");
};

const createToast = (options: InternalPillToastOptions) => {
  const live = store.toasts.filter((t) => !t.exiting);
  const merged = mergeOptions(options);

  const id = merged.id ?? "pill-toast-default";
  const prev = live.find((t) => t.id === id);
  const item = buildPillToastItem(merged, id, prev?.position);

  if (prev) {
    store.update((p) => p.map((t) => (t.id === id ? item : t)));
  } else {
    store.update((p) => [...p.filter((t) => t.id !== id), item]);
  }
  announceToast(item);
  return { id, duration: merged.duration ?? DEFAULT_TOAST_DURATION };
};

const updateToast = (id: string, options: InternalPillToastOptions) => {
  const existing = store.toasts.find((t) => t.id === id);
  if (!existing) return;

  const item = buildPillToastItem(mergeOptions(options), id, existing.position);
  store.update((prev) => prev.map((t) => (t.id === id ? item : t)));
  announceToast(item);
};

export interface PillToastPromiseOptions<T = unknown> {
  loading: PillToastOptions;
  success: PillToastOptions | ((data: T) => PillToastOptions);
  error: PillToastOptions | ((err: unknown) => PillToastOptions);
  action?: PillToastOptions | ((data: T) => PillToastOptions);
  position?: PillToastPosition;
}

export const pillToast = {
  show: (opts: PillToastOptions) => createToast({ ...opts, state: opts.type }).id,
  success: (opts: PillToastOptions) => createToast({ ...opts, state: "success" }).id,
  error: (opts: PillToastOptions) => createToast({ ...opts, state: "error" }).id,
  warning: (opts: PillToastOptions) => createToast({ ...opts, state: "warning" }).id,
  info: (opts: PillToastOptions) => createToast({ ...opts, state: "info" }).id,
  action: (opts: PillToastOptions) => createToast({ ...opts, state: "action" }).id,

  promise: <T,>(
    promise: Promise<T> | (() => Promise<T>),
    opts: PillToastPromiseOptions<T>,
  ): Promise<T> => {
    const { id } = createToast({
      ...opts.loading,
      state: "loading",
      duration: null,
      position: opts.position,
    });

    const p = typeof promise === "function" ? promise() : promise;

    p.then((data) => {
      if (opts.action) {
        const actionOpts = typeof opts.action === "function" ? opts.action(data) : opts.action;
        updateToast(id, { ...actionOpts, state: "action", id });
      } else {
        const successOpts = typeof opts.success === "function" ? opts.success(data) : opts.success;
        updateToast(id, { ...successOpts, state: "success", id });
      }
    }).catch((err) => {
      const errorOpts = typeof opts.error === "function" ? opts.error(err) : opts.error;
      updateToast(id, { ...errorOpts, state: "error", id });
    });

    return p;
  },

  dismiss: dismissToast,

  clear: (position?: PillToastPosition) =>
    store.update((prev) => (position ? prev.filter((t) => t.position !== position) : [])),
};

/* ------------------------------ Toaster Component ------------------------- */

const THEME_FILLS = {
  light: "#1a1a1a",
  dark: "#f2f2f2",
} as const;

function useResolvedTheme(theme: "light" | "dark" | "system" | undefined): "light" | "dark" {
  const [resolved, setResolved] = useState<"light" | "dark">(() => {
    if (theme === "light" || theme === "dark") return theme;
    if (typeof window === "undefined") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    if (theme === "light" || theme === "dark") {
      setResolved(theme);
      return;
    }
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setResolved(e.matches ? "dark" : "light");
    setResolved(mq.matches ? "dark" : "light");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  return resolved;
}

export function PillToaster({
  children,
  position = "top-right",
  offset,
  options,
  theme,
  closeOnEscape = true,
}: PillToasterProps) {
  const resolvedTheme = useResolvedTheme(theme);
  const [toasts, setToasts] = useState<PillToastItem[]>(store.toasts);
  const [activeId, setActiveId] = useState<string>();

  const hoverRef = useRef(false);
  const timersRef = useRef(new Map<string, number>());
  const listRef = useRef(toasts);
  const latestRef = useRef<string | undefined>(undefined);
  const handlersCache = useRef(
    new Map<
      string,
      {
        enter: () => void;
        leave: () => void;
        dismiss: () => void;
      }
    >(),
  );

  useEffect(() => {
    store.position = position;
    store.options = options;
  }, [position, options]);

  const clearAllTimers = useCallback(() => {
    for (const t of timersRef.current.values()) clearTimeout(t);
    timersRef.current.clear();
  }, []);

  const schedule = useCallback((items: PillToastItem[]) => {
    if (hoverRef.current) return;

    for (const item of items) {
      if (item.exiting) continue;
      const key = timeoutKey(item);
      if (timersRef.current.has(key)) continue;

      if (item.duration === null) continue;
      const dur = item.duration ?? DEFAULT_TOAST_DURATION;
      if (dur <= 0) continue;

      timersRef.current.set(
        key,
        window.setTimeout(() => dismissToast(item.id), dur),
      );
    }
  }, []);

  useEffect(() => {
    const listener: PillToastListener = (next) => setToasts(next);
    store.listeners.add(listener);
    /*
     * Re-read on subscribing, because the state above was seeded during render
     * and nothing was listening in between.
     *
     * A store write in that gap is delivered to whoever is subscribed at the
     * time, which is not yet this Toaster, so it is missed outright and the
     * stale snapshot is kept until the next unrelated write. A route change is
     * exactly that gap: the outgoing page clears the store from its cleanup
     * while the incoming Toaster has rendered but not yet subscribed, and the
     * toast it never should have had stays on screen. Re-reading costs a
     * reference comparison — React bails out when nothing moved.
     */
    setToasts(store.toasts);
    return () => {
      store.listeners.delete(listener);
      clearAllTimers();
    };
  }, [clearAllTimers]);

  useEffect(() => {
    listRef.current = toasts;

    const toastKeys = new Set(toasts.map(timeoutKey));
    const toastIds = new Set(toasts.map((t) => t.id));
    for (const [key, timer] of timersRef.current) {
      if (!toastKeys.has(key)) {
        clearTimeout(timer);
        timersRef.current.delete(key);
      }
    }
    for (const id of handlersCache.current.keys()) {
      if (!toastIds.has(id)) handlersCache.current.delete(id);
    }

    schedule(toasts);
  }, [toasts, schedule]);

  const handleMouseEnterRef = useRef<() => void>(null);
  const handleMouseLeaveRef = useRef<() => void>(null);

  handleMouseEnterRef.current = useCallback(() => {
    if (hoverRef.current) return;
    hoverRef.current = true;
    clearAllTimers();
  }, [clearAllTimers]);

  handleMouseLeaveRef.current = useCallback(() => {
    if (!hoverRef.current) return;
    hoverRef.current = false;
    schedule(listRef.current);
  }, [schedule]);

  const latest = useMemo(() => {
    for (let i = toasts.length - 1; i >= 0; i--) {
      if (!toasts[i].exiting) return toasts[i].id;
    }
    return undefined;
  }, [toasts]);

  useEffect(() => {
    latestRef.current = latest;
    setActiveId(latest);
  }, [latest]);

  // Labs: keyboard dismissal. Escape closes the toast that has focus, else the
  // newest one, unless something else already handled the key.
  useEffect(() => {
    if (!closeOnEscape) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      const focused = (e.target as Element | null)?.closest?.<HTMLElement>("[data-pill-toast-card]");
      const id = focused?.dataset.pillToastId ?? latestRef.current;
      if (id) dismissToast(id);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [closeOnEscape]);

  const getHandlers = useCallback((toastId: string) => {
    let cached = handlersCache.current.get(toastId);
    if (cached) return cached;

    cached = {
      enter: () => {
        setActiveId((prev) => (prev === toastId ? prev : toastId));
        handleMouseEnterRef.current?.();
      },
      leave: () => {
        setActiveId((prev) => (prev === latestRef.current ? prev : latestRef.current));
        handleMouseLeaveRef.current?.();
      },
      dismiss: () => dismissToast(toastId),
    };

    handlersCache.current.set(toastId, cached);
    return cached;
  }, []);

  const getViewportStyle = useCallback(
    (pos: PillToastPosition): CSSProperties | undefined => {
      if (offset === undefined) return undefined;

      const o =
        typeof offset === "object"
          ? offset
          : { top: offset, right: offset, bottom: offset, left: offset };

      const s: CSSProperties = {};
      const px = (v: PillToastOffsetValue) => (typeof v === "number" ? `${v}px` : v);

      if (pos.startsWith("top") && o.top) s.top = px(o.top);
      if (pos.startsWith("bottom") && o.bottom) s.bottom = px(o.bottom);
      if (pos.endsWith("left") && o.left) s.left = px(o.left);
      if (pos.endsWith("right") && o.right) s.right = px(o.right);

      return s;
    },
    [offset],
  );

  const activePositions = useMemo(() => {
    const map = new Map<PillToastPosition, PillToastItem[]>();
    for (const t of toasts) {
      const pos = t.position ?? position;
      const arr = map.get(pos);
      if (arr) {
        arr.push(t);
      } else {
        map.set(pos, [t]);
      }
    }
    return map;
  }, [toasts, position]);

  return (
    <>
      <style href="designfrom-pill-toast" precedence="default">
        {pillToastStyles}
      </style>
      {children}
      <PillToastAnnouncer />
      {Array.from(activePositions, ([pos, items]) => {
        const pill = pillAlign(pos);
        const expand = expandDir(pos);

        return (
          <section
            key={pos}
            data-pill-toast-viewport
            data-position={pos}
            data-theme={theme ? resolvedTheme : undefined}
            // Labs: a named region, so axe's landmark rule sees the toasts as
            // contained; the live announcements are the announcer's job.
            aria-label={`Notifications ${pos.replace("-", " ")}`}
            style={getViewportStyle(pos)}
          >
            {items.map((item) => {
              const h = getHandlers(item.id);
              return (
                <PillToastCard
                  key={item.id}
                  id={item.id}
                  state={item.state}
                  title={item.title}
                  description={item.description}
                  position={pill}
                  expand={expand}
                  icon={item.icon}
                  fill={item.fill ?? (theme ? THEME_FILLS[resolvedTheme] : undefined)}
                  styles={item.styles}
                  button={item.button}
                  roundness={item.roundness}
                  exiting={item.exiting}
                  autoExpandDelayMs={item.autoExpandDelayMs}
                  autoCollapseDelayMs={item.autoCollapseDelayMs}
                  refreshKey={item.instanceId}
                  canExpand={activeId === undefined || activeId === item.id}
                  onMouseEnter={h.enter}
                  onMouseLeave={h.leave}
                  onDismiss={h.dismiss}
                />
              );
            })}
          </section>
        );
      })}
    </>
  );
}

/* ------------------------------- Announcer -------------------------------- */

// Labs: the persistent live regions the announcements are written to. A region
// is emptied and refilled a moment later, so a repeated message is spoken again.

const visuallyHidden: CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  margin: -1,
  padding: 0,
  overflow: "hidden",
  clipPath: "inset(50%)",
  whiteSpace: "nowrap",
  border: 0,
};

function PillToastAnnouncer() {
  const [polite, setPolite] = useState("");
  const [assertive, setAssertive] = useState("");

  useEffect(() => {
    const timers = new Set<number>();
    const listener = ({ message, politeness }: Announcement) => {
      const set = politeness === "assertive" ? setAssertive : setPolite;
      set("");
      const fill = window.setTimeout(() => {
        set(message);
        timers.delete(fill);
      }, 60);
      const clear = window.setTimeout(() => {
        set("");
        timers.delete(clear);
      }, 6000);
      timers.add(fill);
      timers.add(clear);
    };
    announcers.add(listener);
    return () => {
      announcers.delete(listener);
      for (const timer of timers) clearTimeout(timer);
    };
  }, []);

  return (
    <>
      <div role="status" aria-live="polite" aria-atomic="true" style={visuallyHidden}>
        {polite}
      </div>
      <div role="alert" aria-live="assertive" aria-atomic="true" style={visuallyHidden}>
        {assertive}
      </div>
    </>
  );
}

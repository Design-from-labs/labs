"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { EMOJI_GROUPS } from "./message-actions-emojis";
import {
  type MessageActionIcons,
  messageActionIcons,
} from "./message-actions-icons";
import {
  messageActionsCss,
  messageActionsClassNames as styles,
} from "./message-actions-styles";

// Labs port: the parts of upstream's MessageActions.tsx that do not depend on
// a headless primitive (the reactions, the minute roll, the timestamps and
// the row's state), shared by the Radix, Base UI and React Aria items. Lines
// are upstream's; the state lives in useMessageActions so each primitive's
// file renders the same row.

/** The component's stylesheet, hoisted into <head> once by React 19. */
export function MessageActionsStyle() {
  return (
    <style href="designfrom-message-actions" precedence="default">
      {messageActionsCss}
    </style>
  );
}

/** Upstream reads the theme of a portaled surface from the nearest data-theme. */
export function messageActionsThemeOf(
  element: Element | null | undefined,
): "light" | "dark" {
  return element?.closest("[data-theme]")?.getAttribute("data-theme") === "dark"
    ? "dark"
    : "light";
}

/**
 * Labs: the primitives portal the reaction bar and the menu out of the row,
 * where upstream rendered them inside it. These props give such a surface what
 * it inherited there: the row's theme (a data-theme or .dark ancestor), its
 * font and its direction. Upstream's emoji picker was already portaled to
 * <body>, so it keeps the page's font (`inherit: false`).
 */
export function messageActionsSurface(
  root: HTMLElement | null,
  inherit = true,
): {
  "data-theme"?: "light" | "dark";
  dir?: "ltr" | "rtl";
  style?: { fontFamily: string };
} {
  if (!root || typeof window === "undefined") return {};
  const themed = root.closest("[data-theme]")?.getAttribute("data-theme");
  const theme =
    themed === "dark" || themed === "light"
      ? themed
      : root.closest(".dark")
        ? "dark"
        : undefined;
  const computed = window.getComputedStyle(root);
  return {
    ...(theme ? { "data-theme": theme } : {}),
    dir: computed.direction === "rtl" ? "rtl" : "ltr",
    ...(inherit ? { style: { fontFamily: computed.fontFamily } } : {}),
  };
}

/**
 * Labs: whether the last input was a pointer. The primitives return focus to
 * the trigger when a popup closes; after a mouse or touch close, upstream left
 * focus where it fell, which keeps the timestamp and tooltip from showing
 * once the pointer has left the row.
 */
export function useMessageActionsPointerInput() {
  const pointer = useRef(false);
  useEffect(() => {
    const onPointer = () => {
      pointer.current = true;
    };
    const onKey = () => {
      pointer.current = false;
    };
    document.addEventListener("pointerdown", onPointer, true);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onPointer, true);
      document.removeEventListener("keydown", onKey, true);
    };
  }, []);
  return pointer;
}

export const messageActionsReactions = [
  "👍",
  "❤️",
  "😄",
  "🎉",
  "🤔",
  "👀",
] as const;

const REACTIONS = messageActionsReactions;

export type MessageActionsVote = "up" | "down" | null;

type Vote = MessageActionsVote;

const ROLL_MS = 400;

export function messageActionsElapsedMinutes(date: Date, now: number) {
  return Math.max(0, Math.round((now - date.getTime()) / 60000));
}

const elapsedMinutes = messageActionsElapsedMinutes;

export function messageActionsFormatAgo(date: Date, now = Date.now()) {
  const minutes = elapsedMinutes(date, now);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export function MessageActionsMinuteRoll({ value }: { value: string }) {
  const prevRef = useRef(value);
  const [oldVal, setOldVal] = useState(value);
  const [newVal, setNewVal] = useState(value);
  const [rolling, setRolling] = useState(false);
  const [shifted, setShifted] = useState(false);
  const [dir, setDir] = useState<"up" | "down">("up");

  useEffect(() => {
    if (prevRef.current === value) return;
    const from = prevRef.current;
    prevRef.current = value;
    const fromN = parseInt(from, 10);
    const toN = parseInt(value, 10);
    setDir(
      Number.isFinite(fromN) && Number.isFinite(toN) && toN < fromN
        ? "down"
        : "up",
    );
    setOldVal(from);
    setNewVal(value);
    setRolling(true);
    setShifted(false);

    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setShifted(true));
    });
    const done = window.setTimeout(() => {
      setRolling(false);
      setOldVal(value);
      setShifted(false);
    }, ROLL_MS);

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      window.clearTimeout(done);
    };
  }, [value]);

  const chars = rolling ? newVal : oldVal;

  return (
    <span className={styles.minRolls}>
      {Array.from({ length: chars.length }, (_, i) => {
        const previous = oldVal[i] ?? "";
        const next = chars[i] ?? "";
        if (!rolling || previous === next) {
          return (
            <span key={`${i}-${next}`} className={styles.minStatic}>
              {next}
            </span>
          );
        }
        const top = dir === "down" ? next : previous;
        const bottom = dir === "down" ? previous : next;
        return (
          <span
            key={`${i}-${previous}-${next}-${dir}`}
            className={styles.minRoll}
          >
            <span
              className={styles.minRollInner}
              data-dir={dir}
              data-shifted={shifted ? "true" : undefined}
            >
              <span>{top}</span>
              <span>{bottom}</span>
            </span>
          </span>
        );
      })}
    </span>
  );
}

export function messageActionsFormatAbsolute(date: Date) {
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export type MessageActionsProps = {
  /** The message text the copy action writes to the clipboard. */
  text?: string;
  /** When the message was sent. Default: three minutes before mount. */
  sentAt?: Date;
  onCopy?: (text: string) => void;
  onVote?: (vote: Vote) => void;
  onReact?: (emoji: string | null) => void;
  onReply?: () => void;
  onFork?: () => void;
  /** Replace any icon of the set (render functions). */
  icons?: Partial<MessageActionIcons>;
  /**
   * Labs: "compact" is upstream's 20px buttons; "comfortable" gives each a
   * 24px target (WCAG 2.2 target size) with the same look inside.
   */
  density?: "compact" | "comfortable";
};

/** Upstream's row state and handlers, unchanged apart from the panel's closing. */
export function useMessageActions({
  text = "Thanks, that answered it.",
  sentAt,
  onCopy,
  onVote,
  onReact,
  onReply,
  onFork,
  icons,
  density = "compact",
}: MessageActionsProps) {
  const [vote, setVote] = useState<Vote>(null);
  const [copied, setCopied] = useState(false);
  const [panel, setPanel] = useState<"react" | "more" | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [reaction, setReaction] = useState<string | null>(null);
  const [extra, setExtra] = useState<string | null>(null);
  const [extraOut, setExtraOut] = useState(false);
  const [upN, setUpN] = useState(0);
  const [downN, setDownN] = useState(0);
  const [smileN, setSmileN] = useState(0);
  const [replyN, setReplyN] = useState(0);
  const icon = { ...messageActionIcons, ...icons };
  const searchRef = useRef<HTMLInputElement>(null);
  const [postedAt] = useState(
    () => sentAt ?? new Date(Date.now() - 3 * 60 * 1000),
  );
  const [now, setNow] = useState(() => Date.now());
  // Labs: client-only text (the full date) waits for hydration, since the
  // server's clock and time zone differ from the reader's.
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 900);
    return () => window.clearTimeout(timer);
  }, [copied]);

  // Labs: the primitive's popover and menu close on Escape and outside
  // presses, so upstream's document listeners for that are gone.

  useEffect(() => {
    if (panel === "react") return;
    setPickerOpen(false);
    setQuery("");
  }, [panel]);

  useEffect(() => {
    if (panel === "react" || !extraOut) return;
    setExtra(null);
    setExtraOut(false);
  }, [panel, extraOut]);

  useEffect(() => {
    if (!pickerOpen) return;
    // Labs: without scrolling; the primitive is still placing the picker.
    searchRef.current?.focus({ preventScroll: true });
  }, [pickerOpen]);

  const choose = (next: Vote) => {
    const value = vote === next ? null : next;
    setVote(value);
    onVote?.(value);
    if (next === "up") setUpN((n) => n + 1);
    if (next === "down") setDownN((n) => n + 1);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* preview still shows the drawn check */
    }
    setCopied(true);
    onCopy?.(text);
  };

  const react = (emoji: string) => {
    const value = reaction === emoji ? null : emoji;
    const preset = (REACTIONS as readonly string[]).includes(emoji);
    const fromRow = panel === "react" && !pickerOpen;
    setReaction(value);
    onReact?.(value);
    setPickerOpen(false);
    setQuery("");

    if (!preset && value) {
      setExtra(emoji);
      setExtraOut(false);
      setPanel(null);
      return;
    }

    const leaveExtra =
      extra !== null &&
      ((value === null && emoji === extra) ||
        (value !== null && value !== extra));
    if (leaveExtra && fromRow && emoji === extra) {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setExtra(null);
        setExtraOut(false);
      } else {
        setExtraOut(true);
      }
      return;
    }
    if (leaveExtra) {
      setExtra(null);
      setExtraOut(false);
    }
    setPanel(null);
  };

  const emojiGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return EMOJI_GROUPS;
    return EMOJI_GROUPS.map((group) => ({
      label: group.label,
      items: group.items.filter(([, keywords]) => keywords.includes(q)),
    })).filter((group) => group.items.length > 0);
  }, [query]);

  const reply = () => {
    setReplyN((n) => n + 1);
    setPanel(null);
    onReply?.();
  };

  const more = (action: "aloud" | "fork" | "report") => {
    if (action === "fork") onFork?.();
    setPanel(null);
  };

  return {
    vote,
    copied,
    panel,
    setPanel,
    pickerOpen,
    setPickerOpen,
    query,
    setQuery,
    reaction,
    extra,
    setExtra,
    extraOut,
    setExtraOut,
    upN,
    downN,
    smileN,
    setSmileN,
    replyN,
    icon,
    searchRef,
    postedAt,
    now,
    mounted,
    density,
    choose,
    copy,
    react,
    emojiGroups,
    reply,
    more,
  };
}

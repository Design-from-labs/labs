"use client";

import { useCallback, useId, useRef, useState } from "react";
import {
  motion,
  useIsomorphicLayoutEffect,
  useReducedMotion,
} from "motion/react";
import { ChevronDown } from "lucide-react";

/*
 * Ported from ddoemonn/interior, components/interior/show-more.tsx, at commit
 * 314800833bf0: https://github.com/ddoemonn/interior
 *
 * Changes from upstream (the default look is unchanged):
 * - the caret is the icon set's own glyph (Phosphor's caret-down, the same
 *   path the upstream inline SVG draws; or Lucide's chevron-down), rotated by
 *   a wrapping span;
 * - colors are the item's own variables (--show-more-*, light and dark) with
 *   the upstream light values as fallbacks, instead of dark: utilities;
 * - logical alignment (text-start) for right-to-left.
 * The hook, the springs, the measurements and the markup are upstream.
 */

const DISCLOSE = {
  type: "spring",
  stiffness: 190,
  damping: 30,
  mass: 1,
} as const;

const SMALL = {
  type: "spring",
  stiffness: 700,
  damping: 46,
  mass: 0.5,
} as const;

const INSTANT = { duration: 0 } as const;

type Metrics = { line: number; full: number };

export type UseShowMoreOptions = {
  lines?: number;
  maxHeight?: number;
  defaultExpanded?: boolean;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
};

export type UseShowMoreResult = {
  contentRef: React.RefObject<HTMLDivElement | null>;
  expanded: boolean;
  open: boolean;
  toggle: () => void;
  setExpanded: (next: boolean) => void;
  height: number | null;
  collapsedHeight: number | null;
  fullHeight: number | null;
  expandable: boolean;
  capped: boolean;
  scrollable: boolean;
};

export function useShowMore({
  lines = 3,
  maxHeight = 320,
  defaultExpanded = false,
  expanded: expandedProp,
  onExpandedChange,
}: UseShowMoreOptions = {}): UseShowMoreResult {
  const [uncontrolled, setUncontrolled] = useState(defaultExpanded);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  const expanded = expandedProp ?? uncontrolled;

  const notify = useRef(onExpandedChange);
  notify.current = onExpandedChange;

  const setExpanded = useCallback(
    (next: boolean) => {
      if (expandedProp === undefined) setUncontrolled(next);
      notify.current?.(next);
    },
    [expandedProp],
  );

  const toggle = useCallback(
    () => setExpanded(!expanded),
    [setExpanded, expanded],
  );

  useIsomorphicLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const read = () => {
      const styles = getComputedStyle(el);
      const parsed = Number.parseFloat(styles.lineHeight);
      const line = Number.isFinite(parsed)
        ? parsed
        : Number.parseFloat(styles.fontSize) * 1.5;
      const full = el.scrollHeight;

      setMetrics((prev) =>
        prev && prev.line === line && prev.full === full
          ? prev
          : { line, full },
      );
    };

    read();

    const observer = new ResizeObserver(read);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const clamped = metrics ? metrics.line * lines : 0;
  const expandable = metrics ? metrics.full - clamped > 1 : true;
  const capped = metrics ? metrics.full > maxHeight : false;
  const collapsedHeight = metrics ? Math.min(clamped, metrics.full) : null;
  const fullHeight = metrics ? Math.min(metrics.full, maxHeight) : null;
  const open = expanded && expandable;

  return {
    contentRef,
    expanded,
    open,
    toggle,
    setExpanded,
    height: open ? fullHeight : collapsedHeight,
    collapsedHeight,
    fullHeight,
    expandable,
    capped,
    scrollable: open && capped,
  };
}

export type ShowMoreProps = UseShowMoreOptions & {
  children: React.ReactNode;
  moreLabel?: string;
  lessLabel?: string;
  label?: string;
  className?: string;
};

export function ShowMore({
  children,
  moreLabel = "Show more",
  lessLabel = "Show less",
  label = "Details",
  lines = 3,
  maxHeight = 320,
  defaultExpanded,
  expanded,
  onExpandedChange,
  className = "",
}: ShowMoreProps) {
  const reduced = useReducedMotion();
  const regionId = useId();
  const regionRef = useRef<HTMLDivElement>(null);

  const { contentRef, open, toggle, height, expandable, capped, scrollable } =
    useShowMore({
      lines,
      maxHeight,
      defaultExpanded,
      expanded,
      onExpandedChange,
    });

  const press = () => {
    if (open) regionRef.current?.scrollTo({ top: 0 });
    toggle();
  };

  const veiled = expandable && (!open || scrollable);

  return (
    <div
      data-slot="show-more"
      className={`text-[13.5px] leading-relaxed text-[var(--show-more-foreground,oklch(37.4%_0.01_67.558))] ${className}`}
    >
      <div className="relative">
        <motion.div
          ref={regionRef}
          id={regionId}
          role={scrollable ? "region" : undefined}
          aria-label={scrollable ? label : undefined}
          tabIndex={scrollable ? 0 : undefined}
          initial={false}
          animate={height === null ? {} : { height }}
          transition={reduced ? INSTANT : DISCLOSE}
          style={{
            maxHeight: height === null ? `${lines}lh` : undefined,
            overflowY: scrollable ? "auto" : "hidden",

            scrollbarGutter: capped ? "stable" : undefined,
          }}
          data-slot="show-more-region"
          className="overflow-hidden overscroll-contain rounded-[6px] outline-none focus-visible:bg-[var(--show-more-focus,rgb(69_104_255/0.06))] focus-visible:shadow-[inset_0_0_0_1px_var(--show-more-accent,#4568FF)]"
        >
          <div ref={contentRef}>{children}</div>
        </motion.div>
        <motion.div
          aria-hidden
          initial={false}
          animate={{ opacity: veiled ? 1 : 0 }}
          transition={reduced ? INSTANT : SMALL}
          className="pointer-events-none absolute inset-x-0 bottom-0 h-9 bg-gradient-to-t from-[var(--show-more-surface,#fff)] to-[var(--show-more-surface,#fff)]/0"
        />
      </div>
      <div className="mt-2 flex h-8 items-center">
        {/* eslint-disable-next-line jsx-a11y/control-has-associated-label */}
        <button
          type="button"
          onClick={press}
          aria-expanded={open}
          aria-controls={regionId}
          data-slot="show-more-trigger"
          className={`inline-flex h-8 select-none items-center gap-2 rounded-[9px] border border-[var(--show-more-border,oklch(92.3%_0.003_48.717))] bg-[var(--show-more-button,#fff)] px-2.5 text-[12.5px] font-medium text-[var(--show-more-foreground,oklch(37.4%_0.01_67.558))] outline-none transition-[border-color,box-shadow] duration-150 hover:border-[var(--show-more-border-hover,oklch(86.9%_0.005_56.366))] focus-visible:border-[var(--show-more-accent,#4568FF)] focus-visible:shadow-[0_1px_2px_var(--show-more-lift,rgba(28,25,23,0.08)),0_10px_20px_-14px_var(--show-more-glow,rgba(69,104,255,0.6))] ${
            expandable ? "" : "pointer-events-none invisible"
          }`}
        >
          <span className="grid text-start">
            <motion.span
              aria-hidden={open}
              className="col-start-1 row-start-1"
              initial={false}
              animate={{ opacity: open ? 0 : 1 }}
              transition={reduced ? INSTANT : SMALL}
            >
              {moreLabel}
            </motion.span>
            <motion.span
              aria-hidden={!open}
              className="col-start-1 row-start-1"
              initial={false}
              animate={{ opacity: open ? 1 : 0 }}
              transition={reduced ? INSTANT : SMALL}
            >
              {lessLabel}
            </motion.span>
          </span>
          <motion.span
            aria-hidden
            className="inline-flex text-[var(--show-more-muted,oklch(55.3%_0.013_58.071))]"
            initial={false}
            animate={{ rotate: open ? 180 : 0 }}
            transition={reduced ? INSTANT : SMALL}
          >
            <ChevronDown aria-hidden size={12} />
          </motion.span>
        </button>
      </div>
    </div>
  );
}

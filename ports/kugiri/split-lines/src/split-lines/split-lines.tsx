"use client";

import * as React from "react";
import {
  type SplitLevel,
  type SplitOptions,
  splitText,
  type TextSplit,
} from "./split-lines-core";

export type { SplitLevel, SplitOptions, TextSplit };

export type SplitLinesInfo = {
  /** True when the text was split again after its width changed. */
  resplit: boolean;
};

export type SplitLinesProps = Omit<
  React.HTMLAttributes<HTMLElement>,
  "children" | "dir"
> & {
  /** The element to render. Default: `"p"`. */
  as?: React.ElementType;
  /**
   * The text, with any inline markup (links, emphasis). The split owns this
   * element's content while it is mounted: give the component a new `key` to
   * replace the text.
   */
  children: React.ReactNode;
  /** What to split (default `["lines"]`), masks, ignored elements and classes. */
  options?: SplitOptions;
  /** Called with the units after every split. Animate them here. */
  onSplit?: (split: TextSplit, info: SplitLinesInfo) => void;
  /** Split again when the element's width changes, so lines follow the new wrap. Default: true. */
  resplit?: boolean;
  /** Wait for `document.fonts.ready` before the first split. Default: true. */
  waitForFonts?: boolean;
  /**
   * Text direction. Default: `"auto"`, from the text itself. Word and
   * character units are inline blocks, which the page direction would
   * otherwise reorder: Latin text in a right-to-left page would read backwards.
   */
  dir?: "ltr" | "rtl" | "auto";
};

const FOCUSABLE =
  "a[href], button, input, select, textarea, summary, [tabindex], [contenteditable]";

// Visually hidden, still read by screen readers.
const SR_ONLY =
  "position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0";

/**
 * A word or character split boxes every unit, and some screen readers then
 * read the text unit by unit. When nothing inside is focusable, the units are
 * hidden from assistive technology and the text is kept once, whole, in a
 * visually hidden copy. A line-only split reads as it is.
 */
function keepReadable(target: HTMLElement, split: TextSplit, text: string) {
  if (split.words.length === 0 || target.querySelector(FOCUSABLE)) {
    return;
  }
  for (const line of split.lines) {
    line.setAttribute("aria-hidden", "true");
  }
  const copy = document.createElement("span");
  copy.setAttribute("style", SR_ONLY);
  copy.setAttribute("data-split-lines-text", "");
  copy.textContent = text;
  target.prepend(copy);
}

/**
 * Splits its text into the lines the browser painted, and the words and
 * characters inside them, then hands the units to `onSplit` to animate.
 */
export function SplitLines({
  as: Tag = "p",
  children,
  options,
  onSplit,
  resplit = true,
  waitForFonts = true,
  dir = "auto",
  ...props
}: SplitLinesProps) {
  const ref = React.useRef<HTMLElement>(null);
  // The latest options and callback, without splitting again on every render.
  const latest = React.useRef({ options, onSplit });
  latest.current = { options, onSplit };

  React.useLayoutEffect(() => {
    const target = ref.current;
    if (!target) {
      return;
    }
    let split: TextSplit | null = null;
    let cancelled = false;
    let frame = 0;
    let width = -1;
    let observer: ResizeObserver | null = null;
    const text = target.textContent ?? "";

    const run = (again: boolean) => {
      split?.revert();
      split = splitText(target, latest.current.options ?? {});
      keepReadable(target, split, text);
      width = target.clientWidth;
      latest.current.onSplit?.(split, { resplit: again });
    };

    const start = () => {
      if (cancelled) {
        return;
      }
      run(false);
      if (resplit && typeof ResizeObserver !== "undefined") {
        // Only a change of width moves a wrap; a height change does not.
        observer = new ResizeObserver(() => {
          if (target.clientWidth === width) {
            return;
          }
          cancelAnimationFrame(frame);
          frame = requestAnimationFrame(() => run(true));
        });
        observer.observe(target);
      }
    };

    if (waitForFonts && document.fonts?.ready) {
      document.fonts.ready.then(start);
    } else {
      start();
    }

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      observer?.disconnect();
      split?.revert();
    };
  }, [resplit, waitForFonts]);

  return (
    <Tag ref={ref} dir={dir} {...props}>
      {children}
    </Tag>
  );
}

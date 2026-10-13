"use client";

import {
  createElement,
  forwardRef,
  Fragment,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type HTMLAttributes,
} from "react";
import { segmentText, getVisibleSegmentText } from "@/lib/slot-text-core";
import {
  animateSlotText,
  buildSlotText,
  clearSlotText,
  renderTextWithCssFallback,
  slotTextCss,
  type SlotOptions,
} from "@/lib/slot-text-engine";

// ---- upstream: src/react.ts ----
export interface SlotTextProps extends Omit<
  HTMLAttributes<HTMLSpanElement>,
  "children"
> {
  text: string;
  options?: SlotOptions;
  /**
   * Labs: swap the text without the roll when the user prefers reduced
   * motion. Default true.
   */
  respectReducedMotion?: boolean;
}

// Labs: the settled slot markup of the first text, rendered by React so the
// server (and a page before hydration) shows the label. It is the markup
// renderCharacterSlots() writes, so the swap on mount changes nothing visible.
function settledSlots(text: string) {
  return segmentText(text, "character").map((segment, index) =>
    createElement(
      "span",
      { key: index, className: "char-slot", "data-char": segment },
      createElement(
        "span",
        { className: "char-sizer" },
        getVisibleSegmentText(segment),
      ),
      createElement(
        "span",
        { className: "char-face" },
        getVisibleSegmentText(segment),
      ),
    ),
  );
}

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export const SlotText = forwardRef<HTMLSpanElement, SlotTextProps>(
  (
    {
      text,
      options,
      "aria-label": ariaLabel,
      respectReducedMotion = true,
      className,
      ...props
    },
    forwardedRef,
  ) => {
    const elementRef = useRef<HTMLSpanElement>(null);
    const mountedRef = useRef(false);
    const firstTextEffectRef = useRef(true);
    const optionsRef = useRef<SlotOptions | undefined>(options);
    // Labs: rendered once; React never updates these children afterwards,
    // because the engine owns the element's content after mount.
    const [initialSlots] = useState(() => settledSlots(text));

    useImperativeHandle(forwardedRef, () => elementRef.current!, []);

    useEffect(() => {
      optionsRef.current = options;
    }, [options]);

    useEffect(() => {
      const element = elementRef.current;
      if (!element) return;

      renderTextWithCssFallback(element, text);
      mountedRef.current = true;

      return () => {
        clearSlotText(element);
        mountedRef.current = false;
        firstTextEffectRef.current = true;
      };
    }, []);

    useEffect(() => {
      const element = elementRef.current;
      if (!element || !mountedRef.current) return;
      if (firstTextEffectRef.current) {
        firstTextEffectRef.current = false;
        return;
      }

      // Labs: under reduced motion, show the new text at once.
      if (respectReducedMotion && prefersReducedMotion()) {
        buildSlotText(element, text, { rollBy: optionsRef.current?.rollBy });
        return;
      }

      animateSlotText(element, text, optionsRef.current);
    }, [text]);

    // Labs: the stylesheet ships with the component (hoisted and deduplicated
    // by React 19), the animated glyphs are hidden from assistive technology
    // and the text is kept once as visually hidden text instead, and
    // `dir="auto"` keeps Latin letters in order inside a right-to-left page.
    // Upstream renders only the span, with `aria-label={ariaLabel ?? text}`.
    return createElement(
      Fragment,
      null,
      createElement(
        "style",
        { href: "designfrom-slot-text", precedence: "default" },
        slotTextCss,
      ),
      createElement(
        "span",
        {
          dir: "auto",
          ...props,
          // Labs: the engine adds `slot-text` on mount; rendering it keeps the
          // server markup equal and survives a changed className.
          className: className ? `${className} slot-text` : "slot-text",
          "aria-hidden": true,
          ref: elementRef,
        },
        ...initialSlots,
      ),
      createElement("span", { className: "sr-only" }, ariaLabel ?? text),
    );
  },
);

SlotText.displayName = "SlotText";

"use client";

import {
  type Alignment,
  type Config,
  type Driver,
  type DriverHook,
  type DriveStep,
  driver,
  type Popover,
  type PopoverDOM,
  type Side,
} from "driver.js";
import * as React from "react";

/**
 * Where a step points: a CSS selector, an element, a function returning one,
 * or a React ref. A step without a target (or whose target is missing) shows
 * its popover centered over the page, like a dialog.
 */
type ProductTourTarget =
  | string
  | Element
  | (() => Element)
  | React.RefObject<Element | null>;

/** One step: driver.js's step, with `element` also accepting a React ref. */
type ProductTourStep = Omit<DriveStep, "element"> & {
  element?: ProductTourTarget;
};

type ProductTourOptions = Omit<Config, "steps"> & {
  /** The steps, read when the tour starts. */
  steps: ProductTourStep[];
  /**
   * Text direction of the popovers. `"auto"` (the default) follows the page
   * (the computed direction of `<body>`). In right-to-left, `left`/`right`
   * sides, `start`/`end` alignment of top and bottom popovers, the arrow keys
   * and arrow glyphs in button texts are mirrored.
   */
  dir?: "ltr" | "rtl" | "auto";
  /**
   * The accessible name of a step's popover when it has no title.
   * @default "Product tour"
   */
  label?: string;
  /** Called with the index of each step once it is highlighted. */
  onStepChange?: (index: number) => void;
  /** Called once the tour has ended, however it ended. */
  onClose?: () => void;
};

type ProductTourControls = {
  /** Starts the tour (again) at a step, by default the first one. */
  start: (stepIndex?: number) => void;
  /** Ends the tour. */
  stop: () => void;
  moveNext: () => void;
  movePrevious: () => void;
  moveTo: (stepIndex: number) => void;
  /** Whether the tour is showing. */
  active: boolean;
  /** The highlighted step, while the tour is showing. */
  stepIndex: number | undefined;
  /** The underlying driver.js instance, while the tour is showing. */
  getDriver: () => Driver | null;
};

type ProductTourProps = ProductTourOptions & {
  /** Shows the tour while true. */
  open: boolean;
  /** Called with `false` when the tour ends on its own (done, close, Escape, overlay). */
  onOpenChange?: (open: boolean) => void;
  /** The step to open at. @default 0 */
  startIndex?: number;
};

// The upstream stylesheet (driver.js 1.9.0: src/popover.css and the tour
// rules of src/driver.css), injected once so the installing app needs no
// global CSS import. Changes from upstream: colors and the shadow read
// `--product-tour-*` variables whose fallbacks are upstream's values; the
// close button, footer alignment and button gap use logical properties
// (identical in left-to-right); the keyframes are prefixed; and the
// reduced-motion, focus-visible, more-contrast and forced-colors blocks at
// the end are additions.
const STYLES = `
.driver-popover {
  all: unset;
  font-family: var(
    --product-tour-font,
    "Helvetica Neue",
    Inter,
    ui-sans-serif,
    "Apple Color Emoji",
    Helvetica,
    Arial,
    sans-serif
  );
  box-sizing: border-box;
  color: var(--product-tour-popover-foreground, #2d2d2d);
  margin: 0;
  padding: 15px;
  border-radius: 5px;
  min-width: 250px;
  max-width: 300px;
  box-shadow: var(--product-tour-shadow, 0 1px 10px #0006);
  z-index: 1000000000;
  position: fixed;
  top: 0;
  right: 0;
  background-color: var(--product-tour-popover, #fff);
}

.driver-popover-title {
  font-size: 19px;
  font-weight: 700;
  display: block;
  position: relative;
  line-height: 1.5;
  zoom: 1;
  margin: 0;
}

.driver-popover-close-btn {
  all: unset;
  position: absolute;
  top: 0;
  inset-inline-end: 0;
  width: 32px;
  height: 28px;
  cursor: pointer;
  font-size: 18px;
  font-weight: 500;
  color: var(--product-tour-close, #d2d2d2);
  z-index: 1;
  text-align: center;
  transition: color;
  transition-duration: 200ms;
}

.driver-popover-close-btn:hover,
.driver-popover-close-btn:focus {
  color: var(--product-tour-popover-foreground, #2d2d2d);
}

.driver-popover-title[style*="block"] + .driver-popover-description {
  margin-top: 5px;
}

.driver-popover-description {
  margin-bottom: 0;
  font-size: 14px;
  line-height: 1.5;
  font-weight: 400;
  zoom: 1;
}

.driver-popover-footer {
  margin-top: 15px;
  text-align: end;
  zoom: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.driver-popover-progress-text {
  font-size: 13px;
  font-weight: 400;
  color: var(--product-tour-muted-foreground, #727272);
  zoom: 1;
}

.driver-popover-footer-btn {
  all: unset;
  display: inline-block;
  box-sizing: border-box;
  padding: 3px 7px;
  text-decoration: none;
  background-color: var(--product-tour-button, #ffffff);
  color: var(--product-tour-popover-foreground, #2d2d2d);
  font-size: 12px;
  cursor: pointer;
  outline: 0;
  zoom: 1;
  line-height: 1.3;
  border: 1px solid var(--product-tour-button-border, #ccc);
  border-radius: 3px;
}

.driver-popover-footer .driver-popover-btn-disabled {
  opacity: 0.5;
  pointer-events: none;
}

.driver-popover-footer-btn:hover,
.driver-popover-footer-btn:focus {
  background-color: var(--product-tour-button-hover, #f7f7f7);
}

.driver-popover-navigation-btns {
  display: flex;
  flex-grow: 1;
  justify-content: flex-end;
}

.driver-popover-navigation-btns button + button {
  margin-inline-start: 4px;
}

.driver-popover-arrow {
  content: "";
  position: absolute;
  border: 5px solid var(--product-tour-popover, #fff);
}

.driver-popover-arrow-side-over {
  display: none;
}

.driver-popover-arrow-side-left {
  left: 100%;
  border-right-color: transparent;
  border-bottom-color: transparent;
  border-top-color: transparent;
}

.driver-popover-arrow-side-right {
  right: 100%;
  border-left-color: transparent;
  border-bottom-color: transparent;
  border-top-color: transparent;
}

.driver-popover-arrow-side-top {
  top: 100%;
  border-right-color: transparent;
  border-bottom-color: transparent;
  border-left-color: transparent;
}

.driver-popover-arrow-side-bottom {
  bottom: 100%;
  border-left-color: transparent;
  border-top-color: transparent;
  border-right-color: transparent;
}

.driver-popover-arrow-side-center {
  display: none;
}

.driver-popover-arrow-none {
  display: none;
}

.driver-active .driver-overlay {
  pointer-events: none;
}

.driver-active.driver-no-scroll {
  overflow: hidden;
}

.driver-active * {
  pointer-events: none;
}

.driver-active .driver-active-element,
.driver-active .driver-active-element *,
.driver-popover,
.driver-popover * {
  pointer-events: auto;
}

@keyframes product-tour-fade-in {
  0% {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

.driver-fade .driver-overlay {
  animation: product-tour-fade-in var(--product-tour-duration, 400ms) ease-in-out;
}

.driver-fade .driver-popover {
  animation: product-tour-fade-in var(--product-tour-duration, 400ms);
}

.driver-active-element-parent-no-scroll {
  overflow: hidden !important;
}

.driver-no-interaction,
.driver-no-interaction * {
  pointer-events: none !important;
}

@media (prefers-reduced-motion: reduce) {
  .driver-fade .driver-overlay,
  .driver-fade .driver-popover {
    animation: none;
  }

  .driver-popover-close-btn {
    transition: none;
  }
}

.driver-popover-close-btn:focus-visible,
.driver-popover-footer-btn:focus-visible {
  outline: 2px solid var(--product-tour-ring, #2d2d2d);
  outline-offset: 2px;
}

.driver-popover-close-btn:focus-visible {
  border-radius: 3px;
  outline-offset: -4px;
}

@media (prefers-contrast: more) {
  .driver-popover-close-btn {
    color: var(--product-tour-popover-foreground, #2d2d2d);
  }

  .driver-popover-progress-text {
    color: var(--product-tour-popover-foreground, #2d2d2d);
  }

  .driver-popover-footer-btn {
    border-color: var(--product-tour-popover-foreground, #2d2d2d);
  }
}

@media (forced-colors: active) {
  .driver-popover {
    border: 1px solid CanvasText;
  }

  .driver-popover-close-btn,
  .driver-popover-progress-text {
    color: CanvasText;
  }

  .driver-popover-footer-btn {
    border-color: ButtonText;
  }

  .driver-popover-arrow {
    display: none;
  }
}
`;

const STYLE_ID = "product-tour-styles";

/**
 * Injects the stylesheet once per document, before the app's own
 * stylesheets, where an imported library stylesheet would sit, so the app's
 * rules win ties.
 */
function ensureProductTourStyles(doc: Document) {
  if (doc.getElementById(STYLE_ID)) {
    return;
  }
  const style = doc.createElement("style");
  style.id = STYLE_ID;
  style.textContent = STYLES;
  const first = doc.head.querySelector('style, link[rel="stylesheet"]');
  doc.head.insertBefore(style, first);
}

const MIRRORED_SIDE: Record<Side, Side> = {
  top: "top",
  bottom: "bottom",
  left: "right",
  right: "left",
};

const MIRRORED_ALIGN: Record<Alignment, Alignment> = {
  start: "end",
  center: "center",
  end: "start",
};

/** Swaps the left and right arrow glyphs in a button text (right to left). */
function mirrorArrows(text: string | undefined) {
  return text?.replace(
    /&larr;|&rarr;|←|→/g,
    (glyph) =>
      ({ "&larr;": "&rarr;", "&rarr;": "&larr;", "←": "→", "→": "←" })[glyph] ??
      glyph,
  );
}

// driver.js sets aria-expanded and aria-haspopup on every highlighted
// element. They are kept only where the element's role supports them
// (WAI-ARIA 1.2); anywhere else they are invalid ARIA.
const SUPPORTS_EXPANDED =
  'button, a[href], summary, select, [role="button"], [role="link"], [role="combobox"], [role="menuitem"], [role="tab"], [role="treeitem"], [role="gridcell"], [role="row"], [role="listbox"], [role="checkbox"]';
const SUPPORTS_HASPOPUP =
  'button, a[href], input:not([type="checkbox"], [type="radio"], [type="range"], [type="hidden"]), textarea, [role="button"], [role="link"], [role="combobox"], [role="menuitem"], [role="tab"], [role="treeitem"], [role="gridcell"], [role="slider"], [role="textbox"], [role="searchbox"]';

function isRef(
  target: ProductTourTarget,
): target is React.RefObject<Element | null> {
  return typeof target === "object" && "current" in target;
}

function resolveTarget(
  target: ProductTourTarget | undefined,
): DriveStep["element"] {
  if (target && isRef(target)) {
    return () => target.current as Element;
  }
  return target;
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function resolveDirection(dir: ProductTourOptions["dir"]): "ltr" | "rtl" {
  if (dir === "ltr" || dir === "rtl") {
    return dir;
  }
  return getComputedStyle(document.body).direction === "rtl" ? "rtl" : "ltr";
}

/**
 * A product tour: steps that highlight parts of the page one at a time, each
 * with a popover that explains it. A wrapper over driver.js, which owns the
 * overlay and the popover; this hook creates a fresh instance on `start`,
 * tears it down on unmount, and adds accessibility, reduced motion and
 * right-to-left support.
 */
function useProductTour(options: ProductTourOptions): ProductTourControls {
  const optionsRef = React.useRef(options);
  const instanceRef = React.useRef<Driver | null>(null);
  const triggerRef = React.useRef<HTMLElement | null>(null);
  const generationRef = React.useRef(0);
  const silentRef = React.useRef(false);
  const keysRef = React.useRef<(() => void) | null>(null);
  const [active, setActive] = React.useState(false);
  const [stepIndex, setStepIndex] = React.useState<number | undefined>();

  React.useInsertionEffect(() => {
    ensureProductTourStyles(document);
  }, []);

  React.useEffect(() => {
    optionsRef.current = options;
  });

  React.useEffect(() => {
    silentRef.current = false;
    return () => {
      // Unmounting tears the tour down without calling back.
      silentRef.current = true;
      generationRef.current += 1;
      keysRef.current?.();
      instanceRef.current?.destroy();
      instanceRef.current = null;
    };
  }, []);

  const start = React.useCallback((index = 0) => {
    const {
      steps,
      dir,
      label = "Product tour",
      onStepChange,
      onClose,
      onHighlighted,
      onPopoverRender,
      onDestroyed,
      ...config
    } = optionsRef.current;

    ensureProductTourStyles(document);
    generationRef.current += 1;
    const generation = generationRef.current;
    const current = () => generation === generationRef.current;

    // Remember what had focus, to return to it when the tour ends (a restart
    // from inside the tour keeps the original trigger).
    const focused = document.activeElement;
    if (
      focused instanceof HTMLElement &&
      focused !== document.body &&
      !focused.closest(".driver-popover")
    ) {
      triggerRef.current = focused;
    } else if (!instanceRef.current?.isActive()) {
      triggerRef.current = null;
    }

    const direction = resolveDirection(dir);
    const rtl = direction === "rtl";

    const finish = () => {
      if (!current()) {
        return;
      }
      keysRef.current?.();
      keysRef.current = null;
      instanceRef.current = null;
      setActive(false);
      setStepIndex(undefined);
      // driver.js returns focus to what was focused when the last step was
      // shown, which after the first step is a button of a removed popover.
      const trigger = triggerRef.current;
      queueMicrotask(() => {
        const now = document.activeElement;
        if (
          trigger?.isConnected &&
          (!now || now === document.body || !now.isConnected)
        ) {
          trigger.focus();
        }
      });
      onClose?.();
    };

    const decoratePopover = (popover: PopoverDOM) => {
      const { wrapper, title, description, arrow } = popover;
      if (title.style.display === "none") {
        // Without a title, aria-labelledby would name the dialog with the
        // hidden placeholder text.
        wrapper.removeAttribute("aria-labelledby");
        wrapper.setAttribute("aria-label", label);
      }
      if (description.style.display === "none") {
        wrapper.removeAttribute("aria-describedby");
      }
      if (dir === "ltr" || dir === "rtl") {
        wrapper.dir = dir;
      }
      arrow.setAttribute("aria-hidden", "true");
      // The title is a <header> and the buttons sit in a <footer>; inside a
      // dialog div they would be page-level banner and contentinfo landmarks.
      title.setAttribute("role", "none");
      popover.footer.setAttribute("role", "none");
      // Each text takes its own direction, so Latin text in a right-to-left
      // page keeps its word order (and the other way round).
      for (const text of [title, description, popover.progress]) {
        text.dir = "auto";
      }
    };

    const decorateHighlight = (element: Element | undefined) => {
      document
        .querySelector(".driver-overlay")
        ?.setAttribute("aria-hidden", "true");
      const target = element ?? document.getElementById("driver-dummy-element");
      if (target && !target.matches(SUPPORTS_EXPANDED)) {
        target.removeAttribute("aria-expanded");
      }
      if (target && !target.matches(SUPPORTS_HASPOPUP)) {
        target.removeAttribute("aria-haspopup");
      }
    };

    const highlighted =
      (own: DriverHook | undefined): DriverHook =>
      (element, step, opts) => {
        if (!current()) {
          return;
        }
        decorateHighlight(element);
        if (opts.index !== undefined) {
          setStepIndex(opts.index);
          onStepChange?.(opts.index);
        }
        (own ?? onHighlighted)?.(element, step, opts);
      };

    const mirrorPopover = (popover: Popover): Popover => {
      if (!rtl) {
        return popover;
      }
      const side = popover.side ?? "bottom";
      const vertical = side === "top" || side === "bottom";
      const mirrored: Popover = { ...popover, side: MIRRORED_SIDE[side] };
      if (vertical) {
        mirrored.align = MIRRORED_ALIGN[popover.align ?? "start"];
      }
      // Only texts that are set: an explicit undefined would replace the
      // "Done" label driver.js puts on the last step.
      for (const key of [
        "nextBtnText",
        "prevBtnText",
        "doneBtnText",
      ] as const) {
        if (popover[key] !== undefined) {
          mirrored[key] = mirrorArrows(popover[key]);
        }
      }
      return mirrored;
    };

    const driveSteps = steps.map((step): DriveStep => {
      const { element, popover, onHighlighted: own, ...rest } = step;
      return {
        ...rest,
        element: resolveTarget(element),
        onHighlighted: highlighted(own),
        ...(popover
          ? {
              popover: {
                ...mirrorPopover(popover),
                onPopoverRender: (dom, opts) => {
                  if (!current()) {
                    return;
                  }
                  decoratePopover(dom);
                  (popover.onPopoverRender ?? onPopoverRender)?.(dom, opts);
                },
              },
            }
          : {}),
      };
    });

    const reduced = prefersReducedMotion();
    if (rtl) {
      for (const key of [
        "nextBtnText",
        "prevBtnText",
        "doneBtnText",
      ] as const) {
        if (config[key] !== undefined) {
          config[key] = mirrorArrows(config[key]);
        }
      }
    }
    const instance = driver({
      ...config,
      animate: config.animate ?? !reduced,
      smoothScroll: reduced ? false : config.smoothScroll,
      overlayColor: config.overlayColor ?? "var(--product-tour-overlay, #000)",
      steps: driveSteps,
      onDestroyed: (element, step, opts) => {
        document.body.style.removeProperty("--product-tour-duration");
        if (!silentRef.current) {
          onDestroyed?.(element, step, opts);
        }
        finish();
      },
    });

    instanceRef.current?.destroy();
    instanceRef.current = instance;

    // In right to left the next step is to the left: swap the arrow keys
    // before driver.js reads them (it listens to keyup on window).
    keysRef.current?.();
    keysRef.current = null;
    if (rtl && config.allowKeyboardControl !== false) {
      const swapped = new WeakSet<Event>();
      const onKeyup = (event: KeyboardEvent) => {
        if (swapped.has(event)) {
          return;
        }
        const key =
          event.key === "ArrowLeft"
            ? "ArrowRight"
            : event.key === "ArrowRight"
              ? "ArrowLeft"
              : null;
        if (!key) {
          return;
        }
        event.stopImmediatePropagation();
        const mirrored = new KeyboardEvent("keyup", { key });
        swapped.add(mirrored);
        window.dispatchEvent(mirrored);
      };
      window.addEventListener("keyup", onKeyup, true);
      keysRef.current = () =>
        window.removeEventListener("keyup", onKeyup, true);
    }

    // driver.js sets --driver-animation-duration on <body>; the stylesheet
    // reads the component's own variable, set here from the same option.
    document.body.style.setProperty(
      "--product-tour-duration",
      `${config.duration || 400}ms`,
    );
    instance.drive(index);
    if (instance.isActive()) {
      setActive(true);
    } else {
      finish();
    }
  }, []);

  const stop = React.useCallback(() => {
    instanceRef.current?.destroy();
  }, []);
  const moveNext = React.useCallback(() => {
    instanceRef.current?.moveNext();
  }, []);
  const movePrevious = React.useCallback(() => {
    instanceRef.current?.movePrevious();
  }, []);
  const moveTo = React.useCallback((index: number) => {
    instanceRef.current?.moveTo(index);
  }, []);
  const getDriver = React.useCallback(() => instanceRef.current, []);

  return {
    start,
    stop,
    moveNext,
    movePrevious,
    moveTo,
    active,
    stepIndex,
    getDriver,
  };
}

/**
 * A controlled product tour: shows while `open` is true and reports its own
 * end through `onOpenChange(false)`. Renders nothing itself; the overlay and
 * popover are appended to `<body>` by driver.js. To return focus to the
 * control that started the tour, start it from that control's click handler
 * (or use `useProductTour().start`).
 */
function ProductTour({
  open,
  onOpenChange,
  startIndex = 0,
  onClose,
  ...options
}: ProductTourProps) {
  const latest = React.useRef({ onOpenChange, startIndex });
  React.useEffect(() => {
    latest.current = { onOpenChange, startIndex };
  });

  const { start, stop, getDriver } = useProductTour({
    ...options,
    onClose: () => {
      onClose?.();
      latest.current.onOpenChange?.(false);
    },
  });

  React.useEffect(() => {
    const showing = getDriver()?.isActive() ?? false;
    if (open && !showing) {
      start(latest.current.startIndex);
    } else if (!open && showing) {
      stop();
    }
  }, [open, start, stop, getDriver]);

  return null;
}

export {
  ProductTour,
  type ProductTourControls,
  type ProductTourOptions,
  type ProductTourProps,
  type ProductTourStep,
  type ProductTourTarget,
  useProductTour,
};

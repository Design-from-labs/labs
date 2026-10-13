"use client";

import type {
  ComponentProps,
  CSSProperties,
  KeyboardEvent,
  ReactElement,
} from "react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  type AnimatingStep,
  AutoPlayController,
  computeStepWindow,
  StepAnimator,
  type StepProps,
  type StepperProps,
  type UseAutoPlayOptions,
  type UseAutoPlayReturn,
} from "./stepper-core";

// Upstream paths in these markers are relative to the package's source
// root (meta.json source.path).

// ---- upstream: src/styles/Stepper.css ----
// Upstream's stylesheet, rule for rule and in the same order. Each class is
// now one attribute selector of the same specificity (the container class is
// [data-slot="stepper"], the active-step class is [data-stepper-active], ...),
// so the cascade is unchanged. The themable --pill-* variables are read as
// --stepper-* with upstream's values as fallbacks, so the item's cssVars, a
// class or an inline style can set them. Left and right are logical (margins
// and the fill's start edge), and the window's translate changes sign in
// right-to-left. React 19 hoists this <style> into <head> once, however many
// steppers render; no global CSS import is needed.
const css = `
[data-slot="stepper"] {
  display: inline-flex;
  padding: 6px 10px;
  background: var(--stepper-container-bg, rgba(0, 0, 0, 0.04));
  border-radius: var(--stepper-container-radius, 999px);
  border: 1px solid var(--stepper-container-border, rgba(0, 0, 0, 0.06));
  overflow: hidden;
}

[data-slot="stepper-track"] {
  display: flex;
  align-items: center;
  margin-inline-start: calc(-1 * var(--stepper-gap, 6px));
  transform: translateX(calc(-1 * var(--stepper-window, 0px)));
  transition: transform var(--stepper-duration, 500ms)
    var(--stepper-easing, cubic-bezier(0.215, 0.61, 0.355, 1));
}

[data-slot="stepper-track"]:dir(rtl) {
  transform: translateX(var(--stepper-window, 0px));
}

[data-stepper-orientation="vertical"] [data-slot="stepper-track"] {
  flex-direction: column;
  margin-inline-start: 0;
  margin-top: calc(-1 * var(--stepper-gap, 6px));
  transform: translateY(calc(-1 * var(--stepper-window, 0px)));
}

[data-slot="stepper-step"] {
  position: relative;
  width: var(--stepper-dot-size, 8px);
  height: var(--stepper-dot-size, 8px);
  border-radius: 999px;
  border: none;
  padding: 0;
  cursor: pointer;
  background: var(--stepper-bg, rgba(0, 0, 0, 0.12));
  flex-shrink: 0;
  overflow: hidden;
  margin-inline-start: var(--stepper-gap, 6px);
  margin-top: 0;
  transform-origin: center center;
  transition:
    width var(--stepper-duration, 500ms)
      var(--stepper-easing, cubic-bezier(0.215, 0.61, 0.355, 1)),
    height var(--stepper-duration, 500ms)
      var(--stepper-easing, cubic-bezier(0.215, 0.61, 0.355, 1)),
    background var(--stepper-duration, 500ms)
      var(--stepper-easing, cubic-bezier(0.215, 0.61, 0.355, 1)),
    opacity var(--stepper-duration, 500ms)
      var(--stepper-easing, cubic-bezier(0.215, 0.61, 0.355, 1)),
    transform var(--stepper-duration, 500ms)
      var(--stepper-easing, cubic-bezier(0.215, 0.61, 0.355, 1)),
    margin-inline-start var(--stepper-duration, 500ms)
      var(--stepper-easing, cubic-bezier(0.215, 0.61, 0.355, 1)),
    margin-top var(--stepper-duration, 500ms)
      var(--stepper-easing, cubic-bezier(0.215, 0.61, 0.355, 1));
}

[data-stepper-orientation="vertical"] [data-slot="stepper-step"] {
  margin-inline-start: 0;
  margin-top: var(--stepper-gap, 6px);
}

[data-slot="stepper-step"]:focus-visible {
  outline: 2px solid var(--stepper-focus-ring, rgba(0, 0, 0, 0.3));
  outline-offset: 2px;
}

[data-stepper-active] {
  width: var(--stepper-active-width, 24px);
  background: var(--stepper-active-bg, rgba(0, 0, 0, 0.8));
}

[data-stepper-orientation="vertical"] [data-stepper-active] {
  width: var(--stepper-dot-size, 8px);
  height: var(--stepper-active-width, 24px);
}

/* Fill progress bar */
[data-slot="stepper-step"]::after {
  content: "";
  position: absolute;
  top: 0;
  inset-inline-start: 0;
  bottom: 0;
  width: 0;
  border-radius: inherit;
  background: var(--stepper-fill-bg, rgba(255, 255, 255, 0.45));
  pointer-events: none;
}

[data-stepper-orientation="vertical"] [data-slot="stepper-step"]::after {
  inset-inline-end: 0;
  bottom: auto;
  width: auto;
  height: 0;
}

[data-stepper-filling]::after {
  width: 100%;
  transition: width var(--stepper-fill-duration, 3000ms) linear;
}

[data-stepper-orientation="vertical"] [data-stepper-filling]::after {
  width: auto;
  height: 100%;
  transition: height var(--stepper-fill-duration, 3000ms) linear;
}

/* Enter: initial state (width:0, margin:0, invisible).
   The step renders at this state, browser paints, then the attribute
   is removed and CSS transitions animate to the natural size. */
[data-stepper-phase="entering"] {
  width: 0;
  margin-inline-start: 0;
  margin-top: 0;
  opacity: 0;
  transform: scale(0);
  transition-duration: 250ms;
}

[data-stepper-orientation="vertical"] [data-stepper-phase="entering"] {
  width: var(--stepper-dot-size, 8px);
  height: 0;
}

/* Exit: transition to collapsed state.
   After the transition, the step is removed from the DOM.
   Since width and margin are both 0, removal causes zero layout shift. */
[data-stepper-phase="exiting"] {
  width: 0;
  margin-inline-start: 0;
  margin-top: 0;
  opacity: 0;
  transform: scale(0);
  transition-duration: 250ms;
}

[data-stepper-orientation="vertical"] [data-stepper-phase="exiting"] {
  width: var(--stepper-dot-size, 8px);
  height: 0;
}

@media (prefers-reduced-motion: reduce) {
  [data-slot="stepper-step"],
  [data-slot="stepper-track"] {
    transition-duration: 0ms !important;
  }
  [data-stepper-filling]::after {
    transition-duration: 0ms !important;
  }
}

/* Labs: a step that is not a button (no onStepClick) is not clickable. */
[data-slot="stepper-step"]:not(button) {
  cursor: default;
}

/* Labs: more contrast on request. Inactive dots get a ring in the active
   color (3:1 or more against the container), and the focus ring uses it. */
@media (prefers-contrast: more) {
  [data-slot="stepper-step"] {
    box-shadow: inset 0 0 0 1px var(--stepper-active-bg, rgba(0, 0, 0, 0.8));
  }
  [data-slot="stepper-step"]:focus-visible {
    outline-color: var(--stepper-active-bg, rgba(0, 0, 0, 0.8));
  }
}

/* Labs: forced colors. System colors replace the translucent fills, and
   inactive dots are outlined so they do not vanish into the canvas. */
@media (forced-colors: active) {
  [data-slot="stepper"] {
    border-color: CanvasText;
  }
  [data-slot="stepper-step"] {
    forced-color-adjust: none;
    background: Canvas;
    box-shadow: inset 0 0 0 1px CanvasText;
  }
  [data-slot="stepper-step"]:focus-visible {
    outline-color: CanvasText;
  }
  [data-stepper-active] {
    background: Highlight;
    box-shadow: none;
  }
  [data-slot="stepper-step"]::after {
    background: Canvas;
    opacity: 0.5;
  }
}
`;

const defaultStepLabel = (index: number, count: number) =>
  `Step ${index + 1} of ${count}`;

// ---- upstream: src/react/hooks/useStepWindow.ts ----
function useStepWindow(
  count: number,
  active: number,
  maxVisible: number | undefined,
  orientation: "horizontal" | "vertical",
) {
  return useMemo(
    () => computeStepWindow(count, active, maxVisible, orientation),
    [count, active, maxVisible, orientation],
  );
}

// ---- upstream: src/react/hooks/useAnimatingSteps.ts ----
function useAnimatingSteps(count: number, _duration: number): AnimatingStep[] {
  const animatorRef = useRef<StepAnimator | null>(null);
  if (animatorRef.current === null) {
    animatorRef.current = new StepAnimator(count);
  }
  const animator = animatorRef.current;

  const [steps, setSteps] = useState<AnimatingStep[]>(() =>
    animator.getSteps(),
  );

  // Reconcile when count changes — runs before paint so no flash
  useLayoutEffect(() => {
    animator.reconcile(count);
    setSteps(animator.getSteps());
  }, [count, animator]);

  // Promote entering → stable after browser paints the width:0 state
  const hasEntering = steps.some((s) => s.phase === "entering");
  useEffect(() => {
    if (!hasEntering) return;
    let raf2: number;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        animator.promoteEntering();
        setSteps(animator.getSteps());
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [hasEntering, animator]);

  // Remove exiting steps from DOM after their transitions finish
  const exitingCount = steps.filter((s) => s.phase === "exiting").length;
  useEffect(() => {
    if (exitingCount === 0) return;
    const timer = setTimeout(() => {
      animator.removeExiting();
      setSteps(animator.getSteps());
    }, 300);
    return () => clearTimeout(timer);
  }, [exitingCount, animator]);

  return steps;
}

// ---- upstream: src/react/Step.tsx ----
// Labs: a native button with aria-current="step" and a "Step 2 of 5" name
// (upstream: role="tab" without tab panels); a step of an indicator without
// onStepClick is a plain span, since it does nothing when pressed.
export function Step({
  index,
  isActive,
  phase,
  transitionDuration,
  filling,
  fillDuration,
  onClick,
  label,
}: StepProps): ReactElement {
  const style: CSSProperties = {
    "--stepper-duration": `${transitionDuration}ms`,
  } as CSSProperties;

  if (isActive && filling && fillDuration) {
    (style as Record<string, string>)["--stepper-fill-duration"] =
      `${fillDuration}ms`;
  }

  const state = {
    "data-slot": "stepper-step",
    "data-stepper-active": isActive ? "" : undefined,
    "data-stepper-filling": isActive && filling ? "" : undefined,
    "data-stepper-phase": phase === "stable" ? undefined : phase,
    "data-stepper-index": index,
  };

  if (!onClick) {
    return <span {...state} style={style} aria-hidden="true" />;
  }

  const exiting = phase === "exiting";
  return (
    <button
      type="button"
      {...state}
      style={style}
      onClick={exiting ? undefined : onClick}
      aria-label={label}
      aria-current={isActive ? "step" : undefined}
      aria-hidden={exiting ? true : undefined}
      tabIndex={isActive && !exiting ? 0 : -1}
    />
  );
}

// ---- upstream: src/react/Stepper.tsx ----
/**
 * A row (or column) of dots whose active step stretches into a pill, with an
 * optional autoplay fill and windowing for long flows. Controlled: pass
 * `active` and update it from `onStepClick`.
 */
export function Stepper({
  count,
  active,
  onStepClick,
  orientation = "horizontal",
  maxVisible,
  transitionDuration = 500,
  easing,
  className,
  filling,
  fillDuration,
  getStepLabel = defaultStepLabel,
  style,
  onKeyDown,
  "aria-label": ariaLabel = "Progress steps",
  ...props
}: StepperProps &
  Omit<
    ComponentProps<"div">,
    keyof StepperProps | "children" | "role"
  >): ReactElement {
  const { offset, containerSize } = useStepWindow(
    count,
    active,
    maxVisible,
    orientation,
  );

  const animatingSteps = useAnimatingSteps(count, transitionDuration);

  const sizeStyle: CSSProperties = {};
  if (containerSize != null) {
    if (orientation === "vertical") {
      sizeStyle.height = containerSize;
    } else {
      sizeStyle.width = containerSize;
    }
  }

  // Labs: arrow keys move between steps (selection follows focus), Home and
  // End jump to the ends; only the active step is in the tab order.
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || !onStepClick) return;
    const from = Number(
      (event.target as HTMLElement)
        .closest("[data-stepper-index]")
        ?.getAttribute("data-stepper-index") ?? active,
    );
    const vertical = orientation === "vertical";
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    const forward = rtl ? "ArrowLeft" : "ArrowRight";
    const back = rtl ? "ArrowRight" : "ArrowLeft";
    let next: number | null = null;
    if (event.key === "Home") next = 0;
    else if (event.key === "End") next = count - 1;
    else if (event.key === (vertical ? "ArrowDown" : forward)) next = from + 1;
    else if (event.key === (vertical ? "ArrowUp" : back)) next = from - 1;
    if (next === null) return;
    event.preventDefault();
    next = Math.max(0, Math.min(count - 1, next));
    if (next === from) return;
    onStepClick(next);
    event.currentTarget
      .querySelector<HTMLElement>(
        `button[data-stepper-index="${next}"]:not([data-stepper-phase="exiting"])`,
      )
      // The container clips its overflow; scrolling it would undo the window.
      ?.focus({ preventScroll: true });
  };

  const container = {
    ...props,
    "data-slot": "stepper",
    "data-stepper-orientation":
      orientation === "vertical" ? "vertical" : undefined,
    className,
    style: {
      "--stepper-duration": `${transitionDuration}ms`,
      ...(easing && { "--stepper-easing": easing }),
      ...sizeStyle,
      ...style,
    } as CSSProperties,
  };

  const track = (
    <div
      data-slot="stepper-track"
      style={{ "--stepper-window": `${offset}px` } as CSSProperties}
    >
      {animatingSteps.map((step) => (
        <Step
          key={step.key}
          index={step.index}
          isActive={step.index === active}
          phase={step.phase}
          transitionDuration={transitionDuration}
          filling={step.index === active && filling}
          fillDuration={fillDuration}
          onClick={onStepClick ? () => onStepClick(step.index) : undefined}
          label={getStepLabel(step.index, count)}
        />
      ))}
    </div>
  );

  return (
    <>
      <style href="designfrom-stepper" precedence="default">
        {css}
      </style>
      {/* Labs: a group of step buttons, or a labelled image when the steps
          only indicate progress (upstream: role="tablist" either way). */}
      {onStepClick ? (
        // biome-ignore lint/a11y/useSemanticElements: a fieldset groups form fields, and its default border, padding and min-width would change the stepper; these are navigation buttons.
        <div
          {...container}
          role="group"
          aria-label={ariaLabel}
          onKeyDown={handleKeyDown}
        >
          {track}
        </div>
      ) : (
        <div
          {...container}
          onKeyDown={onKeyDown}
          role="img"
          aria-label={`${ariaLabel}: ${getStepLabel(active, count)}`}
        >
          {track}
        </div>
      )}
    </>
  );
}

// ---- upstream: src/react/hooks/useAutoPlay.ts ----
/**
 * Advances `active` every `stepDuration` while playing. Pass the returned
 * `filling` and `fillDuration` to <Stepper>, and render a control that calls
 * `toggle` (WCAG 2.2.2).
 */
export function useAutoPlay({
  count,
  active,
  onStepChange,
  stepDuration = 3000,
  loop = true,
  enabled = true,
  autoStart = false,
  paused = false,
}: UseAutoPlayOptions): UseAutoPlayReturn {
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controllerRef = useRef<AutoPlayController | null>(null);
  if (!controllerRef.current) {
    controllerRef.current = new AutoPlayController({ stepDuration, loop });
  }
  controllerRef.current.stepDuration = stepDuration;
  controllerRef.current.loop = loop;

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const toggle = useCallback(() => setPlaying((p) => !p), []);

  // Labs: start on mount when asked, unless the user prefers reduced motion
  // (read live in the effect, so it holds during hydration too).
  useEffect(() => {
    if (!autoStart) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    setPlaying(true);
  }, [autoStart]);

  // Stop playback when disabled
  useEffect(() => {
    if (!enabled) {
      setPlaying(false);
      clearTimer();
    }
  }, [enabled, clearTimer]);

  // Schedule next step when playing
  useEffect(() => {
    if (!playing || !enabled || paused) {
      clearTimer();
      return;
    }

    timerRef.current = setTimeout(() => {
      const nextStep =
        controllerRef.current?.computeNext(active, count) ?? null;
      if (nextStep !== null) {
        onStepChange(nextStep);
      } else {
        setPlaying(false);
      }
    }, stepDuration);

    return clearTimer;
  }, [
    playing,
    enabled,
    paused,
    active,
    count,
    stepDuration,
    onStepChange,
    clearTimer,
  ]);

  const isActive = playing && enabled;

  return {
    playing: isActive,
    toggle,
    filling: isActive && !paused,
    fillDuration: stepDuration,
  };
}

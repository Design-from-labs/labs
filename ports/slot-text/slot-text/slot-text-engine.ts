import {
  TUNING,
  addMissingCharacterSlots,
  canRenderSlotLayout,
  getCharacterSlots,
  isSlotLayoutReady,
  measureChangedSlots,
  measureCharacterHeight,
  prepareSlotAnimation,
  renderPlainText,
  renderCharacterSlots,
  resolveAnimationOptions,
  scheduleSlotAnimation,
  segmentText,
  type RollBy,
} from "./slot-text-core";

// ---- upstream: src/slotText.ts ----
const { chromatic: chromaticTuning, lifecycle } = TUNING;

/**
 * Browser-only text-roll animation. Each character or word owns one clipped
 * slot; the previous face rolls out while the next face rolls in.
 */
/** Options shared by the low-level animation and all framework adapters. */
export interface SlotOptions {
  /** "down" rolls glyphs downward (enter from top); "up" rolls upward. */
  direction?: "up" | "down";
  /** Roll each user-perceived character or each word. Default "character". */
  rollBy?: RollBy;
  /** Per-segment stagger in ms (default 45). */
  stagger?: number;
  /** Slide duration per segment in ms (default 300). */
  duration?: number;
  /** How long the incoming glyph trails the outgoing one, in ms (default 50). */
  exitOffset?: number;
  /** Easing — defaults to a springy, overshooting "back" curve. */
  easing?: string;
  /**
   * Per-segment personality: 0 makes every segment move identically; 1 adds
   * the strongest timing variation and tilt. Default 0.6.
   */
  bounce?: number;
  /**
   * Incoming glyph tint. Pass one CSS color, or return a color for each
   * `(segmentIndex, segmentCount)` pair.
   */
  color?: string | ((segmentIndex: number, segmentCount: number) => string);
  /** Tint fade duration in ms (default 280). */
  colorFade?: number;
  /**
   * Keep segments that are identical at the same index static. Disable this
   * when differently sized strings are not positionally aligned.
   */
  skipUnchanged?: boolean;
  /**
   * true interrupts the running roll. false lets it finish, then plays only
   * the latest queued target. Default true.
   */
  interrupt?: boolean;
}

export interface ChromaticOptions {
  /** Starting hue in degrees. Default 0. */
  from?: number;
  /** Hue distance from first to last roll segment. Default 320 degrees. */
  spread?: number;
  /** HSL saturation percentage. Default 92. */
  saturation?: number;
  /** HSL lightness percentage. Default 60. */
  lightness?: number;
}

/** Build a color function that sweeps a hue range across the roll segments. */
export function chromatic({
  from = chromaticTuning.hueStartDegrees,
  spread = chromaticTuning.hueSpreadDegrees,
  saturation = chromaticTuning.saturationPercent,
  lightness = chromaticTuning.lightnessPercent,
}: ChromaticOptions = {}) {
  return (segmentIndex: number, segmentCount: number) => {
    const lastSegmentIndex = segmentCount - 1;
    const progress =
      segmentCount <= 1 ? 0 : segmentIndex / lastSegmentIndex;
    const hueDegrees =
      (from + progress * spread) % chromaticTuning.fullHueRotationDegrees;
    return `hsl(${hueDegrees} ${saturation}% ${lightness}%)`;
  };
}

interface AnimationState {
  timerIds: number[];
  targetText: string;
  rollBy: RollBy;
  pendingAnimation?: { text: string; options: SlotOptions };
}

const animationStates = new WeakMap<HTMLElement, AnimationState>();
const initializedContainers = new WeakSet<HTMLElement>();

function cancelRunningAnimation(container: HTMLElement) {
  const animationState = animationStates.get(container);
  if (!animationState) return undefined;
  animationState.timerIds.forEach((timerId) => window.clearTimeout(timerId));
  animationStates.delete(container);
  return animationState;
}

/** Render settled text, falling back to plain text until the CSS is ready. */
export function renderTextWithCssFallback(
  container: HTMLElement,
  text: string,
  rollBy: RollBy = "character",
) {
  initializedContainers.add(container);
  if (canRenderSlotLayout()) renderCharacterSlots(container, text, rollBy);
  else renderPlainText(container, text);
}

function finishRunningAnimationImmediately(container: HTMLElement) {
  const animationState = cancelRunningAnimation(container);
  if (animationState) {
    renderTextWithCssFallback(
      container,
      animationState.targetText,
      animationState.rollBy,
    );
  }
}

/** Build slot markup immediately and cancel any animation that owns it. */
export function buildSlotText(
  container: HTMLElement,
  text: string,
  { rollBy = "character" }: Pick<SlotOptions, "rollBy"> = {},
) {
  cancelRunningAnimation(container);
  initializedContainers.add(container);
  renderCharacterSlots(container, text, rollBy);
}

function scheduleAnimationTask(
  animationState: AnimationState,
  callback: () => void,
  delayMs: number,
) {
  const timerId = window.setTimeout(callback, delayMs);
  animationState.timerIds.push(timerId);
}

export function animateSlotText(
  container: HTMLElement,
  targetText: string,
  options: SlotOptions = {},
) {
  const resolvedOptions = resolveAnimationOptions(options);
  const runningAnimation = animationStates.get(container);

  if (runningAnimation && !resolvedOptions.interrupt) {
    runningAnimation.pendingAnimation =
      targetText === runningAnimation.targetText
        ? undefined
        : { text: targetText, options };
    return;
  }

  finishRunningAnimationImmediately(container);

  let characterSlots = getCharacterSlots(container);
  if (characterSlots.length === 0) {
    if (!initializedContainers.has(container)) {
      renderTextWithCssFallback(container, targetText, resolvedOptions.rollBy);
      return;
    }

    if (!canRenderSlotLayout()) {
      renderPlainText(container, targetText);
      return;
    }

    renderCharacterSlots(
      container,
      container.textContent ?? "",
      resolvedOptions.rollBy,
    );
    characterSlots = getCharacterSlots(container);
  }

  const firstCharacterSlot = characterSlots[0];
  if (firstCharacterSlot && !isSlotLayoutReady(firstCharacterSlot)) {
    renderPlainText(container, targetText);
    return;
  }

  let currentSegments = characterSlots.map((slot) => slot.dataset.char ?? "");
  const currentText = currentSegments.join("");
  const regroupedCurrentSegments = segmentText(
    currentText,
    resolvedOptions.rollBy,
  );
  if (
    currentSegments.length !== regroupedCurrentSegments.length ||
    currentSegments.some(
      (segment, index) => segment !== regroupedCurrentSegments[index],
    )
  ) {
    renderCharacterSlots(container, currentText, resolvedOptions.rollBy);
    characterSlots = getCharacterSlots(container);
    currentSegments = regroupedCurrentSegments;
  }

  const targetSegments = segmentText(targetText, resolvedOptions.rollBy);
  if (
    !resolvedOptions.interrupt &&
    currentSegments.length === targetSegments.length &&
    currentSegments.every(
      (segment, index) => segment === targetSegments[index],
    )
  ) {
    return;
  }

  const requiredSlotCount = Math.max(currentSegments.length, targetSegments.length);
  addMissingCharacterSlots(container, characterSlots, requiredSlotCount);

  const containerStyle = getComputedStyle(container);
  const characterHeight = measureCharacterHeight(container, characterSlots, containerStyle);
  const restingColor = resolvedOptions.color ? containerStyle.color : "";
  const changedSlotMeasurements = measureChangedSlots(
    characterSlots,
    currentSegments,
    targetSegments,
    resolvedOptions.skipUnchanged,
  );

  if (changedSlotMeasurements.length === 0) {
    renderCharacterSlots(container, targetText, resolvedOptions.rollBy);
    return;
  }

  const animationState: AnimationState = {
    timerIds: [],
    targetText,
    rollBy: resolvedOptions.rollBy,
  };
  animationStates.set(container, animationState);
  const preparedSlotAnimations = changedSlotMeasurements.map((measurement) =>
    prepareSlotAnimation(
      measurement,
      targetSegments.length,
      characterHeight,
      resolvedOptions,
    ),
  );

  // Commit every start style with one layout flush instead of one per glyph.
  void container.offsetWidth;
  preparedSlotAnimations.forEach((preparedSlotAnimation) =>
    scheduleSlotAnimation(
      preparedSlotAnimation,
      characterHeight,
      restingColor,
      resolvedOptions,
      (callback, delayMs) =>
        scheduleAnimationTask(animationState, callback, delayMs),
    ),
  );

  const completionDelayMs =
    Math.max(...preparedSlotAnimations.map(({ completionTimeMs }) => completionTimeMs)) +
    lifecycle.completionBufferMs;
  scheduleAnimationTask(animationState, () => {
    if (animationStates.get(container) !== animationState) return;
    const pendingAnimation = animationState.pendingAnimation;
    animationStates.delete(container);
    renderTextWithCssFallback(container, targetText, resolvedOptions.rollBy);
    if (pendingAnimation) {
      animateSlotText(container, pendingAnimation.text, pendingAnimation.options);
    }
  }, completionDelayMs);
}

export function clearSlotText(container: HTMLElement, text = "") {
  cancelRunningAnimation(container);
  initializedContainers.delete(container);
  renderPlainText(container, text);
}

// ---- upstream: src/index.ts ----
// The re-exports of src/slotText.ts are the declarations above; the imports
// of TUNING and the slotText helpers are at the top of this file.
export type { RollBy } from "./slot-text-core";

export interface FlashOptions {
  /** How long the flash text stays before rolling back, in ms (default 1400). */
  revertAfter?: number;
  /** Roll options for the flash text rolling in. */
  enter?: SlotOptions;
  /** Roll options for the original text rolling back. */
  exit?: SlotOptions;
}

export interface SlotTextController {
  readonly element: HTMLElement;
  /** The text currently displayed (the flash text while a flash is showing). */
  readonly value: string;
  /** Roll to new text. Cancels any pending flash revert. */
  set(text: string, options?: SlotOptions): void;
  /**
   * Roll to temporary text, then roll back automatically — the classic
   * Copy → Copied → Copy button in one call. Spam-safe: repeat flashes restart
   * the revert timer instead of queuing extra rolls.
   */
  flash(text: string, options?: FlashOptions): void;
  destroy(): void;
}

/**
 * Create a text-roll controller for one element.
 *
 * Import `slot-text/style.css` once in your app, then call:
 *
 *   const label = slotText(buttonLabel, "Copy");
 *   label.set("Copied", { direction: "up" });
 *   label.flash("Copied", { revertAfter: 1400 }); // auto-reverts to "Copy"
 */
export function slotText(
  element: HTMLElement,
  initialText: string,
  defaultOptions: SlotOptions = {},
): SlotTextController {
  let currentValue = initialText;
  let revertTimerId: number | undefined;
  let restingText: string | undefined;
  renderTextWithCssFallback(
    element,
    initialText,
    defaultOptions.rollBy ?? "character",
  );
  const animateWithoutInterrupt = (text: string, overrides?: SlotOptions) =>
    animateSlotText(element, text, {
      ...defaultOptions,
      interrupt: false,
      ...overrides,
    });

  return {
    element,
    get value() {
      return currentValue;
    },
    set(text, optionOverrides = {}) {
      // An explicit set wins over a pending flash revert.
      clearTimeout(revertTimerId);
      restingText = undefined;
      currentValue = text;
      animateSlotText(element, text, {
        ...defaultOptions,
        ...optionOverrides,
      });
    },
    flash(
      text,
      {
        revertAfter = TUNING.lifecycle.flashRevertDelayMs,
        enter: enterOptions,
        exit: exitOptions,
      } = {},
    ) {
      // Capture the resting text only on the first flash of a burst, so a
      // flash-during-flash still reverts to the original label.
      if (restingText === undefined) {
        restingText = currentValue;
      }

      // Flashes default to non-interrupting rolls: spam-friendly, no mid-roll
      // cutoffs. Callers can still override via `enter`/`exit`.
      currentValue = text;
      animateWithoutInterrupt(text, enterOptions);

      // Restart the revert timer: one revert per burst, after the last flash.
      clearTimeout(revertTimerId);
      revertTimerId = window.setTimeout(() => {
        const originalText = restingText!;
        restingText = undefined;
        revertTimerId = undefined;
        currentValue = originalText;
        animateWithoutInterrupt(originalText, exitOptions);
      }, revertAfter);
    },
    destroy() {
      clearTimeout(revertTimerId);
      clearSlotText(element, currentValue);
    },
  };
}

// ---- upstream: style.css ----
// The stylesheet, verbatim. `SlotText` renders it once as a hoisted
// `<style>` (React 19); with the vanilla API, add it to the page yourself.
export const slotTextCss = `.slot-text {
  display: inline-flex;
  white-space: pre;
  align-items: baseline;
}

.char-slot {
  position: relative;
  display: inline-flex;
  /* Cells must never flex-shrink. When a cell's overflow stops being visible
     (e.g. .is-resizing), its automatic minimum size drops to 0, and a
     width-constrained line would crush those cells into overlapping slivers
     instead of letting the row overflow like it does at rest. */
  flex: none;
  justify-content: center;
  align-items: baseline;
  /* Clip only vertically: the roll needs a top/bottom mask, but glyph side
     bearings, kerning overhang and the settle tilt must stay visible so
     letters never look cropped. (overflow: hidden is the legacy fallback.) */
  overflow: hidden;
  overflow-x: visible;
  overflow-y: clip;
  line-height: 1.3;
}

/* Cells appearing from or collapsing to empty change width drastically, so
   clip them on both axes while they resize — otherwise their glyphs spill
   out of the shrinking cell and stack up over the neighbours. */
.char-slot.is-resizing {
  overflow-x: clip;
}

.char-sizer {
  visibility: hidden;
  white-space: pre;
}

.char-face {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  white-space: pre;
  will-change: transform;
}
`;

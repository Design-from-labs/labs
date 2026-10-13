import type { SlotOptions } from "./slot-text-engine";

// ---- upstream: src/constants.ts ----
export const TUNING = {
  animation: {
    direction: "down",
    rollBy: "character",
    stagger: 45,
    duration: 300,
    exitOffset: 50,
    easing: "cubic-bezier(0.34, 1.56, 0.64, 1)",
    bounce: 0.6,
    colorFade: 280,
    skipUnchanged: true,
    interrupt: true,
  },
  variation: {
    indexFrequency: 12.9898,
    channelFrequency: 78.233,
    seedScale: 43758.5453,
    durationChannel: 1,
    staggerChannel: 2,
    tiltChannel: 3,
  },
  glyph: {
    tailDurationMultiplier: 0.75,
    durationVariationStrength: 0.45,
    tailStaggerStartMultiplier: 0.5,
    tailStaggerStepMultiplier: 0.25,
    staggerVariationStrength: 0.25,
    maximumTiltDegrees: 5,
    tiltDecimalPlaces: 2,
  },
  width: {
    tailCollapseDelayMultiplier: 0.55,
    tailCollapseDurationMultiplier: 0.6,
    newSlotExpansionDurationMultiplier: 0.45,
    minimumTransitionMs: 140,
    resizeEasing: "cubic-bezier(0.2, 0, 0, 1)",
    minimumVisibleChangePx: 0.5,
  },
  layout: {
    probeOffscreenPositionPx: -9999,
    fallbackLineHeightMultiplier: 1.3,
    fallbackCharacterHeightPx: 18,
    characterTransformOrigin: "50% 50%",
    characterRestTransform: "translateY(0) rotate(0deg)",
  },
  chromatic: {
    hueStartDegrees: 0,
    hueSpreadDegrees: 320,
    saturationPercent: 92,
    lightnessPercent: 60,
    fullHueRotationDegrees: 360,
  },
  lifecycle: {
    completionBufferMs: 80,
    flashRevertDelayMs: 1400,
  },
} as const;

// ---- upstream: src/text.ts ----
const NBSP = "\u00A0";

export type RollBy = "character" | "word";

const segmenters = Intl.Segmenter
  ? {
      character: new Intl.Segmenter(undefined, { granularity: "grapheme" }),
      word: new Intl.Segmenter(undefined, { granularity: "word" }),
    }
  : undefined;

/** Split text into roll units, with dependency-free fallbacks. */
export function segmentText(text: string, rollBy: RollBy): string[] {
  if (segmenters) {
    return Array.from(segmenters[rollBy].segment(text), ({ segment }) => segment);
  }

  return rollBy === "word" ? (text.match(/\s+|\S+/g) ?? []) : Array.from(text);
}

/** Preserve regular spaces inside individually measured glyph cells. */
export function getVisibleSegmentText(segment: string) {
  return segment === " " ? NBSP : segment;
}

// ---- upstream: src/timing.ts ----
const { animation, glyph, variation, width } = TUNING;

export interface ResolvedSlotOptions {
  direction: "up" | "down";
  rollBy: "character" | "word";
  stagger: number;
  duration: number;
  exitOffset: number;
  easing: string;
  bounce: number;
  color?: string | ((segmentIndex: number, segmentCount: number) => string);
  colorFade: number;
  skipUnchanged: boolean;
  interrupt: boolean;
}

export interface GlyphTiming {
  durationMs: number;
  startDelayMs: number;
  startingTiltDegrees: number;
}

export interface WidthTiming {
  durationMs: number;
  startDelayMs: number;
}

export function resolveAnimationOptions(
  options: SlotOptions,
): ResolvedSlotOptions {
  return {
    direction: options.direction ?? animation.direction,
    rollBy: options.rollBy ?? animation.rollBy,
    stagger: options.stagger ?? animation.stagger,
    duration: options.duration ?? animation.duration,
    exitOffset: options.exitOffset ?? animation.exitOffset,
    easing: options.easing ?? animation.easing,
    bounce: options.bounce ?? animation.bounce,
    color: options.color,
    colorFade: options.colorFade ?? animation.colorFade,
    skipUnchanged: options.skipUnchanged ?? animation.skipUnchanged,
    interrupt: options.interrupt ?? animation.interrupt,
  };
}

/** Return stable pseudo-random variation in the range -1 to 1. */
function getDeterministicVariation(
  segmentIndex: number,
  variationChannel: number,
) {
  // Start at one so the first grapheme never uses a zero seed.
  const oneBasedSegmentIndex = segmentIndex + 1;
  const pseudoRandomSeed =
    Math.sin(
      oneBasedSegmentIndex * variation.indexFrequency +
        variationChannel * variation.channelFrequency,
    ) * variation.seedScale;
  const zeroToOne = pseudoRandomSeed - Math.floor(pseudoRandomSeed);
  // Stretch 0..1 to 0..2, then center it around zero to get -1..1.
  return zeroToOne * 2 - 1;
}

export function calculateGlyphTiming(
  segmentIndex: number,
  targetSegmentCount: number,
  isTrailingSlot: boolean,
  options: Pick<
    ResolvedSlotOptions,
    "duration" | "stagger" | "bounce"
  >,
): GlyphTiming {
  const { duration, stagger, bounce } = options;
  const variationMultiplier = (strength: number, channel: number) =>
    1 + bounce * strength * getDeterministicVariation(segmentIndex, channel);
  const durationMs = Math.round(
    duration *
      (isTrailingSlot ? glyph.tailDurationMultiplier : 1) *
      variationMultiplier(glyph.durationVariationStrength, variation.durationChannel),
  );
  const staggerPosition = isTrailingSlot
    ? targetSegmentCount * glyph.tailStaggerStartMultiplier +
      (segmentIndex - targetSegmentCount) *
        glyph.tailStaggerStepMultiplier
    : segmentIndex;
  const startingTiltDegrees = Number(
    (
      bounce *
      glyph.maximumTiltDegrees *
      getDeterministicVariation(
        segmentIndex,
        variation.tiltChannel,
      )
    ).toFixed(glyph.tiltDecimalPlaces),
  );

  return {
    durationMs,
    startDelayMs: Math.round(
      staggerPosition *
        stagger *
        variationMultiplier(glyph.staggerVariationStrength, variation.staggerChannel),
    ),
    startingTiltDegrees,
  };
}

export function calculateWidthTiming(
  currentSegment: string,
  targetSegment: string,
  timing: GlyphTiming,
): WidthTiming {
  const scaledDuration = (multiplier: number) =>
    Math.max(
      width.minimumTransitionMs,
      Math.round(timing.durationMs * multiplier),
    );

  if (targetSegment === "") {
    return {
      startDelayMs:
        timing.startDelayMs +
        Math.round(timing.durationMs * width.tailCollapseDelayMultiplier),
      durationMs: scaledDuration(width.tailCollapseDurationMultiplier),
    };
  }

  if (currentSegment === "") {
    return {
      startDelayMs: timing.startDelayMs,
      durationMs: scaledDuration(width.newSlotExpansionDurationMultiplier),
    };
  }

  return {
    startDelayMs: timing.startDelayMs,
    durationMs: timing.durationMs,
  };
}

// ---- upstream: src/dom.ts ----
const CSS_PROBE_TEXT = "x";
// `width` (TUNING.width) is declared by the timing module above.
const { layout } = TUNING;
let cachedSlotLayoutReady = false;

/** Internal test seam; not re-exported from the package. */
export function resetSlotLayoutCache() {
  cachedSlotLayoutReady = false;
}

interface CharacterSlotElements {
  slot: HTMLElement;
  sizer: HTMLElement;
  previousFace: HTMLElement | null;
}

interface SlotMeasurement extends CharacterSlotElements {
  index: number;
  currentSegment: string;
  targetSegment: string;
  currentWidth: number;
  targetWidth: number;
  widthWillChange: boolean;
}

function createCharacterFace(segment: string) {
  const face = document.createElement("span");
  face.className = "char-face";
  face.textContent = getVisibleSegmentText(segment);
  return face;
}

function createCharacterSlot(segment: string) {
  const slot = document.createElement("span");
  slot.className = "char-slot";
  slot.dataset.char = segment;

  const sizer = document.createElement("span");
  sizer.className = "char-sizer";
  sizer.textContent = getVisibleSegmentText(segment);

  slot.append(sizer, createCharacterFace(segment));
  return slot;
}

/** Render slot markup without touching animation lifecycle state. */
export function renderCharacterSlots(
  container: HTMLElement,
  text: string,
  rollBy: RollBy = "character",
) {
  container.classList.add("slot-text");
  container.replaceChildren(
    ...segmentText(text, rollBy).map(createCharacterSlot),
  );
}

export function renderPlainText(container: HTMLElement, text: string) {
  container.classList.remove("slot-text");
  container.textContent = text;
}

export function getCharacterSlots(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>(".char-slot"),
  );
}

export function isSlotLayoutReady(slot: HTMLElement | undefined) {
  if (!slot) return false;
  const face = slot.querySelector<HTMLElement>(".char-face");
  if (!face) return false;

  const slotStyle = getComputedStyle(slot);
  const faceStyle = getComputedStyle(face);
  const slotIsFlex =
    slotStyle.display === "inline-flex" || slotStyle.display === "flex";

  return (
    slotStyle.position === "relative" &&
    slotIsFlex &&
    faceStyle.position === "absolute"
  );
}

/**
 * Check the globally imported stylesheet contract. A successful check is
 * cached because an applied stylesheet does not normally disappear. A failed
 * check is retried so asynchronously loaded CSS can upgrade plain text later.
 */
export function canRenderSlotLayout() {
  if (cachedSlotLayoutReady) return true;
  if (!document.body) return false;

  const cssProbe = document.createElement("span");
  cssProbe.setAttribute("aria-hidden", "true");
  cssProbe.style.cssText =
    `position:absolute;left:${layout.probeOffscreenPositionPx}px;` +
    `top:${layout.probeOffscreenPositionPx}px;visibility:hidden;pointer-events:none;`;
  renderCharacterSlots(cssProbe, CSS_PROBE_TEXT);
  document.body.appendChild(cssProbe);
  const firstProbeSlot = getCharacterSlots(cssProbe)[0];
  cachedSlotLayoutReady = isSlotLayoutReady(firstProbeSlot);
  cssProbe.remove();
  return cachedSlotLayoutReady;
}

export function addMissingCharacterSlots(
  container: HTMLElement,
  characterSlots: HTMLElement[],
  requiredSlotCount: number,
) {
  for (let index = characterSlots.length; index < requiredSlotCount; index++) {
    const slot = createCharacterSlot("");
    container.appendChild(slot);
    characterSlots.push(slot);
  }
}

export function measureCharacterHeight(
  container: HTMLElement,
  characterSlots: HTMLElement[],
  containerStyle: CSSStyleDeclaration,
) {
  const firstCharacterSlot = characterSlots[0];
  const sampleSlot =
    characterSlots.find((slot) => (slot.dataset.char ?? "") !== "") ??
    firstCharacterSlot;

  return (
    Math.ceil(
      sampleSlot?.getBoundingClientRect().height ||
        sampleSlot?.offsetHeight ||
        container.getBoundingClientRect().height ||
        parseFloat(containerStyle.lineHeight) ||
        0,
    ) ||
    Math.ceil(
      parseFloat(containerStyle.fontSize) *
        layout.fallbackLineHeightMultiplier,
    ) ||
    layout.fallbackCharacterHeightPx
  );
}

/** Measure all old widths, apply all target sizers, then read all new widths. */
export function measureChangedSlots(
  characterSlots: HTMLElement[],
  currentSegments: string[],
  targetSegments: string[],
  skipUnchanged: boolean,
): SlotMeasurement[] {
  const changedSlots: Array<
    CharacterSlotElements & {
      index: number;
      currentSegment: string;
      targetSegment: string;
      currentWidth: number;
    }
  > = [];

  for (let index = 0; index < characterSlots.length; index++) {
    const currentSegment = currentSegments[index] ?? "";
    const targetSegment = targetSegments[index] ?? "";
    if (
      currentSegment === targetSegment &&
      (skipUnchanged || currentSegment === "")
    ) {
      continue;
    }

    const slot = characterSlots[index];
    const sizer = slot.querySelector<HTMLElement>(".char-sizer")!;
    changedSlots.push({
      index,
      slot,
      sizer,
      previousFace: slot.querySelector<HTMLElement>(".char-face"),
      currentSegment,
      targetSegment,
      currentWidth: slot.getBoundingClientRect().width,
    });
  }

  changedSlots.forEach(({ sizer, targetSegment }) => {
    sizer.textContent = getVisibleSegmentText(targetSegment);
  });

  return changedSlots.map((changedSlot) => {
    const targetWidth = changedSlot.sizer.getBoundingClientRect().width;
    return {
      ...changedSlot,
      targetWidth,
      widthWillChange:
        Math.abs(targetWidth - changedSlot.currentWidth) >
        width.minimumVisibleChangePx,
    };
  });
}

export function prepareSlotAnimation(
  measurement: SlotMeasurement,
  targetSegmentCount: number,
  characterHeight: number,
  options: ResolvedSlotOptions,
) {
  const { index, slot, currentSegment, targetSegment } = measurement;
  const { currentWidth, widthWillChange } = measurement;
  const timing = calculateGlyphTiming(
    index,
    targetSegmentCount,
    targetSegment === "",
    options,
  );
  const widthTiming = calculateWidthTiming(
    currentSegment,
    targetSegment,
    timing,
  );
  const incomingOffsetY =
    options.direction === "down" ? -characterHeight : characterHeight;
  const incomingColor =
    typeof options.color === "function"
      ? options.color(index, targetSegmentCount)
      : options.color;

  if (widthWillChange) slot.style.width = `${currentWidth}px`;
  if (currentSegment === "" || targetSegment === "") {
    slot.classList.add("is-resizing");
  }

  const incomingFace = createCharacterFace(targetSegment);
  incomingFace.style.transformOrigin = layout.characterTransformOrigin;
  incomingFace.style.transform =
    `translateY(${incomingOffsetY}px) ` +
    `rotate(${timing.startingTiltDegrees}deg)`;
  if (incomingColor) incomingFace.style.color = incomingColor;
  slot.appendChild(incomingFace);

  const widthCompletionTimeMs = widthWillChange
    ? widthTiming.startDelayMs + widthTiming.durationMs
    : 0;
  const glyphCompletionTimeMs =
    timing.startDelayMs +
    options.exitOffset +
    timing.durationMs +
    (options.color ? options.colorFade : 0);

  return {
    measurement,
    timing,
    widthTiming,
    incomingFace,
    completionTimeMs: Math.max(widthCompletionTimeMs, glyphCompletionTimeMs),
  };
}

export function scheduleSlotAnimation(
  preparedAnimation: ReturnType<typeof prepareSlotAnimation>,
  characterHeight: number,
  restingColor: string,
  options: ResolvedSlotOptions,
  scheduleTask: (callback: () => void, delayMs: number) => void,
) {
  const { measurement, timing, widthTiming, incomingFace } = preparedAnimation;
  const { slot, previousFace, targetWidth, widthWillChange } = measurement;
  const outgoingOffsetY =
    options.direction === "down" ? characterHeight : -characterHeight;
  const rollTransition =
    `transform ${timing.durationMs}ms ${options.easing}`;
  const incomingTransition = options.color
    ? `${rollTransition}, color ${options.colorFade}ms linear ${timing.durationMs}ms`
    : rollTransition;

  if (widthWillChange) {
    scheduleTask(() => {
      slot.style.transition =
        `width ${widthTiming.durationMs}ms ${width.resizeEasing}`;
      slot.style.width = `${targetWidth}px`;
    }, widthTiming.startDelayMs);
  }

  if (previousFace) {
    scheduleTask(() => {
      previousFace.style.transition = rollTransition;
      previousFace.style.transform =
        `translateY(${outgoingOffsetY}px) ` +
        `rotate(${-timing.startingTiltDegrees}deg)`;
    }, timing.startDelayMs);
  }

  scheduleTask(() => {
    incomingFace.style.transition = incomingTransition;
    incomingFace.style.transform = layout.characterRestTransform;
    if (options.color) incomingFace.style.color = restingColor;

    const finishOnTransformEnd = (event: TransitionEvent) => {
      if (event.propertyName !== "transform") return;
      incomingFace.removeEventListener(
        "transitionend",
        finishOnTransformEnd,
      );
      slot.dataset.char = measurement.targetSegment;
      slot.style.removeProperty("transition");
      slot.style.removeProperty("width");
      slot.classList.remove("is-resizing");
      slot.querySelectorAll(".char-face").forEach((face) => {
        if (face !== incomingFace) face.remove();
      });
    };
    incomingFace.addEventListener("transitionend", finishOnTransformEnd);
  }, timing.startDelayMs + options.exitOffset);
}

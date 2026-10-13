"use client";

import type { Transition } from "motion/react";
import {
  AnimatePresence,
  animate,
  MotionConfig,
  motion,
  useIsPresent,
  useMotionValue,
  useTransform,
} from "motion/react";
import { useEffect, useRef, useState } from "react";
import {
  DIGIT_DISTANCE,
  isDigit,
  mod,
  reconcileDigitKeys,
  reconcileTextKeys,
  splitGraphemes,
} from "@/lib/calligraph-core";

// ---- upstream: packages/calligraph/src/text.tsx ----
export function TextRenderer({
  text,
  transition,
  driftX,
  driftY,
  trend,
  animateInitial,
  onComplete,
}: {
  text: string;
  transition: Transition;
  driftX: number;
  driftY: number;
  trend: number;
  stagger: number;
  animateInitial: boolean;
  onComplete?: () => void;
}) {
  const graphemes = splitGraphemes(text);
  const [nextId, setNextId] = useState(graphemes.length);
  const [prevText, setPrevText] = useState(text);
  const [charKeys, setCharKeys] = useState<string[]>(() =>
    graphemes.map((_, i) => `c${i}`),
  );
  const [changeRatio, setChangeRatio] = useState(0);

  if (text !== prevText) {
    const result = reconcileTextKeys(prevText, text, charKeys, nextId);
    setNextId(result.nextId);
    setPrevText(text);
    setCharKeys(result.keys);
    setChangeRatio(result.changeRatio);
  }

  return (
    <MotionConfig transition={transition}>
      <AnimatePresence mode="popLayout" initial={animateInitial}>
        {graphemes.map((char, i) => {
          const key = charKeys[i];
          const progress =
            graphemes.length <= 1 ? 0 : i / (graphemes.length - 1);
          const offsetX = (progress - 0.5) * driftX * changeRatio;
          const offsetY = (progress - 0.5) * driftY * changeRatio;
          const trendY = trend * 8 * changeRatio;
          const isLast = i === graphemes.length - 1;

          return (
            <motion.span
              key={key}
              aria-hidden="true"
              layout="position"
              initial={{
                opacity: 0,
                x: offsetX,
                y: offsetY + trendY,
                filter: "blur(4px)",
                scale: 0.85,
              }}
              animate={{
                opacity: 1,
                x: 0,
                y: 0,
                filter: "blur(0px)",
                scale: 1,
              }}
              exit={{
                opacity: 0,
                x: offsetX,
                y: offsetY - trendY,
                filter: "blur(4px)",
                scale: 0.85,
              }}
              onAnimationComplete={
                isLast && onComplete ? onComplete : undefined
              }
              style={{ display: "inline-block", whiteSpace: "pre" }}
            >
              {char}
            </motion.span>
          );
        })}
      </AnimatePresence>
    </MotionConfig>
  );
}

// ---- upstream: packages/calligraph/src/number.tsx ----
export function NumberRenderer({
  text,
  transition,
  stagger,
  animateInitial,
  onComplete,
  instant = false,
}: {
  text: string;
  transition: Transition;
  stagger: number;
  animateInitial: boolean;
  onComplete?: () => void;
  /**
   * Labs: reduced motion. The digits' own `{ delay }` transitions replace the
   * MotionConfig transition, so they are made instant here.
   */
  instant?: boolean;
}) {
  const chars = splitGraphemes(text);

  const [nextId, setNextId] = useState(chars.length);
  const [prevText, setPrevText] = useState(text);
  const [digitKeys, setDigitKeys] = useState<number[]>(() =>
    chars.map((_, i) => i),
  );
  const [direction, setDirection] = useState(1);

  if (text !== prevText) {
    const result = reconcileDigitKeys(prevText, text, digitKeys, nextId);
    setNextId(result.nextId);
    setDirection(result.direction);
    setDigitKeys(result.keys);
    setPrevText(text);
  }

  const prefixLen = (() => {
    const idx = chars.findIndex((c) => isDigit(c));
    return idx === -1 ? chars.length : idx;
  })();

  return (
    <MotionConfig transition={transition}>
      <AnimatePresence mode="popLayout" initial={animateInitial}>
        {chars.map((char, i) => {
          const isPrefix = i < prefixLen;
          const outerKey = isPrefix
            ? `pre-${i}`
            : `col-${chars.length - 1 - i}`;
          const delay = i * stagger;
          const isLast = i === chars.length - 1;

          return (
            <motion.span
              key={outerKey}
              layout="position"
              initial={isPrefix ? false : { opacity: 0 }}
              animate={isPrefix ? undefined : { opacity: 1 }}
              exit={isPrefix ? undefined : { opacity: 0 }}
              style={{ display: "inline-block", position: "relative" }}
            >
              {isPrefix ? (
                <span
                  aria-hidden="true"
                  style={{ display: "inline-block", whiteSpace: "pre" }}
                >
                  {char}
                </span>
              ) : (
                <AnimatePresence
                  mode="popLayout"
                  initial={animateInitial}
                  propagate
                >
                  <motion.span
                    key={digitKeys[i]}
                    aria-hidden="true"
                    initial={{
                      y: isDigit(char)
                        ? direction > 0
                          ? DIGIT_DISTANCE
                          : -DIGIT_DISTANCE
                        : 0,
                      filter: "blur(2px)",
                      scale: 0.5,
                      opacity: 0,
                    }}
                    animate={{
                      y: 0,
                      opacity: 1,
                      filter: "blur(0px)",
                      scale: 1,
                      transition: instant ? { duration: 0 } : { delay },
                    }}
                    exit={{
                      y: isDigit(char)
                        ? direction > 0
                          ? -DIGIT_DISTANCE
                          : DIGIT_DISTANCE
                        : 0,
                      opacity: 0,
                      filter: "blur(2px)",
                      scale: 0.5,
                      transition: instant ? { duration: 0 } : { delay },
                    }}
                    onAnimationComplete={
                      isLast && onComplete ? onComplete : undefined
                    }
                    style={{
                      display: "inline-block",
                      whiteSpace: "pre",
                    }}
                  >
                    {char}
                  </motion.span>
                </AnimatePresence>
              )}
            </motion.span>
          );
        })}
      </AnimatePresence>
    </MotionConfig>
  );
}

// ---- upstream: packages/calligraph/src/slots.tsx ----
function DigitNum({
  n,
  current,
}: {
  n: number;
  current: ReturnType<typeof useMotionValue<number>>;
}) {
  const y = useTransform(current, (c) => {
    let offset = mod(n - c, 10);
    if (offset > 5) offset -= 10;
    const clamped = Math.max(-1, Math.min(1, offset));
    return `${-clamped * 100}%`;
  });

  return (
    <motion.span
      aria-hidden
      style={{
        position: "absolute",
        top: 0,
        left: "50%",
        x: "-50%",
        display: "inline-block",
        whiteSpace: "pre",
        y,
      }}
    >
      {n}
    </motion.span>
  );
}

const digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

const FADE_HEIGHT = "0.25em";
const FADE_MASK = `linear-gradient(to bottom, transparent 0%, black ${FADE_HEIGHT}, black calc(100% - ${FADE_HEIGHT}), transparent 100%)`;

function SlotColumn({
  digit,
  direction,
  transition,
  delay,
  animateIn,
}: {
  digit: number;
  direction: number;
  transition: Transition;
  delay: number;
  animateIn: boolean;
}) {
  const isPresent = useIsPresent();
  const spinIn = Math.max(digit, 1);
  const startValue = animateIn ? digit - spinIn * (direction || 1) : digit;
  const current = useMotionValue(startValue);
  const cumulativeRef = useRef(digit);
  const prevDigitRef = useRef(digit);
  const initialRef = useRef(true);

  if (digit !== prevDigitRef.current) {
    const old = prevDigitRef.current;
    let diff: number;

    if (direction > 0) {
      diff = digit >= old ? digit - old : 10 - old + digit;
    } else if (direction < 0) {
      diff = old >= digit ? -(old - digit) : -(10 - digit + old);
    } else {
      diff = digit - old;
    }

    cumulativeRef.current += diff;
    prevDigitRef.current = digit;
  }

  useEffect(() => {
    if (!isPresent) {
      const spinOut = Math.max(digit, 1);
      animate(current, cumulativeRef.current + spinOut * (direction || 1), {
        ...transition,
      });
      return;
    }

    if (initialRef.current) {
      initialRef.current = false;
      if (!animateIn) return;
    }

    animate(current, cumulativeRef.current, {
      ...transition,
      delay,
    });
  });

  return (
    <span
      style={{
        display: "inline-block",
        position: "relative",
        verticalAlign: "top",
      }}
    >
      <span
        style={{
          visibility: "hidden",
          whiteSpace: "pre",
          display: "inline-block",
        }}
      >
        0
      </span>
      {digits.map((n) => (
        <DigitNum key={n} n={n} current={current} />
      ))}
    </span>
  );
}

export function SlotsRenderer({
  text,
  transition,
  stagger,
  animateInitial,
}: {
  text: string;
  transition: Transition;
  stagger: number;
  animateInitial: boolean;
  onComplete?: () => void;
}) {
  const chars = splitGraphemes(text);

  const [nextId, setNextId] = useState(chars.length);
  const [prevText, setPrevText] = useState(text);
  const [digitKeys, setDigitKeys] = useState<number[]>(() =>
    chars.map((_, i) => i),
  );
  const [direction, setDirection] = useState(1);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (text !== prevText) {
    const result = reconcileDigitKeys(prevText, text, digitKeys, nextId);
    setNextId(result.nextId);
    setDirection(result.direction);
    setDigitKeys(result.keys);
    setPrevText(text);
  }

  const prefixLen = (() => {
    const idx = chars.findIndex((c) => isDigit(c));
    return idx === -1 ? chars.length : idx;
  })();

  const digitCount = chars.filter((c) => isDigit(c)).length;
  let digitIndex = 0;

  return (
    <MotionConfig transition={transition}>
      <span
        style={{
          display: "inline-flex",
          paddingTop: FADE_HEIGHT,
          paddingBottom: FADE_HEIGHT,
          marginTop: `calc(-1 * ${FADE_HEIGHT})`,
          marginBottom: `calc(-1 * ${FADE_HEIGHT})`,
          maskImage: FADE_MASK,
          WebkitMaskImage: FADE_MASK,
        }}
      >
        <AnimatePresence mode="popLayout" initial={animateInitial}>
          {chars.map((char, i) => {
            const isPrefix = i < prefixLen;
            const outerKey = isPrefix
              ? `pre-${i}`
              : `col-${chars.length - 1 - i}`;

            if (isPrefix || !isDigit(char)) {
              return (
                <motion.span
                  key={outerKey}
                  aria-hidden="true"
                  layout="position"
                  initial={false}
                  exit={isPrefix ? undefined : { opacity: 0 }}
                  style={{ display: "inline-block", whiteSpace: "pre" }}
                >
                  {char}
                </motion.span>
              );
            }

            const delay = (digitCount - 1 - digitIndex) * stagger;
            digitIndex++;

            return (
              <motion.span
                key={outerKey}
                layout="position"
                initial={false}
                exit={{ opacity: 0 }}
                style={{ display: "inline-block" }}
              >
                <SlotColumn
                  digit={Number(char)}
                  direction={direction}
                  transition={transition}
                  delay={delay}
                  animateIn={isMounted || animateInitial}
                />
              </motion.span>
            );
          })}
        </AnimatePresence>
      </span>
    </MotionConfig>
  );
}

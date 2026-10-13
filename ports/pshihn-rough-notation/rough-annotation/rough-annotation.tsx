"use client";

import * as React from "react";
import {
  annotate,
  annotationGroup,
  type BracketType,
  type RoughAnnotation,
  type RoughAnnotationConfig,
  type RoughAnnotationConfigBase,
  type RoughAnnotationType,
} from "@/lib/rough-annotation-core";

// A thin React layer over the annotate() and annotationGroup() functions in
// rough-annotation-core. The annotation draws into an <svg> that
// rough-annotation-core inserts next to the element, so the element itself is
// rendered by React and left alone.

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

/**
 * The highlight type paints a bar behind the text, so it never defaults to the
 * text color: it uses the highlight token (the stylesheet below picks the
 * contrast value on request).
 */
const HIGHLIGHT_COLOR =
  "var(--rough-annotation-highlight-active, oklch(0.93 0.14 95))";

/**
 * Labs additions: contrast and forced colors for the highlight bar, and
 * resets so `as="mark"`, `"del"` and `"ins"` keep their meaning without their
 * default paint doubling the annotation. Rendered with the component (React
 * hoists and de-duplicates it by href).
 */
const STYLES = `
svg.rough-annotation {
  --rough-annotation-highlight-active: var(--rough-annotation-highlight, oklch(0.93 0.14 95));
}
:where(mark[data-slot="rough-annotation"]) {
  background-color: transparent;
  color: inherit;
}
:where(del[data-slot="rough-annotation"], ins[data-slot="rough-annotation"]) {
  text-decoration: none;
}
@media (prefers-contrast: more) {
  svg.rough-annotation {
    --rough-annotation-highlight-active: var(--rough-annotation-highlight-contrast, oklch(0.66 0.13 75));
  }
}
@media (forced-colors: active) {
  svg.rough-annotation path {
    stroke: CanvasText;
  }
  svg.rough-annotation:has(+ [data-slot="rough-annotation"][data-type="highlight"]) {
    forced-color-adjust: none;
  }
  svg.rough-annotation:has(+ [data-slot="rough-annotation"][data-type="highlight"]) path {
    stroke: Mark;
  }
  [data-slot="rough-annotation"][data-type="highlight"] {
    forced-color-adjust: none;
    color: MarkText;
  }
}
`;

/** A side of a bracket: physical, or `start` and `end` which follow the text direction. */
export type RoughNotationBracket = BracketType | "start" | "end";

export interface RoughNotationProps
  extends Omit<RoughAnnotationConfigBase, "brackets">,
    Omit<React.ComponentPropsWithoutRef<"span">, "color"> {
  /** How to mark the content. Fixed for the life of the annotation: a new type draws a new annotation. */
  type: RoughAnnotationType;
  /** Draw the mark. Turning it off hides it at once; turning it on again animates it. Ignored inside a RoughNotationGroup, which owns it. */
  show?: boolean;
  /** Annotate each line of wrapped inline text separately. */
  multiline?: boolean;
  /** Start drawing from the right. Default: the element's computed direction. */
  rtl?: boolean;
  /** Sides of a `bracket` mark. Default `end` (the right in left-to-right text, the left in right-to-left). */
  brackets?: RoughNotationBracket | RoughNotationBracket[];
  /** The element to render. Default `span`. Use a block element for `bracket`. */
  as?: React.ElementType;
  ref?: React.Ref<HTMLElement>;
}

interface GroupEntry {
  annotation: RoughAnnotation;
  element: HTMLElement;
}

interface GroupContextValue {
  register: (entry: GroupEntry) => () => void;
}

const GroupContext = React.createContext<GroupContextValue | null>(null);

function prefersReducedMotion(): boolean {
  return window.matchMedia(REDUCED_MOTION).matches;
}

function physicalBracket(
  side: RoughNotationBracket,
  rtl: boolean,
): BracketType {
  if (side === "start") {
    return rtl ? "right" : "left";
  }
  if (side === "end") {
    return rtl ? "left" : "right";
  }
  return side;
}

export function RoughNotation({
  type,
  show = true,
  animate,
  animationDuration,
  color,
  strokeWidth,
  padding,
  iterations,
  multiline,
  brackets = "end",
  rtl,
  as: Component = "span",
  ref,
  children,
  ...props
}: RoughNotationProps) {
  const group = React.useContext(GroupContext);
  const element = React.useRef<HTMLElement | null>(null);
  const instance = React.useRef<RoughAnnotation | null>(null);
  const bracketsKey = Array.isArray(brackets)
    ? brackets.join(",")
    : (brackets ?? "");

  // The options a new annotation starts with; the effects below read them
  // through this ref so that changing a color or a padding does not rebuild it.
  const latest = React.useRef({
    show,
    animate,
    animationDuration,
    color,
    strokeWidth,
    padding,
    iterations,
  });
  React.useEffect(() => {
    latest.current = {
      show,
      animate,
      animationDuration,
      color,
      strokeWidth,
      padding,
      iterations,
    };
  });

  // The annotation, rebuilt when the type, multiline, brackets or direction change.
  React.useEffect(() => {
    const node = element.current;
    if (!node) {
      return;
    }
    const options = latest.current;
    const isRtl = rtl ?? getComputedStyle(node).direction === "rtl";
    const config: RoughAnnotationConfig = {
      type,
      multiline,
      brackets: bracketsKey
        .split(",")
        .filter(Boolean)
        .map((side) => physicalBracket(side as RoughNotationBracket, isRtl)),
      rtl: isRtl,
      animate: prefersReducedMotion() ? false : options.animate,
      animationDuration: options.animationDuration,
      color:
        options.color ?? (type === "highlight" ? HIGHLIGHT_COLOR : undefined),
      strokeWidth: options.strokeWidth,
      padding: options.padding,
      iterations: options.iterations,
    };
    const annotation = annotate(node, config);
    instance.current = annotation;
    const unregister = group?.register({ annotation, element: node });
    if (!group && options.show) {
      annotation.show();
    }
    // Reduced motion switched on while a mark is drawing: finish it now.
    const media = window.matchMedia(REDUCED_MOTION);
    const onMotionChange = () => {
      if (media.matches) {
        annotation.animate = false;
        if (annotation.isShowing()) {
          annotation.show();
        }
      }
    };
    media.addEventListener("change", onMotionChange);
    return () => {
      media.removeEventListener("change", onMotionChange);
      unregister?.();
      annotation.remove();
      instance.current = null;
    };
  }, [type, multiline, bracketsKey, rtl, group]);

  // Show and hide.
  React.useEffect(() => {
    const annotation = instance.current;
    if (!annotation || group || annotation.isShowing() === show) {
      return;
    }
    if (show) {
      annotation.show();
    } else {
      annotation.hide();
    }
  }, [show, group]);

  // Live options. The setters redraw a visible mark without animating it again.
  React.useEffect(() => {
    const annotation = instance.current;
    if (!annotation) {
      return;
    }
    const nextAnimate = prefersReducedMotion() ? false : animate;
    if (annotation.animate !== nextAnimate) {
      annotation.animate = nextAnimate;
    }
    if (annotation.animationDuration !== animationDuration) {
      annotation.animationDuration = animationDuration;
    }
    if (annotation.iterations !== iterations) {
      annotation.iterations = iterations;
    }
    const nextColor =
      color ?? (type === "highlight" ? HIGHLIGHT_COLOR : undefined);
    if (annotation.color !== nextColor) {
      annotation.color = nextColor;
    }
    if (annotation.strokeWidth !== strokeWidth) {
      annotation.strokeWidth = strokeWidth;
    }
    if (
      JSON.stringify(annotation.padding ?? null) !==
      JSON.stringify(padding ?? null)
    ) {
      annotation.padding = padding;
    }
  });

  const setElement = React.useCallback(
    (node: HTMLElement | null) => {
      element.current = node;
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    },
    [ref],
  );

  return (
    <>
      <style href="designfrom-rough-annotation" precedence="default">
        {STYLES}
      </style>
      <Component
        ref={setElement}
        data-slot="rough-annotation"
        data-type={type}
        {...props}
      >
        {children}
      </Component>
    </>
  );
}

export interface RoughNotationGroupProps {
  /** Draw the annotations of every RoughNotation inside, one after another in document order. */
  show?: boolean;
  children?: React.ReactNode;
}

/**
 * Sequences the annotations inside it, in document order: each starts when
 * the one before it has finished (annotationGroup). Their own `show` props are
 * ignored; turning the group's `show` off hides them all at once.
 */
export function RoughNotationGroup({
  show = true,
  children,
}: RoughNotationGroupProps) {
  const [entries, setEntries] = React.useState<GroupEntry[]>([]);
  const context = React.useMemo<GroupContextValue>(
    () => ({
      register(entry) {
        setEntries((current) => [...current, entry]);
        return () =>
          setEntries((current) => current.filter((item) => item !== entry));
      },
    }),
    [],
  );

  React.useEffect(() => {
    if (!entries.length) {
      return;
    }
    const ordered = [...entries]
      .sort((a, b) =>
        a.element.compareDocumentPosition(b.element) &
        Node.DOCUMENT_POSITION_FOLLOWING
          ? -1
          : 1,
      )
      .map((entry) => entry.annotation);
    const sequence = annotationGroup(ordered);
    if (show) {
      sequence.show();
    } else {
      sequence.hide();
    }
  }, [entries, show]);

  return (
    <GroupContext.Provider value={context}>{children}</GroupContext.Provider>
  );
}

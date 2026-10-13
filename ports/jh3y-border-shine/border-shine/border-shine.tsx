"use client";

import * as React from "react";

import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

/*
 * Ported from Jhey's pen "masked inset border shine"
 * (https://codepen.io/jh3y/pen/WbwyGBb), saved verbatim in this repository
 * and pinned by the git tree hash of that snapshot (sources.yaml).
 *
 * The effect: a glass plate whose ::before pseudo-element is a soft
 * gradient with a backdrop filter, and whose ::after is a 1px inset
 * highlight masked by a linear gradient. The gradient's angle follows the
 * pointer, so the edge catches the light on the side the pointer is on.
 *
 * Changes from upstream (each one is listed in
 * docs/evidence/ports/border-shine/fidelity.md):
 * - The `.icon` button becomes `BorderShine`, a wrapper that renders any
 *   element (`as`) around any content; the sun and cloud glyph the pen
 *   draws inside it is `BorderShineGlyph`.
 * - Upstream's CSS layers are flattened to the declarations that win, and
 *   its parts are `data-slot` attributes. `--pointer-angle` is
 *   `--border-shine-angle`; the pen's colours are `--border-shine-*`
 *   variables with the upstream values as fallbacks.
 * - The pointer is read once per frame instead of on every event, and
 *   only while `follow` is on and reduced motion is off.
 * - Arrow keys turn the light too (a slider's keys), so the effect is not
 *   pointer-only.
 * - The pen's debug panel (theme, pointer, angle and an exploded 3D view),
 *   its page decoration and its press scale are left out; the panel's
 *   defaults are pinned (dark, follow the pointer, rest angle 325).
 * - The pseudo-elements ignore the pointer, so content inside stays
 *   clickable.
 */

const css = `
[data-slot="border-shine"]::before,
[data-slot="border-shine"]::after {
  content: "";
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  corner-shape: inherit;
  pointer-events: none;
}
[data-slot="border-shine"]::before {
  z-index: -1;
  background: linear-gradient(
    var(--border-shine-from, hsl(0 0% 100% / 0.18)),
    var(--border-shine-to, hsl(0 0% 4% / 0.7))
  );
  -webkit-backdrop-filter: saturate(2) contrast(1);
  backdrop-filter: saturate(2) contrast(1);
}
[data-slot="border-shine"]::after {
  box-shadow: 0 0 1px 0.8px var(--border-shine-highlight, hsl(0 0% 100% / 0.8)) inset;
  -webkit-mask: linear-gradient(
    calc(var(--border-shine-angle, var(--border-shine-rest, 325)) * 1deg),
    #ffffff80,
    #ffffff30 30% 60%,
    #fff
  );
  mask: linear-gradient(
    calc(var(--border-shine-angle, var(--border-shine-rest, 325)) * 1deg),
    #ffffff80,
    #ffffff30 30% 60%,
    #fff
  );
  transform: translate3d(0, 0, 0);
}
[data-slot="border-shine-glyph-layer"] {
  height: 90%;
  position: absolute;
  top: 50%;
  left: 50%;
  translate: -50% -50%;
  transform: translate3d(0, 0, 0);
}
[data-slot="border-shine-glyph-sun"] {
  fill: var(--border-shine-sun, oklch(78.95% 0.13901149690990544 97.30600066166386));
}
[data-slot="border-shine-glyph-sun-stroke"] {
  fill: none;
  stroke: var(--border-shine-sun-stroke, #ffffff95);
  stroke-width: 14px;
  -webkit-clip-path: inset(30% 0 0 0);
  clip-path: inset(30% 0 0 0);
  transform-box: fill-box;
  rotate: 215deg;
  transform-origin: 50% 50%;
  -webkit-mask: linear-gradient(
      calc(var(--border-shine-angle, var(--border-shine-rest, 325)) * 1deg),
      #fff,
      #0000
    )
    50% 50% / calc(100% + 14px) calc(100% + 14px) no-repeat;
  mask: linear-gradient(
      calc(var(--border-shine-angle, var(--border-shine-rest, 325)) * 1deg),
      #fff,
      #0000
    )
    50% 50% / calc(100% + 14px) calc(100% + 14px) no-repeat;
}
[data-slot="border-shine-glyph-cloud-clip"] {
  -webkit-backdrop-filter: blur(20px) brightness(0.8) saturate(1.8);
  backdrop-filter: blur(20px) brightness(0.8) saturate(1.8);
  height: 100%;
  width: 100%;
  transform: translateZ(0);
}
[data-slot="border-shine-glyph-cloud"] {
  fill: var(--border-shine-cloud, hsl(0 0% 100% / 0.8));
  -webkit-mask: linear-gradient(#fff, #ffffff90 50%, #ffffff50);
  mask: linear-gradient(#fff, #ffffff90 50%, #ffffff50);
}
[data-slot="border-shine-glyph-cloud-stroke"] {
  fill: none;
  stroke: var(--border-shine-cloud-stroke, #fff);
  stroke-width: 10px;
  -webkit-mask: linear-gradient(
      calc(var(--border-shine-angle, var(--border-shine-rest, 325)) * 1deg),
      #ffffff90,
      #ffffff30 30% 40%,
      #fff
    )
    50% 50% / calc(100% + 10px) calc(100% + 10px) no-repeat;
  mask: linear-gradient(
      calc(var(--border-shine-angle, var(--border-shine-rest, 325)) * 1deg),
      #ffffff90,
      #ffffff30 30% 40%,
      #fff
    )
    50% 50% / calc(100% + 10px) calc(100% + 10px) no-repeat;
}
@media (prefers-contrast: more) {
  [data-slot="border-shine"]::after {
    box-shadow: 0 0 1px 1px #fff inset;
    -webkit-mask: none;
    mask: none;
  }
}
@media (forced-colors: active) {
  [data-slot="border-shine"] {
    border-color: CanvasText;
  }
  [data-slot="border-shine"]::before,
  [data-slot="border-shine"]::after {
    display: none;
  }
}
`;

type BorderShineElement =
  | "div"
  | "span"
  | "button"
  | "a"
  | "article"
  | "section"
  | "li";

type BorderShineOwnProps<T extends BorderShineElement> = {
  /** The element to render. Default `div`; use `button` or `a` for a control. */
  as?: T;
  /**
   * Where the light sits, in degrees (0 is the top, clockwise), before the
   * pointer moves and whenever it does not follow. Upstream: 325.
   */
  angle?: number;
  /**
   * Turn the light toward the pointer as it moves anywhere on the page, and
   * with the arrow keys while the element (or a button or link inside it)
   * has focus. Reduced motion keeps the light at `angle`.
   */
  follow?: boolean;
  /**
   * Upstream's squircle corners (a 24% radius, or a squircle where the
   * browser supports `corner-shape`). Turn it off to set your own radius
   * with a `rounded-*` class.
   */
  squircle?: boolean;
};

export type BorderShineProps<T extends BorderShineElement = "div"> =
  BorderShineOwnProps<T> &
    Omit<React.ComponentPropsWithRef<T>, keyof BorderShineOwnProps<T>>;

/** The angle from an element's centre to a point, 0 at the top, clockwise. */
export function borderShineAngle(rect: DOMRect, x: number, y: number) {
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const angleRadians = Math.atan2(y - centerY, x - centerX);
  // Offset by +90 so 0 is at the top, and normalize to 0-360 (upstream).
  return ((angleRadians * 180) / Math.PI + 90 + 360) % 360;
}

/** Degrees the arrow keys turn the light; Shift takes the larger step. */
const KEY_STEP = 15;
const KEY_STEP_LARGE = 45;

/** Widgets that use the arrow keys themselves keep them. */
const ARROW_ROLES = new Set([
  "combobox",
  "gridcell",
  "listbox",
  "menuitem",
  "menuitemcheckbox",
  "menuitemradio",
  "option",
  "radio",
  "scrollbar",
  "searchbox",
  "slider",
  "spinbutton",
  "tab",
  "textbox",
  "treeitem",
]);

function ownsArrowKeys(target: EventTarget, root: HTMLElement) {
  if (!(target instanceof HTMLElement) || target === root) {
    return false;
  }
  if (
    target.isContentEditable ||
    target.matches("input, textarea, select, [contenteditable]")
  ) {
    return true;
  }
  const role = target.getAttribute("role");
  return role !== null && ARROW_ROLES.has(role);
}

export function BorderShine<T extends BorderShineElement = "div">({
  as,
  angle = 325,
  follow = true,
  squircle = true,
  className,
  style,
  onKeyDown,
  ref,
  ...props
}: BorderShineProps<T>) {
  const Component = (as ?? "div") as React.ElementType;
  const reducedMotion = useReducedMotion();
  const active = follow && !reducedMotion;
  const local = React.useRef<HTMLElement | null>(null);
  // The angle on screen: the rest angle until the pointer or a key moves it.
  const current = React.useRef(angle);

  const setRef = React.useCallback(
    (node: HTMLElement | null) => {
      local.current = node;
      if (typeof ref === "function") {
        ref(node as never);
      } else if (ref) {
        (ref as React.RefObject<HTMLElement | null>).current = node;
      }
    },
    [ref],
  );

  React.useEffect(() => {
    const element = local.current;
    if (!element || !active) {
      return;
    }
    let frame = 0;
    let pointer: { x: number; y: number } | null = null;
    const show = (degrees: number) => {
      current.current = degrees;
      element.style.setProperty("--border-shine-angle", degrees.toFixed(2));
    };
    const apply = () => {
      frame = 0;
      if (pointer) {
        show(
          borderShineAngle(
            element.getBoundingClientRect(),
            pointer.x,
            pointer.y,
          ),
        );
      }
    };
    const onPointerMove = (event: PointerEvent) => {
      pointer = { x: event.clientX, y: event.clientY };
      if (!frame) {
        frame = requestAnimationFrame(apply);
      }
    };
    document.addEventListener("pointermove", onPointerMove);
    return () => {
      document.removeEventListener("pointermove", onPointerMove);
      cancelAnimationFrame(frame);
      // Back to the rest angle when following stops.
      element.style.removeProperty("--border-shine-angle");
      current.current = angle;
    };
  }, [active, angle]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    (onKeyDown as React.KeyboardEventHandler<HTMLElement> | undefined)?.(event);
    const element = local.current;
    if (
      !active ||
      !element ||
      event.defaultPrevented ||
      event.ctrlKey ||
      event.altKey ||
      event.metaKey ||
      ownsArrowKeys(event.target, element)
    ) {
      return;
    }
    const step = event.shiftKey ? KEY_STEP_LARGE : KEY_STEP;
    let next: number;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowUp":
        next = current.current + step;
        break;
      case "ArrowLeft":
      case "ArrowDown":
        next = current.current - step;
        break;
      case "Home":
        next = angle;
        break;
      default:
        return;
    }
    event.preventDefault();
    next = ((next % 360) + 360) % 360;
    current.current = next;
    element.style.setProperty("--border-shine-angle", next.toFixed(2));
  };

  return (
    <>
      <style href="designfrom-border-shine" precedence="default">
        {css}
      </style>
      <Component
        ref={setRef}
        data-slot="border-shine"
        className={cn(
          "relative isolate border border-transparent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring",
          squircle &&
            "rounded-[24.222222%] supports-[corner-shape:squircle]:rounded-[50%] supports-[corner-shape:squircle]:[corner-shape:squircle]",
          className,
        )}
        style={
          {
            ...style,
            "--border-shine-rest": angle,
          } as React.CSSProperties
        }
        onKeyDown={handleKeyDown}
        {...props}
      />
    </>
  );
}

export interface BorderShineGlyphProps
  extends React.ComponentPropsWithoutRef<"span"> {}

const CLOUD =
  "M250.5 167C310.586 167 361.861 205.121 381.943 258.738C388.792 257.595 395.827 257 403 257C473.14 257 530 313.86 530 384C530 454.14 473.14 511 403 511C399.899 511 396.825 510.886 393.78 510.668C391.048 510.887 388.287 511 385.5 511H142.5C84.7862 511 38 463.214 38 405.5C38 359.115 68.2218 319.142 110.049 305.237C112.023 228.552 174.149 167 250.5 167Z";

/**
 * The pen's sun-behind-a-cloud glyph, drawn as four stacked layers. Its
 * strokes catch the light at the same angle as the BorderShine around it
 * (they read `--border-shine-angle`). Decorative: name the control that
 * holds it.
 */
export function BorderShineGlyph({
  className,
  ...props
}: BorderShineGlyphProps) {
  const id = `border-shine-cloud-${React.useId().replace(/[^\w-]/g, "")}`;
  return (
    <span
      aria-hidden="true"
      data-slot="border-shine-glyph"
      className={cn("absolute inset-0", className)}
      {...props}
    >
      {/* one for the sun */}
      <svg
        data-slot="border-shine-glyph-layer"
        viewBox="0 0 630 630"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        focusable="false"
      >
        <circle data-slot="border-shine-glyph-sun" cx="451" cy="242" r="142" />
      </svg>
      {/* one for the sun stroke */}
      <svg
        data-slot="border-shine-glyph-layer"
        viewBox="0 0 630 630"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        focusable="false"
      >
        <circle
          data-slot="border-shine-glyph-sun-stroke"
          cx="451"
          cy="242"
          r="131"
        />
      </svg>
      {/* one for the cloud: its backdrop is a div with a backdrop-filter and a clip-path */}
      <svg
        data-slot="border-shine-glyph-layer"
        viewBox="0 0 630 630"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        focusable="false"
      >
        <foreignObject x="-12" y="117" width="592" height="444">
          <div
            data-slot="border-shine-glyph-cloud-clip"
            style={{ clipPath: `url(#${id})`, WebkitClipPath: `url(#${id})` }}
          />
        </foreignObject>
        <path data-slot="border-shine-glyph-cloud" d={CLOUD} />
        <defs>
          <clipPath id={id} transform="translate(12 -117)">
            <path d={CLOUD} />
          </clipPath>
        </defs>
      </svg>
      {/* one for the cloud stroke */}
      <svg
        data-slot="border-shine-glyph-layer"
        viewBox="0 0 630 630"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        focusable="false"
      >
        <path
          data-slot="border-shine-glyph-cloud-stroke"
          d="M250.5 178C308.697 178 357.926 216.834 374.249 270.282C383.149 268.137 392.442 267 402 267C467.17 267 520 319.83 520 385C520 440.874 481.166 487.675 429.017 499.891C421.183 501.919 412.968 503 404.5 503H145.5C91.6522 503 48 459.348 48 405.5C48 360.108 79.0196 321.959 121.018 311.099C121.007 310.4 121 309.701 121 309C121 236.651 178.979 178 250.5 178Z"
        />
      </svg>
    </span>
  );
}

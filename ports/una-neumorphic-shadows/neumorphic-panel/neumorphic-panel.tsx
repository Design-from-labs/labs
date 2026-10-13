"use client";

import { type ComponentProps, type ReactNode, useState } from "react";

// ---- upstream: debug.html (the pen's compiled stylesheet) ----
// The pen's `.neumorphic-panel`, `.raised` and `.pressed` rules, value for
// value. The classes are now `data-slot="neumorphic-panel"` with
// `data-state="raised" | "pressed"` (same specificity), and the pen's colors
// are read through `--neumorphic-panel-*` variables with the pen's values as
// fallbacks, so the item's cssVars, a class or an inline style can restyle
// them. The shadow geometry (offsets, blur) is the pen's, unchanged.
//
// Labs additions, none of which changes the default look:
// - the light source mirrors in right-to-left (`--neumorphic-panel--dir`, an
//   internal variable: the double dash marks it as not themable);
// - the same `font-family` the pen's body sets, `line-height: normal` and a
//   border-box width, so the panel looks the same on any page;
// - a button reset, for the `pressable` toggle;
// - `prefers-contrast: more` and `forced-colors: active` rules (the pen's
//   palette is faint by design; see the component's a11y notes).
//
// Under `@supports (corner-shape: squircle)` the radius is 120px with
// squircle corners, as upstream's nested @supports block does.
const css = `
[data-slot="neumorphic-panel"] {
  --neumorphic-panel--dir: 1;
  box-sizing: border-box;
  width: var(--neumorphic-panel-size, 300px);
  aspect-ratio: 1;
  margin: 0;
  padding: 0;
  border: 0;
  background-color: var(--neumorphic-panel-surface, #e8eae9);
  border-radius: 64px;
  display: flex;
  justify-content: center;
  align-items: center;
  color: var(--neumorphic-panel-foreground, #ced3d9);
  font-family: system-ui, sans-serif;
  font-size: 2rem;
  font-weight: 700;
  line-height: normal;
  letter-spacing: 2px;
  text-align: center;
}

@supports (corner-shape: squircle) {
  [data-slot="neumorphic-panel"] {
    corner-shape: squircle;
    border-radius: 120px;
  }
}

[data-slot="neumorphic-panel"]:dir(rtl) {
  --neumorphic-panel--dir: -1;
}

/* .raised */
[data-slot="neumorphic-panel"][data-state="raised"] {
  box-shadow:
    /*   White highlight (top start)   */
    calc(-31px * var(--neumorphic-panel--dir)) -31px 43px 0px var(--neumorphic-panel-highlight, rgba(255, 255, 255, 1)),
    /*   Dark shadow (bottom end)   */
    calc(8px * var(--neumorphic-panel--dir)) 8px 10px 0px var(--neumorphic-panel-shade, rgba(13, 39, 80, 0.04));
}

/* .pressed */
[data-slot="neumorphic-panel"][data-state="pressed"] {
  box-shadow:
    /*   Outer Shadows   */
    /*   Light (top start)   */
    calc(-31px * var(--neumorphic-panel--dir)) -31px 43px 0px var(--neumorphic-panel-highlight, rgba(255, 255, 255, 1)),
    /*   Dark (bottom end)   */
    calc(8px * var(--neumorphic-panel--dir)) 8px 10px 0px var(--neumorphic-panel-shade, rgba(13, 39, 80, 0.04)),

    /*   Inner Shadows   */
    /*   White highlight inset (top start)   */
    inset calc(-33px * var(--neumorphic-panel--dir)) -33px 46px 0px var(--neumorphic-panel-inner-highlight, rgba(255, 255, 255, 0.64)),
    /*   Dark shadow inset (bottom end)   */
    inset calc(28px * var(--neumorphic-panel--dir)) 28px 54px 0px var(--neumorphic-panel-inner-shade, rgba(13, 39, 80, 0.16));
}

/* Labs: the pressable toggle is a native button. */
button[data-slot="neumorphic-panel"] {
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

button[data-slot="neumorphic-panel"]:focus-visible {
  outline: 2px solid var(--neumorphic-panel-focus, #3a56d6);
  outline-offset: 8px;
}

@media (prefers-reduced-motion: no-preference) {
  button[data-slot="neumorphic-panel"] {
    transition: box-shadow 200ms ease;
  }
}

/* Labs: contrast on request. The pen's text is #ced3d9 on #e8eae9 (1.25:1)
   and its edge is a soft shadow; both are raised only when asked for. */
@media (prefers-contrast: more) {
  [data-slot="neumorphic-panel"] {
    color: var(--neumorphic-panel-contrast-foreground, #4b525c);
    border: 2px solid var(--neumorphic-panel-contrast-edge, #4b525c);
  }
  [data-slot="neumorphic-panel"][data-state="pressed"] {
    border-width: 5px;
    border-style: double;
  }
}

/* Labs: forced colors remove shadows, so the edge and the pressed cue move to
   system-colored borders. */
@media (forced-colors: active) {
  [data-slot="neumorphic-panel"] {
    color: ButtonText;
    border: 2px solid ButtonText;
  }
  [data-slot="neumorphic-panel"][data-state="pressed"] {
    border-width: 5px;
    border-style: double;
  }
  button[data-slot="neumorphic-panel"]:focus-visible {
    outline-color: Highlight;
  }
}
`;

export type NeumorphicPanelState = "raised" | "pressed";

type PanelBase = {
  /** Raised (the pen's `.raised`) or pressed (the pen's `.pressed`). */
  state?: NeumorphicPanelState;
  className?: string;
  children?: ReactNode;
};

type StaticPanelProps = PanelBase &
  Omit<ComponentProps<"div">, keyof PanelBase> & {
    pressable?: false;
  };

type PressablePanelProps = PanelBase &
  Omit<
    ComponentProps<"button">,
    keyof PanelBase | "type" | "aria-pressed" | "onChange"
  > & {
    /** Render a toggle button; `state` is then driven by `pressed`. */
    pressable: true;
    pressed?: boolean;
    defaultPressed?: boolean;
    onPressedChange?: (pressed: boolean) => void;
  };

export type NeumorphicPanelProps = StaticPanelProps | PressablePanelProps;

/**
 * A soft, extruded panel (a "neumorphic" surface): a light highlight toward the
 * top start and a faint shadow toward the bottom end. `state="pressed"` adds
 * the inner shadows that sink it. Set `pressable` for a toggle button whose
 * `aria-pressed` state is the pressed look.
 */
export function NeumorphicPanel(props: NeumorphicPanelProps) {
  const {
    state = "raised",
    pressable,
    className,
    children,
    pressed,
    defaultPressed,
    onPressedChange,
    onClick,
    ...rest
  } = props as PanelBase &
    ComponentProps<"button"> & {
      pressable?: boolean;
      pressed?: boolean;
      defaultPressed?: boolean;
      onPressedChange?: (pressed: boolean) => void;
    };
  const [inner, setInner] = useState(defaultPressed ?? false);

  const style = (
    <style href="designfrom-neumorphic-panel" precedence="default">
      {css}
    </style>
  );

  if (!pressable) {
    return (
      <>
        {style}
        <div
          {...(rest as ComponentProps<"div">)}
          data-slot="neumorphic-panel"
          data-state={state}
          className={className}
        >
          {children}
        </div>
      </>
    );
  }

  const isPressed = pressed ?? inner;
  return (
    <>
      {style}
      <button
        {...rest}
        type="button"
        aria-pressed={isPressed}
        data-slot="neumorphic-panel"
        data-state={isPressed ? "pressed" : "raised"}
        className={className}
        onClick={(event) => {
          onClick?.(event);
          if (event.defaultPrevented) return;
          if (pressed === undefined) setInner(!isPressed);
          onPressedChange?.(!isPressed);
        }}
      >
        {children}
      </button>
    </>
  );
}

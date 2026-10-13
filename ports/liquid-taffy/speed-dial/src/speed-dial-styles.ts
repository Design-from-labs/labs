// ---- upstream: src/components/LiquidMenu/LiquidMenu.module.css ----
// The speed dial's stylesheet (with the focus rule of styles/global.css),
// line for line. Labs changes (fidelity.md): class names are
// `speed-dial-<name>` instead of CSS modules; the palette is the component's
// own `--speed-dial-*` tokens (upstream's values as fallbacks) instead of the
// app's `--liquid-*` and `--color-tooltip-*`; private variables are
// `--speed-dial--*`; the tooltip inherits the page font at upstream's 13px;
// logical insets; forced-colors and prefers-contrast rules are additions.

const P = "speed-dial";

/* Liquid speed-dial. Three layers, bottom to top:
   1. .bodies — the real buttons' bodies: CSS circles with the true 1px border
      and shadow. These never change; they ARE the border, always.
   2. .goo — the liquid: blurred/thresholded clones of the same circles whose
      filter-drawn rim sits exactly where the CSS borders sit. While anything
      moves this layer is opaque and simply covers the bodies, so the one
      visible outline flows with the necks; at rest it fades away and reveals
      the identical crisp picture underneath. No border is ever swapped.
   3. .menu / .trigger — transparent hit areas carrying only the icons,
      so the glyphs fly above the liquid. */
export const speedDialStyles: string = `
.${P}-anchor {
  /* No colour is named in this file. Every one the dial wears — face, rim,
     glyph, tooltip, shadow, seam — arrives from the palette and changes with
     the frame on its own; what lives here is geometry, and the rules below
     that belong to the dark frame alone: the motif, which the light frame
     does not carry. */
  position: relative;
  width: 32px;
  height: 32px;
  user-select: none;
  -webkit-user-select: none;
  /* Labs: the box model and type the app stylesheet gave upstream. */
  box-sizing: border-box;
  font-size: 13px;
  line-height: normal;
}

.${P}-anchor *,
.${P}-anchor *::before,
.${P}-anchor *::after {
  box-sizing: border-box;
}

/* ONE silhouette shadow for the crisp picture — the same drop-shadow the goo
   wears, on the container, so it shades the UNION of the drops. Per-body
   box-shadows summed where two drops stood close (visibly darker pools
   between neighbours), while the goo's single shadow never sums — so every
   goo↔crisp swap made the shadow visibly deepen or thin around the joints.
   With both layers shading the same silhouette through the same variable,
   the swap is pixel-identical and the shadow never changes depth. */
.${P}-bodies {
  position: absolute;
  inset: 0;
  filter: var(--${P}-shadow, drop-shadow(0 3px 3.125px rgb(0 0 0 / 8%)));
}

.${P}-trigger-body {
  position: absolute;
  left: 0;
  top: 0;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--${P}-fill, #ffffff);
  border: 1px solid var(--${P}-rim, #dadada);
  will-change: transform;
}

/* Position comes inline from the satellites' slots. */
.${P}-satellite-body {
  position: absolute;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--${P}-fill, #ffffff);
  border: 1px solid var(--${P}-rim, #dadada);
  will-change: transform;
}

/* The goo canvas: a real <svg> (Safari won't reliably repaint a CSS
   filter: url() on an HTML element with animating children), drawn big
   enough to hold the satellite fan (±48px sideways, 48px up from the trigger
   center) plus headroom for the blur. The filter lives on a <g> inside. */
.${P}-goo {
  position: absolute;
  right: -108px;
  /* 72px below the button: a full-length finger pulled down, its head and the
     blur's tail all have to land inside the canvas or they are cut off. */
  bottom: -72px;
  width: 248px; /* 108 + 32 + 108 */
  height: 228px; /* 72 + 32 + 124 */
  z-index: 1;
  overflow: visible;
  pointer-events: none;
}

/* The seam wash. Opacity is the only thing animated on it — the gradient
   underneath carries where and how wide. Hidden until the engine lights it.
   Hidden, not merely transparent: the mask that cuts this wash down to the
   rim runs the goo's blur a SECOND time, and a browser is only guaranteed to
   skip that for something it is not painting. */
.${P}-seam {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  will-change: opacity;
}

/* The light frame carries no joint colour at all. Taken out of the picture
   here rather than by refusing to measure: the engine still reports every
   contact — the glyphs and the voice live off those — it just has nothing
   to paint on this stage. display, not visibility, because the engine writes
   visibility itself. */
.${P}-anchor:not([data-theme="dark"]) .${P}-seam {
  display: none;
}

/* Every liquid shape: trigger circle, satellite circles, and the grab chain —
   a head plus trailing beads that keep the pulled finger in one piece. */
.${P}-blob {
  fill: var(--${P}-fill, #ffffff);
  will-change: transform;
}

.${P}-menu {
  position: absolute;
  inset: 0;
  z-index: 2;
}

.${P}-trigger {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: none;
  color: var(--${P}-icon, #252731);
  font: inherit;
  cursor: pointer;
}

/* The trigger's glyph is a PLUS while the fan is closed and an X once it is
   open — the same path, spun 135°. Only the X is one of the glyphs, so only
   the X wears the cross's blue-violet: a plus is "open this", and colouring
   it would say the fan is already showing. Gated on aria-expanded, which is
   the state itself — no second flag to keep in step.

   The hue arrives on the family's fast hover clock, the bloom a beat ahead
   (a bloom spends most of its ramp invisible, so an equal clock reads as
   arriving late). */
.${P}-trigger {
  transition:
    color 120ms cubic-bezier(0.23, 1, 0.32, 1),
    background-color 160ms cubic-bezier(0.23, 1, 0.32, 1);
}

/* Closed — the plus keeps the surface's own ink. */
.${P}-trigger:hover {
  color: var(--${P}-icon-hover, #000000);
  background: var(--${P}-hover-tint, rgb(0 0 0 / 2.5%));
}

/* Open — it IS the cross now. Dark frame only: the light frame carries no
   motif colour, so there the X hovers in the surface's own ink like any
   other button.

   And it holds that colour for the whole grab OF ITSELF — not for any grab
   on the dial: a satellite being pulled is not the cross's business. While
   the X is the body in hand, though, it stays lit for the whole gesture,
   not just while the pointer is over the 32px disc. The cross is violet
   from the moment you touch it until you let go; what the merge adds on top
   is the BLOOM. */
.${P}-anchor[data-theme="dark"] .${P}-trigger[aria-expanded="true"]:hover,
.${P}-anchor[data-theme="dark"][data-held="trigger"] .${P}-trigger[aria-expanded="true"],
.${P}-anchor[data-theme="dark"] .${P}-trigger[data-merged] {
  color: var(--${P}--x-hue);
}

.${P}-trigger-icon {
  display: flex;
  will-change: transform;
  /* Transparent shadows at rest, so the glow interpolates from the first
     frame rather than waiting for a \`none\` list to be matched up.

     NO colour transition here, exactly as on the satellites' glyphs: the
     colour is the BUTTON's, and the button already eases it. */
  filter: drop-shadow(0 0 3px transparent) drop-shadow(0 0 8px transparent);
  transition: filter 90ms cubic-bezier(0.23, 1, 0.32, 1);
}

/* Hover and MERGE wear the same light, from the same declaration — a merge
   that lit differently from a hover read as a third state nobody asked for.
   [data-merged] is written by the seam feedback (see the component). */
.${P}-anchor[data-theme="dark"] .${P}-trigger[aria-expanded="true"]:hover .${P}-trigger-icon,
.${P}-anchor[data-theme="dark"] .${P}-trigger[data-merged] .${P}-trigger-icon {
  filter: drop-shadow(0 0 3px color-mix(in srgb, var(--${P}--x-hue) 88%, transparent))
    drop-shadow(0 0 8px color-mix(in srgb, var(--${P}--x-hue) 45%, transparent));
}

/* Transparent hit areas riding the same tweens as their bodies and blobs —
   they carry the icon (above the goo) and the accessibility. */
.${P}-satellite {
  position: absolute;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: none;
  color: var(--${P}-icon, #252731);
  font: inherit;
  cursor: pointer;
  will-change: transform;
  /* colour on the fast hover clock; filter's 200ms is the merge-neon's
     breath. */
  transition:
    color 120ms cubic-bezier(0.23, 1, 0.32, 1),
    background-color 160ms cubic-bezier(0.23, 1, 0.32, 1),
    filter 200ms cubic-bezier(0.23, 1, 0.32, 1);
}

/* On the DARK frame each satellite lights ITS OWN hue on hover — the same
   language as the dropdowns' rows: the glyph catches colour and bloom, the
   disc keeps the quiet neutral tint. The light frame carries no motif, so
   there a satellite hovers in the surface's own ink, unglowing. The glow
   lives on the svg, not the button — a filter on the button would
   drop-shadow the hover disc itself. */
.${P}-satellite svg {
  filter: drop-shadow(0 0 3px transparent) drop-shadow(0 0 8px transparent);
  transition: filter 90ms cubic-bezier(0.23, 1, 0.32, 1);
}

.${P}-satellite:hover {
  color: var(--${P}-icon-hover, #000000);
  background: var(--${P}-hover-tint, rgb(0 0 0 / 2.5%));
}

/* A merge lights a satellite exactly the way a hover does — one declaration
   for both, so the two can never drift into different-looking states. Labs:
   keyboard focus lights it the same way. */
.${P}-anchor[data-theme="dark"] .${P}-satellite:hover,
.${P}-anchor[data-theme="dark"] .${P}-satellite:focus-visible,
.${P}-anchor[data-theme="dark"] .${P}-satellite[data-merged] {
  color: var(--${P}--hue, var(--${P}-icon-hover, #ffffff));
}

.${P}-anchor[data-theme="dark"] .${P}-satellite:hover svg,
.${P}-anchor[data-theme="dark"] .${P}-satellite:focus-visible svg,
.${P}-anchor[data-theme="dark"] .${P}-satellite[data-merged] svg {
  filter: drop-shadow(0 0 3px color-mix(in srgb, var(--${P}--hue) 88%, transparent))
    drop-shadow(0 0 8px color-mix(in srgb, var(--${P}--hue) 45%, transparent));
}

/* Whenever the liquid owns the picture (open/close flight or a grab), the
   buttons' crisp hover discs step aside: painted over the moving goo they
   read as a second border, and during a grab they'd double the hover tint
   the liquid itself already wears. */
.${P}-anchor[data-liquid] .${P}-satellite:hover,
.${P}-anchor[data-liquid] .${P}-satellite,
.${P}-anchor[data-liquid] .${P}-trigger:hover,
.${P}-anchor[data-liquid] .${P}-trigger {
  background: none;
}

/* The app stylesheet's focus ring (styles/global.css). */
.${P}-trigger:focus-visible,
.${P}-satellite:focus-visible {
  outline: 2px solid var(--${P}-focus-ring, #1172fa);
  outline-offset: 2px;
}

/* Tooltip — pops in on the ringing spring, shrinks away with the fade
   trailing the scale so the collapse is watched, not dissolved through. */
.${P}-tooltip-anchor {
  --${P}--tooltip-pre-scale: 0.8;
  --${P}--tooltip-exit-duration: 160ms;
  --${P}--tooltip-exit-scale: 0.72;
  --${P}--tooltip-exit-ease: cubic-bezier(0.42, 0, 0.58, 1);
  --${P}--tooltip-exit-fade: cubic-bezier(0.55, 0, 0.9, 0.5);
  --${P}--tooltip-spring-dur: 400ms;
  --${P}--tooltip-spring: linear(
    0 0%, 0.0308 2.8%, 0.113 5.6%, 0.2314 8.3%, 0.3717 11.1%, 0.5211 13.9%,
    0.669 16.7%, 0.8068 19.4%, 0.9284 22.2%, 1.0297 25%, 1.1089 27.8%,
    1.1657 30.6%, 1.2012 33.3%, 1.2176 36.1%, 1.2177 38.9%, 1.2048 41.7%,
    1.1822 44.4%, 1.1534 47.2%, 1.1211 50%, 1.0881 52.8%, 1.0564 55.6%,
    1.0277 58.3%, 1.003 61.1%, 0.9831 63.9%, 0.9681 66.7%, 0.958 69.4%,
    0.9523 72.2%, 0.9505 75%, 0.952 77.8%, 0.9559 80.6%, 0.9616 83.3%,
    0.9683 86.1%, 0.9755 88.9%, 0.9827 91.7%, 0.9893 94.4%, 0.9951 97.2%, 1 100%
  );

  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  z-index: 1;
  transform: translateX(-50%) scale(var(--${P}--tooltip-pre-scale));
  transform-origin: 50% 100%;
  opacity: 1;
  pointer-events: none;
  transition: transform var(--${P}--tooltip-spring-dur) var(--${P}--tooltip-spring);
}

.${P}-tooltip {
  display: block;
  padding: 4px 8px;
  border-radius: 33px;
  background: var(--${P}-tooltip, #0b0b0c);
  color: var(--${P}-tooltip-foreground, #ffffff);
  font-size: 13px;
  font-weight: 400;
  line-height: 16px;
  white-space: nowrap;
}

.${P}-tooltip-visible {
  transform: translateX(-50%) scale(1);
}

.${P}-tooltip-hiding {
  opacity: 0;
  transform: translateX(-50%) scale(var(--${P}--tooltip-exit-scale));
  transition:
    transform var(--${P}--tooltip-exit-duration) var(--${P}--tooltip-exit-ease),
    opacity var(--${P}--tooltip-exit-duration) var(--${P}--tooltip-exit-fade);
}

@media (prefers-reduced-motion: reduce) {
  .${P}-satellite,
  .${P}-trigger,
  .${P}-trigger-icon,
  .${P}-tooltip-anchor,
  .${P}-tooltip-hiding {
    transition: none;
  }
}

/* Labs: contrast on request (ports/README.md). The rim is faint by design;
   asked for more contrast, it takes the text colour. */
@media (prefers-contrast: more) {
  .${P}-anchor {
    --${P}-rim: currentColor;
  }
}

/* Labs: forced colors. The goo picture is decoration and steps aside; the
   crisp bodies keep system-colour borders, the focus ring the system's. */
@media (forced-colors: active) {
  .${P}-goo {
    display: none;
  }
  .${P}-bodies {
    filter: none;
  }
  .${P}-trigger-body,
  .${P}-satellite-body {
    border-color: CanvasText;
    background: Canvas;
  }
  .${P}-satellite,
  .${P}-trigger {
    color: ButtonText;
    forced-color-adjust: none;
  }
  .${P}-trigger:focus-visible,
  .${P}-satellite:focus-visible {
    outline-color: Highlight;
  }
}

/* Labs: the press-and-drag gesture needs the pointer for itself. Without
   this a touch drag scrolls the page and the browser cancels the gesture a
   few pixels in, so the liquid finger never stretches on a phone. */
.${P}-trigger,
.${P}-satellite {
  touch-action: none;
}
`;

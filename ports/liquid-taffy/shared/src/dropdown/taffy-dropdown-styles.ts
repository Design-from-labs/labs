// ---- upstream: src/components/liquid/dropdown.module.css ----
// The dropdowns' shared stylesheet (with RowHover.module.css,
// SelectionBurst.module.css and the focus rule of styles/global.css), line
// for line. Labs changes (fidelity.md): class names are `<component>-<name>`
// instead of CSS modules; the palette is the component's own `--<component>-*`
// tokens (upstream's values as fallbacks) instead of the app's `--liquid-*`;
// private variables are `--<component>--*`; the type inherits the page font
// at upstream's 13px; logical insets; forced-colors and prefers-contrast
// rules are additions (marked).

/** The stylesheet of one dropdown; `bottom` is where its panel sits. */
export function taffyDropdownStyles(p: string, bottom: number): string {
  return `
/* THE DROPDOWN'S SURFACE — one copy, worn by both variants. The anchored
   dropdown hangs its panel above the button; the morphing one pours the
   button itself into the panel's place. That difference is ONE number —
   where the panel's box sits. */

.${p}-anchor {
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

.${p}-anchor *,
.${p}-anchor *::before,
.${p}-anchor *::after {
  box-sizing: border-box;
}

/* ONE silhouette shadow for the crisp picture — the same drop-shadow the goo
   wears, on the container, so it shades the UNION of the bodies. Per-body
   shadows summed where the panel stood over the button, so every goo↔crisp
   swap made the shadow visibly deepen or thin; with both layers shading the
   same silhouette through the same variable the swap is pixel-identical. */
.${p}-bodies {
  position: absolute;
  inset: 0;
  filter: var(--${p}-shadow, drop-shadow(0 3px 3.125px rgb(0 0 0 / 8%)));
}

.${p}-trigger-body {
  position: absolute;
  inset-inline-start: 0;
  top: 0;
  width: 32px;
  height: 32px;
  border-radius: 16px;
  background: var(--${p}-fill, #ffffff);
  border: 1px solid var(--${p}-rim, #dadada);
  will-change: transform;
}

/* The panel's body — an SVG, so the shape is a true squircle with the
   border as a stroke. WHERE it sits is the host's. */
.${p}-panel-body {
  position: absolute;
  inset-inline-start: -54.5px; /* centers the 141px panel on the 32px button */
  bottom: ${bottom}px;
  width: 141px;
  overflow: visible;
  will-change: transform;
}

.${p}-panel-body-shape {
  fill: var(--${p}-fill, #ffffff);
  stroke: var(--${p}-rim, #dadada);
  stroke-width: 1;
}

/* The goo canvas — headroom for the panel, the grab finger and the blur. */
.${p}-goo {
  position: absolute;
  right: -144px; /* canvas 320 minus the button's right edge at x=176 */
  /* 72px below the button: a full-length finger pulled down, its head and the
     blur's tail all have to land inside the canvas or they are cut off. */
  bottom: -72px;
  width: 320px;
  z-index: 1;
  overflow: visible;
  pointer-events: none;
}

.${p}-blob {
  fill: var(--${p}-fill, #ffffff);
  will-change: transform;
}

/* The seam wash. Opacity is the only thing animated on it — the gradient
   underneath carries where and how wide. Hidden until the engine lights it,
   and hidden rather than merely transparent: the mask that cuts this wash
   down to the rim runs the goo's blur a SECOND time, and a browser is only
   guaranteed to skip that for something it is not painting. */
.${p}-seam {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  will-change: opacity;
}

/* The light frame carries no joint colour at all. Taken out of the picture
   here rather than by refusing to measure: the engine still reports every
   contact — the glyphs and the voice live off those — it just has nothing to
   paint on this stage. display, not visibility, because the engine writes
   visibility itself. */
.${p}-anchor[data-theme="light"] .${p}-seam {
  display: none;
}

/* Rows above the goo, sharing the panel's rect and transforms. */
.${p}-panel {
  position: absolute;
  inset-inline-start: -54.5px;
  bottom: ${bottom}px;
  width: 141px;
  padding: 7px;
  z-index: 2;
  display: flex;
  flex-direction: column;
  will-change: transform;
}

.${p}-item {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  height: 30px;
  margin: 0;
  padding: 0 7px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: var(--${p}-text, #1f2029);
  font: inherit;
  font-size: 13px;
  text-align: start;
  white-space: nowrap;
  cursor: pointer;
  /* The neon catch (grab feedback) writes color/filter inline; this is the
     breath it rides in and out on. */
  transition:
    color 200ms cubic-bezier(0.23, 1, 0.32, 1),
    filter 200ms cubic-bezier(0.23, 1, 0.32, 1);
}

/* THE SELECTION WASH — one shape per run of neighbouring ticks, wearing the
   rows' own neutral tint, flat: colour lives only in the icons. Geometry
   arrives from taffy-select.ts — the radii between selected neighbours
   collapse, so two rows ticked together read as ONE rounded shape — and both
   the fade and the radii are interpolable, so selecting, merging and
   splitting all breathe instead of snapping. */
.${p}-item::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  border-radius: var(--${p}--sel-radius-top) var(--${p}--sel-radius-top) var(--${p}--sel-radius-bottom)
    var(--${p}--sel-radius-bottom);
  background: var(--${p}-item-tint, rgb(0 0 0 / 4.5%));
  opacity: 0;
  transition:
    opacity 200ms cubic-bezier(0.23, 1, 0.32, 1),
    border-radius 260ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* The run's own opacity is a VARIABLE, so the close can pull every wash down
   as one before the panel dives. Selection changes still fade on the
   transition above; the close turns that transition off (see [data-wash])
   and drives the variable itself, so the two never chase each other. */
.${p}-item[data-selected]::before {
  opacity: var(--${p}--sel-alpha, 1);
}

.${p}-panel[data-wash] .${p}-item::before {
  transition: none;
}

/* The hover is NOT here: it is one pill travelling under the whole list
   (taffy-row-hover.tsx). */

/* The icon: colour and glow are CSS's: hue on hover and while ticked, the
   bloom on a shorter clock than the colour (a bloom spends most of its ramp
   invisible, so an equal clock reads as arriving late). */
.${p}-item-icon {
  position: relative;
  z-index: 1;
  width: 12px;
  height: 12px;
  flex-shrink: 0;
  color: inherit;
  filter: drop-shadow(0 0 3px transparent) drop-shadow(0 0 8px transparent);
  /* On the travelling pill's own clock: the pill lands in ~190ms, so the hue
     arrives with it and the bloom (which spends most of its ramp invisible) a
     beat ahead — anything slower read as the icon waking up late. */
  transition:
    color 120ms cubic-bezier(0.23, 1, 0.32, 1),
    filter 90ms cubic-bezier(0.23, 1, 0.32, 1);
}

/* Dark frame only: there a row's glyph wears its hue on hover and while
   ticked. On the light frame the family is monochrome — the glyph keeps the
   row's own ink, and a tick reads by its SHAPE alone. Labs: keyboard focus
   lights it the same way as the pointer. */
.${p}-anchor[data-theme="dark"] .${p}-item:hover .${p}-item-icon,
.${p}-anchor[data-theme="dark"] .${p}-item:focus-visible .${p}-item-icon,
.${p}-anchor[data-theme="dark"] .${p}-item[data-selected] .${p}-item-icon {
  color: var(--${p}--row-hue);
  filter: drop-shadow(0 0 3px color-mix(in srgb, var(--${p}--row-hue) 88%, transparent))
    drop-shadow(0 0 8px color-mix(in srgb, var(--${p}--row-hue) 45%, transparent));
}

/* The content wrapper — what the entry stagger actually moves. Above the
   wash, carrying the row's own layout. */
.${p}-item-inner {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  will-change: transform;
}

.${p}-item-label {
  position: relative;
  z-index: 1;
}

/* Transparent hit area over the circle; the icon rides above the goo. */
.${p}-trigger {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 16px;
  background: none;
  color: var(--${p}-icon, #252731);
  font: inherit;
  cursor: pointer;
  transition:
    color 160ms cubic-bezier(0.23, 1, 0.32, 1),
    background-color 160ms cubic-bezier(0.23, 1, 0.32, 1);
}

.${p}-trigger:hover {
  color: var(--${p}-icon-hover, #000000);
  background: var(--${p}-trigger-tint, rgb(0 0 0 / 4.5%));
}

/* Whenever the liquid owns the picture (an open/close flight, a morph or a
   grab), the button's crisp hover disc steps aside: painted over the moving
   goo it reads as a second border, and during a grab it would double the
   hover tint the liquid itself already wears. */
.${p}-anchor[data-liquid] .${p}-trigger:hover,
.${p}-anchor[data-liquid] .${p}-trigger {
  background: none;
}

.${p}-trigger-icon {
  display: flex;
  will-change: transform;
}

/* The app stylesheet's focus ring (styles/global.css). */
.${p}-trigger:focus-visible,
.${p}-item:focus-visible {
  outline: 2px solid var(--${p}-focus-ring, #1172fa);
  outline-offset: 2px;
}

/* ---- upstream: src/components/liquid/RowHover.module.css ----
   The travelling hover pill. Position, travel and squash are the engine's;
   this owns only what it looks like — one row's height, four rounded
   corners, and the surface's own NEUTRAL tint. */
.${p}-hover {
  position: absolute;
  top: 0;
  z-index: 0;
  border-radius: 9px;
  background: var(--${p}-item-tint, rgb(0 0 0 / 4.5%));
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  will-change: transform;
}

/* ---- upstream: src/components/liquid/SelectionBurst.module.css ----
   The burst's stage: a layer sitting exactly on the panel's box, painted
   BEFORE the panel's body in the anchor, so everything on it is behind the
   dropdown — a piece exists only where it sticks out past the silhouette. No
   overflow clipping: the flight lives outside the box. */
.${p}-burst {
  position: absolute;
  pointer-events: none;
}

/* One glyph piece. Everything that moves it is the engine's; it idles
   hidden in the middle of the layer, waiting for a full set. */
.${p}-burst-piece {
  position: absolute;
  left: 50%;
  top: 50%;
  opacity: 0;
  visibility: hidden;
  will-change: transform;
}

.${p}-burst-piece svg {
  display: block;
}

@media (prefers-reduced-motion: reduce) {
  .${p}-item,
  .${p}-item::before,
  .${p}-item-icon {
    transition: none;
  }
}

/* Labs: contrast on request (ports/README.md). The rim and the selection
   wash are faint by design; asked for more contrast, they darken. */
@media (prefers-contrast: more) {
  .${p}-anchor {
    --${p}-rim: currentColor;
  }
  .${p}-item::before,
  .${p}-hover {
    background: color-mix(in srgb, currentColor 18%, transparent);
  }
}

/* Labs: forced colors. The goo picture is decoration and steps aside; the
   crisp bodies keep system-colour borders, a selected row shows Highlight,
   and the focus ring uses the system's. */
@media (forced-colors: active) {
  .${p}-goo {
    display: none;
  }
  .${p}-bodies {
    filter: none;
  }
  .${p}-trigger-body {
    border-color: CanvasText;
    background: Canvas;
  }
  .${p}-panel-body-shape {
    fill: Canvas;
    stroke: CanvasText;
  }
  .${p}-item[data-selected]::before {
    background: Highlight;
    opacity: 0.35;
  }
  .${p}-item,
  .${p}-trigger {
    color: ButtonText;
    forced-color-adjust: none;
  }
  .${p}-trigger:focus-visible,
  .${p}-item:focus-visible {
    outline-color: Highlight;
  }
}

/* Labs: the press-and-drag gesture needs the pointer for itself. Without
   this a touch drag scrolls the page and the browser cancels the gesture a
   few pixels in, so the liquid finger never stretches on a phone. */
.${p}-trigger,
.${p}-panel {
  touch-action: none;
}
`;
}

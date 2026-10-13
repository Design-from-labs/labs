/**
 * Rendered inside a shadow root, so these selectors cannot collide with host
 * application CSS and host resets cannot reach in and break the overlay.
 *
 * Design From Labs port: custom properties inherit into a shadow tree (and
 * `all: initial` leaves them alone), so the overlay colors read the
 * component-prefixed tokens `--guideframe-grid-*` from the page, each with
 * upstream's value as its fallback. `direction` also inherits: the panel
 * mirrors in a right-to-left page, while the rulers, grid, guides and readouts
 * stay left-to-right because they measure physical CSS pixels.
 */
export const OVERLAY_STYLES = `
:host {
  all: initial;
}

* {
  box-sizing: border-box;
}

.gf-root {
  position: var(--guideframe-grid-position, fixed);
  inset: 0;
  z-index: var(--guideframe-grid-z-index, 2147483647);
  pointer-events: none;
  overflow: hidden;
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  font-size: 10px;
  line-height: 1;
  color-scheme: light dark;
}

/* The overlay is a development aid; never let it reach paper or PDFs. */
@media print {
  .gf-root { display: none !important; }
}

.gf-grid-layer,
.gf-guides-layer,
.gf-selection-layer,
.gf-inspector-layer,
.gf-ruler,
.gf-ruler-corner,
.gf-readout {
  direction: ltr;
}

.gf-grid-layer {
  position: absolute;
  inset: 0;
  display: flex;
  justify-content: center;
  pointer-events: none;
}

.gf-grid {
  width: 100%;
  height: 100%;
  display: grid;
  contain: layout paint;
  box-sizing: border-box;
}

.gf-column {
  background: var(--guideframe-grid-color, rgb(255 0 84));
  clip-path: inset(0 0 0 0);
  animation: guideframe-grid-reveal 620ms ease-in-out both;
  animation-delay: var(--guideframe-grid-delay, 0ms);
}

@keyframes guideframe-grid-reveal {
  from { clip-path: inset(0 0 100% 0); }
  to { clip-path: inset(0 0 0 0); }
}

@media (prefers-reduced-motion: reduce) {
  .gf-column { animation: none; }
}

/* ---------------------------------------------------------------- rulers -- */

.gf-ruler {
  position: absolute;
  background: var(--guideframe-grid-ruler, rgba(24, 24, 27, 0.92));
  color: var(--guideframe-grid-ruler-foreground, rgba(255, 255, 255, 0.75));
  pointer-events: auto;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  overflow: hidden;
}

.gf-ruler-x {
  top: 0;
  left: 0;
  right: 0;
  height: var(--guideframe-grid-ruler-size, 20px);
  cursor: ns-resize;
  border-bottom: 1px solid rgba(255, 255, 255, 0.18);
}

.gf-ruler-y {
  top: 0;
  left: 0;
  bottom: 0;
  width: var(--guideframe-grid-ruler-size, 20px);
  cursor: ew-resize;
  border-right: 1px solid rgba(255, 255, 255, 0.18);
}

.gf-ruler-corner {
  position: absolute;
  top: 0;
  left: 0;
  width: var(--guideframe-grid-ruler-size, 20px);
  height: var(--guideframe-grid-ruler-size, 20px);
  background: rgba(24, 24, 27, 0.98);
  border-right: 1px solid rgba(255, 255, 255, 0.18);
  border-bottom: 1px solid rgba(255, 255, 255, 0.18);
  pointer-events: auto;
  cursor: pointer;
}

.gf-tick {
  position: absolute;
  background: rgba(255, 255, 255, 0.35);
}

.gf-ruler-x .gf-tick { bottom: 0; width: 1px; }
.gf-ruler-y .gf-tick { right: 0; height: 1px; }

.gf-tick-column {
  background: var(--guideframe-grid-color, rgb(255 0 84));
  opacity: 0.9;
}

.gf-tick-label {
  position: absolute;
  font-size: 9px;
  letter-spacing: 0.02em;
  white-space: nowrap;
  opacity: 0.75;
}

.gf-ruler-x .gf-tick-label { top: 3px; transform: translateX(3px); }
.gf-ruler-y .gf-tick-label {
  left: 3px;
  transform-origin: 0 0;
  transform: rotate(90deg) translateX(3px);
}

/* ---------------------------------------------------------------- guides -- */

.gf-guide {
  position: absolute;
  pointer-events: none;
}

.gf-guide-line {
  position: absolute;
  background: var(--guideframe-grid-guide-color, var(--guideframe-grid-guide, rgb(0 138 255)));
  pointer-events: none;
}

/*
 * A 1px line is impossible to grab, so each guide gets a wider transparent
 * hit strip. It is the only part of the guide that takes pointer events.
 */
.gf-guide-hit {
  position: absolute;
  pointer-events: auto;
  touch-action: none;
  background: transparent;
}

.gf-guide-x {
  top: 0;
  bottom: 0;
  width: 0;
}

.gf-guide-x .gf-guide-line {
  top: 0;
  bottom: 0;
  left: 0;
  width: 1px;
}

.gf-guide-x .gf-guide-hit {
  top: 0;
  bottom: 0;
  left: -5px;
  width: 11px;
  cursor: ew-resize;
}

.gf-guide-y {
  left: 0;
  right: 0;
  height: 0;
}

.gf-guide-y .gf-guide-line {
  left: 0;
  right: 0;
  top: 0;
  height: 1px;
}

.gf-guide-y .gf-guide-hit {
  left: 0;
  right: 0;
  top: -5px;
  height: 11px;
  cursor: ns-resize;
}

.gf-guide-locked .gf-guide-hit {
  pointer-events: none;
  cursor: default;
}

.gf-guide-locked .gf-guide-line {
  opacity: 0.55;
}

.gf-guide-dragging .gf-guide-line {
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--guideframe-grid-guide, rgb(0 138 255)) 35%, transparent);
}

/* A selected guide can be deleted with Backspace/Delete, so it needs to be
 * obvious which one has focus. */
.gf-guide-selected .gf-guide-line {
  background: var(--guideframe-grid-guide-selected-color, var(--guideframe-grid-guide-selected, rgb(255 0 84)));
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--guideframe-grid-guide-selected, rgb(255 0 84)) 25%, transparent);
}

.gf-guide-x .gf-guide-handle,
.gf-guide-y .gf-guide-handle {
  position: absolute;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--guideframe-grid-guide-selected-color, var(--guideframe-grid-guide-selected, rgb(255 0 84)));
  pointer-events: none;
  opacity: 0;
}

.gf-guide-x .gf-guide-handle {
  top: calc(var(--guideframe-grid-ruler-size, 20px) + 4px);
  left: -3px;
}

.gf-guide-y .gf-guide-handle {
  left: calc(var(--guideframe-grid-ruler-size, 20px) + 4px);
  top: -3px;
}

.gf-guide-selected .gf-guide-handle {
  opacity: 1;
}

/* ------------------------------------------------------ guide selection -- */

.gf-selection-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.gf-selection-box {
  position: absolute;
  border: 1px solid rgba(0, 138, 255, 0.9);
  background: rgba(0, 138, 255, 0.1);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
}

.gf-selection-status {
  position: fixed;
  left: 50%;
  bottom: 16px;
  z-index: 3;
  padding: 6px 9px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  background: rgba(24, 24, 27, 0.94);
  color: rgba(255, 255, 255, 0.9);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.22);
  font-size: 10px;
  white-space: nowrap;
  pointer-events: none;
  transform: translateX(-50%);
}

/* Design From Labs port: a scoped overlay keeps its status pills inside the
 * container instead of pinning them to the viewport. */
.gf-root-scoped .gf-selection-status,
.gf-root-scoped .gf-inspector-status {
  position: absolute;
}

/* --------------------------------------------------------------- readout -- */

.gf-readout {
  position: absolute;
  padding: 4px 7px;
  border-radius: 4px;
  background: rgba(24, 24, 27, 0.95);
  color: #fff;
  font-size: 10px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  pointer-events: none;
  transform: translate(8px, 8px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
}

.gf-readout-hint {
  opacity: 0.6;
  margin-left: 6px;
}

/* ------------------------------------------------------ geometry inspector -- */

.gf-inspector-layer {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.gf-inspector-box {
  position: absolute;
  border: 1px solid rgb(94 173 255);
  background: rgba(49, 143, 255, 0.08);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.12);
}

.gf-inspector-pinned {
  border-color: var(--guideframe-grid-color, rgb(255 0 84));
  background: rgba(255, 0, 84, 0.06);
}

.gf-inspector-margin {
  position: absolute;
  border: 1px dashed rgba(251, 191, 36, 0.88);
  background: rgba(251, 191, 36, 0.06);
}

.gf-inspector-padding {
  position: absolute;
  background: rgba(52, 211, 153, 0.3);
  box-shadow: inset 0 0 0 0.5px rgba(167, 243, 208, 0.48);
}

.gf-inspector-measure {
  position: absolute;
  z-index: 3;
  color: rgb(253, 224, 71);
  background: currentColor;
}

.gf-inspector-measure::before,
.gf-inspector-measure::after {
  content: "";
  position: absolute;
  background: currentColor;
}

.gf-inspector-measure span {
  position: absolute;
  min-width: 20px;
  padding: 3px 5px;
  border: 1px solid rgba(253, 224, 71, 0.42);
  border-radius: 4px;
  background: rgba(24, 24, 27, 0.96);
  color: rgb(254, 240, 138);
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.22);
  font-size: 10px;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  text-align: center;
}

.gf-inspector-measure-x {
  height: 1px;
}

.gf-inspector-measure-x::before,
.gf-inspector-measure-x::after {
  top: -4px;
  width: 1px;
  height: 9px;
}

.gf-inspector-measure-x::before { left: 0; }
.gf-inspector-measure-x::after { right: 0; }
.gf-inspector-measure-x span {
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
}

.gf-inspector-measure-y {
  width: 1px;
}

.gf-inspector-measure-y::before,
.gf-inspector-measure-y::after {
  left: -4px;
  width: 9px;
  height: 1px;
}

.gf-inspector-measure-y::before { top: 0; }
.gf-inspector-measure-y::after { bottom: 0; }
.gf-inspector-measure-y span {
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
}

.gf-inspector-layout-child,
.gf-inspector-layout-gap {
  position: absolute;
}

.gf-inspector-layout-child {
  border: 1px dashed rgba(167, 139, 250, 0.9);
  background: rgba(139, 92, 246, 0.055);
}

.gf-inspector-layout-gap {
  display: grid;
  place-items: center;
  background: rgba(34, 211, 238, 0.24);
  box-shadow: inset 0 0 0 1px rgba(103, 232, 249, 0.52);
  color: rgb(207, 250, 254);
}

.gf-inspector-layout-gap span {
  z-index: 1;
  min-width: 18px;
  padding: 2px 4px;
  border: 1px solid rgba(103, 232, 249, 0.36);
  border-radius: 4px;
  background: rgba(24, 24, 27, 0.94);
  font-size: 9px;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  text-align: center;
}

.gf-inspector-layout-gap-y span {
  transform: rotate(-90deg);
}

.gf-inspector-layout-axis {
  position: absolute;
  z-index: 2;
  color: rgb(251, 113, 133);
  background: currentColor;
}

.gf-inspector-layout-axis::after {
  content: "";
  position: absolute;
  border: 4px solid transparent;
}

.gf-inspector-layout-axis-x {
  height: 1px;
}

.gf-inspector-layout-axis-x::after {
  right: -2px;
  top: -3.5px;
  border-left-color: currentColor;
}

.gf-inspector-layout-axis-y {
  width: 1px;
}

.gf-inspector-layout-axis-y::after {
  bottom: -2px;
  left: -3.5px;
  border-top-color: currentColor;
}

.gf-inspector-layout-axis-reverse {
  transform: rotate(180deg);
}

.gf-inspector-layout-axis span {
  position: absolute;
  left: 50%;
  top: 0;
  padding: 2px 4px;
  border-radius: 4px;
  background: rgba(24, 24, 27, 0.94);
  color: rgb(254, 205, 211);
  font-size: 9px;
  white-space: nowrap;
  transform: translate(-50%, -50%);
}

.gf-inspector-layout-track {
  position: absolute;
  border: 1px dotted rgba(96, 165, 250, 0.74);
}

.gf-inspector-layout-track span {
  position: absolute;
  left: 3px;
  top: 3px;
  padding: 2px 4px;
  border-radius: 3px;
  background: rgba(30, 58, 138, 0.84);
  color: rgb(219, 234, 254);
  font-size: 8px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.gf-inspector-label,
.gf-inspector-distance {
  position: absolute;
  display: flex;
  z-index: 2;
  padding: 5px 7px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 5px;
  background: rgba(24, 24, 27, 0.96);
  color: #fff;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.24);
  font-size: 10px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  transform: translateY(-100%);
}

.gf-inspector-label { gap: 7px; }
.gf-inspector-label span + span { color: rgba(255, 255, 255, 0.62); }
.gf-inspector-distance {
  color: rgba(255, 255, 255, 0.82);
  transform: translate(-50%, -50%);
}

.gf-inspector-status {
  position: fixed;
  top: 12px;
  left: 50%;
  z-index: 3;
  padding: 7px 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  background: rgba(24, 24, 27, 0.96);
  color: #fff;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.24);
  font-size: 11px;
  line-height: 1;
  white-space: nowrap;
  transform: translateX(-50%);
}

/* --------------------------------------------------------- control panel -- */

.gf-panel {
  position: absolute;
  top: 32px;
  /* Design From Labs port: upstream \`right: 24px\`; logical so a
   * right-to-left page gets the panel on its left, clear of the content's
   * start edge (24px also clears the 20px vertical ruler there). A dragged
   * position is stored as physical left/top, which overrides this. */
  inset-inline-end: 24px;
  width: min(268px, calc(100% - 16px));
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  background: var(--guideframe-grid-panel, rgba(24, 24, 27, 0.96));
  color: var(--guideframe-grid-panel-foreground, rgba(255, 255, 255, 0.92));
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.28), 0 2px 8px rgba(0, 0, 0, 0.18);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  pointer-events: auto;
  font-size: 12px;
  line-height: 1.25;
}

.gf-panel-header {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  min-height: 42px;
  padding-block: 0;
  padding-inline: 12px 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.09);
  cursor: grab;
  user-select: none;
  touch-action: none;
}

.gf-panel-header:active { cursor: grabbing; }
.gf-panel-header strong { font-size: 12px; font-weight: 650; letter-spacing: -0.01em; }

.gf-panel-meta {
  overflow: hidden;
  /* Design From Labs port: upstream used 46% white here and 38% white on the
   * shortcut hints, which measure 4.47:1 and 3.52:1 on the panel (axe
   * color-contrast); 55% clears 4.5:1 for this 9px text. */
  color: var(--guideframe-grid-panel-muted-foreground, rgba(255, 255, 255, 0.55));
  font-size: 9px;
  text-align: end;
  text-transform: capitalize;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.gf-panel-close,
.gf-panel-row,
.gf-panel-clear {
  appearance: none;
  border: 0;
  color: inherit;
  font: inherit;
}

.gf-panel-close {
  display: grid;
  width: 24px;
  height: 24px;
  padding: 0;
  place-items: center;
  border-radius: 6px;
  background: transparent;
  color: rgba(255, 255, 255, 0.56);
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
}

.gf-panel-close:hover { background: rgba(255, 255, 255, 0.08); color: #fff; }
.gf-panel-body { padding: 6px; }

.gf-panel-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 34px;
  padding-block: 0;
  padding-inline: 8px 7px;
  border-radius: 7px;
  background: transparent;
  text-align: start;
  cursor: pointer;
}

.gf-panel-row:hover { background: rgba(255, 255, 255, 0.06); }
.gf-panel-row:disabled { cursor: default; opacity: 0.38; }
.gf-panel-row kbd {
  color: var(--guideframe-grid-panel-muted-foreground, rgba(255, 255, 255, 0.55));
  font: inherit;
  font-size: 9px;
}

.gf-panel-toggle {
  position: relative;
  width: 26px;
  height: 16px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.16);
  transition: background 140ms ease;
}

.gf-panel-toggle::after {
  content: "";
  position: absolute;
  top: 2px;
  inset-inline-start: 2px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.84);
  transition: transform 140ms ease;
}

.gf-panel-row-on .gf-panel-toggle { background: var(--guideframe-grid-color, rgb(255 0 84)); }
.gf-panel-row-on .gf-panel-toggle::after { transform: translateX(10px); background: #fff; }
.gf-panel-row-on .gf-panel-toggle:dir(rtl)::after { transform: translateX(-10px); }

.gf-panel-separator {
  height: 1px;
  margin: 5px 8px;
  background: rgba(255, 255, 255, 0.08);
}

.gf-panel-clear {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: 32px;
  margin-top: 5px;
  padding: 0 8px;
  border-radius: 7px;
  background: transparent;
  color: rgba(255, 120, 137, 0.9);
  text-align: start;
  cursor: pointer;
}

.gf-panel-clear:hover:not(:disabled) { background: rgba(255, 80, 104, 0.09); }
.gf-panel-clear:disabled { cursor: default; opacity: 0.35; }

.gf-panel-clear-chevron {
  color: rgba(255, 120, 137, 0.58);
  font-size: 16px;
  transition: transform 140ms ease;
}

.gf-panel-clear-open .gf-panel-clear-chevron { transform: rotate(90deg); }
/* The chevron glyph is bidi-mirrored in a right-to-left panel, so it turns
 * the other way to point down. */
.gf-panel-clear-open .gf-panel-clear-chevron:dir(rtl) { transform: rotate(-90deg); }

.gf-panel-clear-menu {
  display: grid;
  gap: 2px;
  margin: 2px 0 4px;
  padding: 4px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.035);
}

.gf-panel-clear-action {
  appearance: none;
  width: 100%;
  min-height: 30px;
  padding: 0 8px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: rgba(255, 255, 255, 0.72);
  font: inherit;
  text-align: start;
  cursor: pointer;
}

.gf-panel-clear-action:hover:not(:disabled) { background: rgba(255, 255, 255, 0.06); }
.gf-panel-clear-action:disabled { cursor: default; opacity: 0.3; }
.gf-panel-clear-action-danger { color: rgba(255, 120, 137, 0.9); }

/* Design From Labs port: the shortcut focuses the panel container (tabindex
 * -1) so the next Tab lands on its first control; the container itself is not
 * a control and draws no ring. */
.gf-panel:focus { outline: none; }

.gf-panel button:focus-visible {
  outline: 2px solid var(--guideframe-grid-color, rgb(255 0 84));
  outline-offset: -2px;
}

@media (prefers-reduced-motion: reduce) {
  .gf-panel-toggle,
  .gf-panel-toggle::after,
  .gf-panel-clear-chevron { transition: none; }
}

.gf-hidden { display: none !important; }
`;

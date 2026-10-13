// ---- upstream: packages/sileo/src/styles.css ----
// Labs additions are marked "Labs:". Every custom property carries the
// component's name; the public ones (all optional, with upstream's values as
// fallbacks) are --pill-toast-state-<state> (success, loading, error, warning,
// info, action), --pill-toast-focus-ring and --pill-toast-contrast-ink.
export const pillToastStyles: string = `
/* -------------------------------- Variables ------------------------------- */

:root {
  --pill-toast-spring-easing: linear(
    0,
    0.002 0.6%,
    0.007 1.2%,
    0.015 1.8%,
    0.026 2.4%,
    0.041 3.1%,
    0.06 3.8%,
    0.108 5.3%,
    0.157 6.6%,
    0.214 8%,
    0.467 13.7%,
    0.577 16.3%,
    0.631 17.7%,
    0.682 19.1%,
    0.73 20.5%,
    0.771 21.8%,
    0.808 23.1%,
    0.844 24.5%,
    0.874 25.8%,
    0.903 27.2%,
    0.928 28.6%,
    0.952 30.1%,
    0.972 31.6%,
    0.988 33.1%,
    1.01 35.7%,
    1.025 38.5%,
    1.034 41.6%,
    1.038 45%,
    1.035 50.1%,
    1.012 64.2%,
    1.003 73%,
    0.999 83.7%,
    1
  );

  --pill-toast-duration: 600ms;
  --pill-toast-height: 40px;
  --pill-toast-width: 350px;
}

/* ---------------------------------- Toast --------------------------------- */

[data-pill-toast-card] {
  position: relative;
  cursor: pointer;
  pointer-events: auto;
  touch-action: none;
  border: 0;
  background: transparent;
  padding: 0;
  width: var(--pill-toast-width);
  height: var(--pill-toast-h, var(--pill-toast-height));
  opacity: 0;
  transform: translateZ(0) scale(0.95);
  transform-origin: center;
  contain: layout style;
  overflow: visible;
}

[data-pill-toast-card][data-state="loading"] {
  cursor: default;
}

[data-pill-toast-card][data-ready="true"] {
  opacity: 1;
  transform: translateZ(0) scale(1);
  transition:
    transform calc(var(--pill-toast-duration) * 0.66) var(--pill-toast-spring-easing),
    opacity calc(var(--pill-toast-duration) * 0.66) var(--pill-toast-spring-easing),
    margin-bottom calc(var(--pill-toast-duration) * 0.66) var(--pill-toast-spring-easing),
    margin-top calc(var(--pill-toast-duration) * 0.66) var(--pill-toast-spring-easing),
    height var(--pill-toast-duration) var(--pill-toast-spring-easing);
}

/* Entry animation direction */
[data-pill-toast-viewport][data-position^="top"] [data-pill-toast-card]:not([data-ready="true"]) {
  transform: translateY(-6px) scale(0.95);
}

[data-pill-toast-viewport][data-position^="bottom"] [data-pill-toast-card]:not([data-ready="true"]) {
  transform: translateY(6px) scale(0.95);
}

/* Exit */
[data-pill-toast-card][data-ready="true"][data-exiting="true"] {
  opacity: 0;
  pointer-events: none;
}

[data-pill-toast-viewport][data-position^="top"]
  [data-pill-toast-card][data-ready="true"][data-exiting="true"] {
  transform: translateY(-6px) scale(0.95);
}

[data-pill-toast-viewport][data-position^="bottom"]
  [data-pill-toast-card][data-ready="true"][data-exiting="true"] {
  transform: translateY(6px) scale(0.95);
}

/* ------------------------------- SVG Canvas ------------------------------- */

[data-pill-toast-canvas] {
  position: absolute;
  left: 0;
  right: 0;
  pointer-events: none;
  transform: translateZ(0);
  contain: layout style;
  overflow: visible;
}

[data-pill-toast-canvas][data-edge="top"] {
  bottom: 0;
  transform: scaleY(-1) translateZ(0);
}

[data-pill-toast-canvas][data-edge="bottom"] {
  top: 0;
}

[data-pill-toast-svg] {
  overflow: visible;
}

/* --------------------------------- Shapes --------------------------------- */

/* --------------------------------- Header --------------------------------- */

[data-pill-toast-header] {
  position: absolute;
  z-index: 20;
  display: flex;
  align-items: center;
  padding: 0.5rem;
  height: var(--pill-toast-height);
  overflow: hidden;
  left: var(--pill-toast-px, 0px);
  transform: var(--pill-toast-ht);
  max-width: var(--pill-toast-pw);
}

[data-pill-toast-card][data-ready="true"] [data-pill-toast-header] {
  transition:
    transform var(--pill-toast-duration) var(--pill-toast-spring-easing),
    left var(--pill-toast-duration) var(--pill-toast-spring-easing),
    max-width var(--pill-toast-duration) var(--pill-toast-spring-easing);
}

[data-pill-toast-header][data-edge="top"] {
  bottom: 0;
}

[data-pill-toast-header][data-edge="bottom"] {
  top: 0;
}

/* Header inner morphing */
[data-pill-toast-header-stack] {
  position: relative;
  display: inline-flex;
  align-items: center;
  height: 100%;
}

[data-pill-toast-header-inner] {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  white-space: nowrap;
  opacity: 1;
  filter: blur(0px);
  transform: translateZ(0);
}

[data-pill-toast-header-inner][data-layer="current"] {
  position: relative;
  z-index: 1;
  animation: pill-toast-header-enter var(--pill-toast-duration) var(--pill-toast-spring-easing) both;
}

[data-pill-toast-header-inner][data-layer="current"]:not(:only-child),
[data-pill-toast-header-inner][data-exiting="true"] {
  will-change: opacity, filter;
}

[data-pill-toast-header-inner][data-layer="prev"] {
  position: absolute;
  left: 0;
  top: 0;
  z-index: 0;
  pointer-events: none;
}

[data-pill-toast-header-inner][data-exiting="true"] {
  animation: pill-toast-header-exit calc(var(--pill-toast-duration) * 0.7) ease forwards;
}

/* ---------------------------------- Badge --------------------------------- */

[data-pill-toast-badge] {
  display: flex;
  height: 24px;
  width: 24px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  padding: 2px;
  box-sizing: border-box;
  border-radius: 9999px;
  color: var(--pill-toast-tone, currentColor);
  background-color: var(--pill-toast-tone-bg, transparent);
}

/* ---------------------------------- Title --------------------------------- */

[data-pill-toast-title] {
  font-size: 0.825rem;
  line-height: 1rem;
  font-weight: 500;
  text-transform: capitalize;
  color: var(--pill-toast-tone, currentColor);
}

/* ------------------------------ State Colors ------------------------------ */

:is([data-pill-toast-badge], [data-pill-toast-title], [data-pill-toast-button])[data-state] {
  --pill-toast-base: var(--pill-toast-state-success, oklch(0.723 0.219 142.136));
  --pill-toast-c: var(--pill-toast-base);
}

:is([data-pill-toast-badge], [data-pill-toast-title], [data-pill-toast-button])[data-state="loading"] {
  --pill-toast-base: var(--pill-toast-state-loading, oklch(0.556 0 0));
}

:is([data-pill-toast-badge], [data-pill-toast-title], [data-pill-toast-button])[data-state="error"] {
  --pill-toast-base: var(--pill-toast-state-error, oklch(0.637 0.237 25.331));
}

:is([data-pill-toast-badge], [data-pill-toast-title], [data-pill-toast-button])[data-state="warning"] {
  --pill-toast-base: var(--pill-toast-state-warning, oklch(0.795 0.184 86.047));
}

:is([data-pill-toast-badge], [data-pill-toast-title], [data-pill-toast-button])[data-state="info"] {
  --pill-toast-base: var(--pill-toast-state-info, oklch(0.685 0.169 237.323));
}

:is([data-pill-toast-badge], [data-pill-toast-title], [data-pill-toast-button])[data-state="action"] {
  --pill-toast-base: var(--pill-toast-state-action, oklch(0.623 0.214 259.815));
}

:is([data-pill-toast-badge], [data-pill-toast-title])[data-state] {
  --pill-toast-tone: var(--pill-toast-c);
  --pill-toast-tone-bg: color-mix(in oklch, var(--pill-toast-c) 20%, transparent);
}

/* --------------------------------- Content -------------------------------- */

[data-pill-toast-content] {
  position: absolute;
  left: 0;
  z-index: 10;
  width: 100%;
  pointer-events: none;
  opacity: var(--pill-toast-co, 0);
}

[data-pill-toast-content]:not([data-visible="true"]) {
  content-visibility: hidden;
}

[data-pill-toast-card][data-ready="true"] [data-pill-toast-content] {
  transition: opacity calc(var(--pill-toast-duration) * 0.08) ease calc(var(--pill-toast-duration) * 0.04);
}

[data-pill-toast-content][data-edge="top"] {
  top: 0;
}

[data-pill-toast-content][data-edge="bottom"] {
  top: var(--pill-toast-height);
}

[data-pill-toast-content][data-visible="true"] {
  pointer-events: auto;
}

[data-pill-toast-card][data-ready="true"] [data-pill-toast-content][data-visible="true"] {
  transition: opacity calc(var(--pill-toast-duration) * 0.6) ease calc(var(--pill-toast-duration) * 0.3);
}

[data-pill-toast-description] {
  width: 100%;
  text-align: start;
  padding: 1rem;
  font-size: 0.875rem;
  line-height: 1.25rem;
  contain: layout style paint;
  content-visibility: auto;
}

/* --------------------------------- Button --------------------------------- */

[data-pill-toast-button] {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 1.75rem;
  padding: 0 0.625rem;
  margin-top: 0.75rem;
  border-radius: 9999px;
  border: 0;
  /* Labs: the action is a <button> (upstream: an <a>); a button is as wide as
     its content unless told otherwise, an <a> in a flex row fills it */
  appearance: none;
  box-sizing: border-box;
  width: 100%;
  font-family: inherit;
  line-height: inherit;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  color: var(--pill-toast-btn-color, currentColor);
  background-color: var(--pill-toast-btn-bg, transparent);
  transition: background-color 150ms ease;
}

[data-pill-toast-button]:hover {
  background-color: var(--pill-toast-btn-bg-hover, transparent);
}

[data-pill-toast-button][data-state] {
  --pill-toast-btn-color: var(--pill-toast-c);
  --pill-toast-btn-bg: color-mix(in oklch, var(--pill-toast-c) 15%, transparent);
  --pill-toast-btn-bg-hover: color-mix(in oklch, var(--pill-toast-c) 25%, transparent);
}

/* -------------------------------- Animations ------------------------------ */

[data-pill-toast-icon="spin"] {
  animation: pill-toast-spin 1s linear infinite;
}

@keyframes pill-toast-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes pill-toast-header-enter {
  from {
    opacity: 0;
    filter: blur(6px);
  }
  to {
    opacity: 1;
    filter: blur(0px);
  }
}

@keyframes pill-toast-header-exit {
  from {
    opacity: 1;
    filter: blur(0px);
  }
  to {
    opacity: 0;
    filter: blur(6px);
  }
}

/* -------------------------------- Viewports ------------------------------- */

[data-pill-toast-viewport] {
  position: fixed;
  z-index: 50;
  display: flex;
  gap: 0.75rem;
  padding: 0.75rem;
  pointer-events: none;
  max-width: calc(100vw - 1.5rem);
  contain: layout style;
}

[data-pill-toast-viewport][data-position^="top"] [data-pill-toast-card]:not([data-ready="true"]) {
  margin-bottom: calc(-1 * (var(--pill-toast-height) + 0.75rem));
}

[data-pill-toast-viewport][data-position^="bottom"] [data-pill-toast-card]:not([data-ready="true"]) {
  margin-top: calc(-1 * (var(--pill-toast-height) + 0.75rem));
}

/* Vertical edge */
[data-pill-toast-viewport][data-position^="top"] {
  top: 0;
  flex-direction: column-reverse;
}

[data-pill-toast-viewport][data-position^="bottom"] {
  bottom: 0;
  flex-direction: column;
}

/* Horizontal alignment */
[data-pill-toast-viewport][data-position$="left"] {
  left: 0;
  align-items: flex-start;
}

[data-pill-toast-viewport][data-position$="right"] {
  right: 0;
  align-items: flex-end;
}

[data-pill-toast-viewport][data-position$="center"] {
  left: 50%;
  transform: translateX(-50%);
  align-items: center;
}

@media (prefers-reduced-motion: no-preference) {
  [data-pill-toast-card][data-ready="true"]:hover,
  [data-pill-toast-card][data-ready="true"][data-exiting="true"] {
    will-change: transform, opacity, height;
  }
}

@media (prefers-reduced-motion: reduce) {
  [data-pill-toast-viewport],
  [data-pill-toast-viewport] *,
  [data-pill-toast-viewport] *::before,
  [data-pill-toast-viewport] *::after {
    animation-duration: 0.01ms;
    animation-iteration-count: 1;
    transition-duration: 0.01ms;
  }
}

/* --------------------------------- Themes -------------------------------- */

[data-pill-toast-viewport][data-theme="dark"] [data-pill-toast-description] {
  color: rgba(0, 0, 0, 0.5);
}

[data-pill-toast-viewport][data-theme="light"] [data-pill-toast-description] {
  color: rgba(255, 255, 255, 0.5);
}
/* ----------------------------- Labs: keyboard ----------------------------- */

/* The card takes focus (when it has a description) and opens on keyboard
   focus. Its ring follows the card's own silhouette, the pill and the body
   together, so it reads the same open or closed. */
[data-pill-toast-card]:focus-visible {
  outline: none;
}

[data-pill-toast-card]:focus-visible [data-pill-toast-canvas] {
  filter:
    drop-shadow(2px 0px 0 var(--pill-toast-focus-ring, #3b82f6))
    drop-shadow(-2px 0px 0 var(--pill-toast-focus-ring, #3b82f6))
    drop-shadow(0px 2px 0 var(--pill-toast-focus-ring, #3b82f6))
    drop-shadow(0px -2px 0 var(--pill-toast-focus-ring, #3b82f6));
}

[data-pill-toast-button]:focus-visible {
  outline: 2px solid var(--pill-toast-focus-ring, #3b82f6);
  outline-offset: 2px;
}

/* ---------------------------- Labs: contrast ------------------------------ */

/* Fidelity default, contrast on request: upstream's state colors are below
   4.5:1 for titles on the white and near-white fills, so they darken (lighten
   on the dark fill) only for visitors who ask for more contrast. The ink they
   mix toward is a token, for custom fills. */
@media (prefers-contrast: more) {
  [data-pill-toast-viewport] {
    --pill-toast-contrast-ink: #000;
  }

  [data-pill-toast-viewport][data-theme="light"] {
    --pill-toast-contrast-ink: #fff;
  }

  :is([data-pill-toast-badge], [data-pill-toast-title], [data-pill-toast-button])[data-state] {
    --pill-toast-c: color-mix(in oklch, var(--pill-toast-base) 60%, var(--pill-toast-contrast-ink, #000));
  }

  [data-pill-toast-button][data-state] {
    --pill-toast-btn-bg: color-mix(in oklch, var(--pill-toast-c) 10%, transparent);
    --pill-toast-btn-bg-hover: color-mix(in oklch, var(--pill-toast-c) 20%, transparent);
  }

  [data-pill-toast-viewport][data-theme="dark"] [data-pill-toast-description] {
    color: rgba(0, 0, 0, 0.85);
  }

  [data-pill-toast-viewport][data-theme="light"] [data-pill-toast-description] {
    color: rgba(255, 255, 255, 0.85);
  }
}

/* Forced colors: system colors; the gooey filter is dropped so the shapes read
   as crisp outlines (the fill would otherwise vanish into the canvas). */
@media (forced-colors: active) {
  [data-pill-toast-svg] g {
    filter: none;
  }

  [data-pill-toast-pill],
  [data-pill-toast-body] {
    fill: Canvas;
    stroke: CanvasText;
    stroke-width: 1px;
  }

  [data-pill-toast-card]:focus-visible [data-pill-toast-canvas] {
    filter: none;
  }

  [data-pill-toast-card]:focus-visible [data-pill-toast-pill],
  [data-pill-toast-card]:focus-visible [data-pill-toast-body] {
    stroke: Highlight;
    stroke-width: 3px;
  }

  [data-pill-toast-badge],
  [data-pill-toast-title],
  [data-pill-toast-description],
  [data-pill-toast-button] {
    color: CanvasText;
    forced-color-adjust: auto;
  }

  [data-pill-toast-button] {
    border: 1px solid ButtonText;
    background-color: ButtonFace;
    color: ButtonText;
  }

  [data-pill-toast-button]:focus-visible {
    outline: 2px solid Highlight;
    outline-offset: 2px;
  }
}
`;

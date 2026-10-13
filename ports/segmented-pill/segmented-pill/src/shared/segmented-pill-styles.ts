// ---- upstream: src/style.css ----
// Upstream's stylesheet, rule for rule and in the same order, as a string the
// component renders in a hoisted <style> (React 19 adds it to <head> once,
// however many controls render; no CSS import is needed). Labs changes:
// - the classes are `segmented-pill` and `segmented-pill__indicator`
//   (upstream: `segmented-control`, `segmented-control__indicator`);
// - the themable `--segmented-*` variables are read as `--segmented-pill-*`,
//   with upstream's values as the fallbacks, so the item's cssVars, a class or
//   an inline style can set them;
// - an item is `:is(button, label)` (same specificity as upstream's `button`),
//   so the React Aria variant's radio labels share every rule; their focus and
//   disabled states are React Aria's `data-focus-visible` and `data-disabled`;
// - additions that do not change the default look: `prefers-contrast: more`
//   (an outlined pill and darker labels) and `forced-colors: active` (the pill
//   in Highlight, the selected label in HighlightText).
export const segmentedPillCss = `
.segmented-pill {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: var(--segmented-pill-gap, 2px);
  padding: var(--segmented-pill-padding, 2px);
  border-radius: var(--segmented-pill-radius, 8px);
  background: var(--segmented-pill-track, rgb(0 0 0 / 5%));
  color: var(--segmented-pill-text, #52525b);
  font-family: var(--segmented-pill-font-family, "Geist", "Geist Variable", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
  isolation: isolate;
  -webkit-font-smoothing: antialiased;
}

.segmented-pill > :is(button, label) {
  position: relative;
  z-index: 1;
  min-width: 0;
  margin: 0;
  padding: 5px 10px;
  appearance: none;
  border: 0;
  border-radius: calc(var(--segmented-pill-radius, 8px) - var(--segmented-pill-padding, 2px));
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 11.5px;
  font-weight: 500;
  line-height: 1;
  letter-spacing: -0.02em;
  white-space: nowrap;
  cursor: pointer;
  transition-property: color, opacity;
  transition-duration: 120ms;
  transition-timing-function: ease;
}

.segmented-pill > :is(button, label):hover,
.segmented-pill > :is(button, label).is-active {
  color: var(--segmented-pill-text-active, #18181b);
}

.segmented-pill > button:focus-visible,
.segmented-pill > label[data-focus-visible] {
  outline: 2px solid var(--segmented-pill-focus, #2563eb);
  outline-offset: -2px;
}

.segmented-pill > button:disabled,
.segmented-pill > label[data-disabled] {
  opacity: 0.42;
  cursor: not-allowed;
}

.segmented-pill__indicator {
  position: absolute;
  z-index: 0;
  top: 0;
  left: 0;
  border-radius: calc(var(--segmented-pill-radius, 8px) - var(--segmented-pill-padding, 2px));
  background: var(--segmented-pill-pill, #ffffff);
  box-shadow: var(--segmented-pill-shadow, 0 0 0 1px rgb(0 0 0 / 6%), 0 1px 2px rgb(0 0 0 / 7%));
  transform-origin: center;
  pointer-events: none;
}

.segmented-pill.is-animated .segmented-pill__indicator {
  transition-property: transform;
  transition-duration: var(--segmented-pill-duration, 260ms);
  transition-timing-function: var(--segmented-pill-easing, cubic-bezier(0.2, 0, 0, 1));
  will-change: transform;
}

@media (prefers-reduced-motion: reduce) {
  .segmented-pill.is-animated .segmented-pill__indicator {
    transition: none;
    will-change: auto;
  }
}

@media (prefers-contrast: more) {
  .segmented-pill {
    color: var(--segmented-pill-text-active, #18181b);
  }

  .segmented-pill__indicator {
    box-shadow: 0 0 0 1px var(--segmented-pill-text-active, #18181b);
  }
}

@media (forced-colors: active) {
  .segmented-pill {
    border: 1px solid CanvasText;
  }

  .segmented-pill__indicator {
    forced-color-adjust: none;
    background: Highlight;
  }

  .segmented-pill > :is(button, label).is-active {
    forced-color-adjust: none;
    color: HighlightText;
  }
}
`;

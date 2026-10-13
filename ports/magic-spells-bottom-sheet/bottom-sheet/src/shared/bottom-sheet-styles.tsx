// ---- upstream: src/bottom-sheet.css, with the dialog-panel rules it relies on ----
// The upstream stylesheet, rule for rule, with its selectors moved off the
// custom elements onto `data-slot` parts and its `--bs-*` properties renamed
// `--bottom-sheet-*`:
//
//   dialog-panel:has(bottom-sheet) > dialog   [data-slot="bottom-sheet-dialog"]
//   dialog-panel[state='shown']               [data-sheet-state="shown"]
//   bottom-sheet[snap-points] / [inset]       [data-snap-points] / [data-inset]
//   .transitioning / .snapping                [data-transitioning] / [data-snapping]
//   bottom-sheet, -header, -content, -footer  [data-slot="bottom-sheet(-...)"]
//
// The selectors keep upstream's specificity ladder (each attribute stands in
// for one class or attribute): a settle outranks the hiding transition, an
// inset sheet's offset outranks the edge sheet's. Rendered as a hoisted
// `<style precedence>` (decision 0013), so the server render is styled.
// Every custom property falls back to upstream's default, so the sheet looks
// the same with or without the item's cssVars. The rules are unlayered, as
// upstream's stylesheet is, so they keep upstream's cascade against a page's
// own CSS; restyle the sheet through the --bottom-sheet-* properties (a
// utility such as [--bottom-sheet-panel-max-width:36rem] works, because the
// sheet only reads them).

const D = '[data-slot="bottom-sheet-dialog"]';

const css = `
${D} {
  background: var(--bottom-sheet-panel-background, white);
  /* the user agent's dialog colour, as a token */
  color: var(--bottom-sheet-panel-foreground, CanvasText);
  box-sizing: border-box;
  border: none;
  border-top-left-radius: var(--bottom-sheet-panel-border-radius, 25px);
  border-top-right-radius: var(--bottom-sheet-panel-border-radius, 25px);
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
  position: fixed;
  flex-direction: column;
  width: 100%;
  /* Added: a cap for wide screens. While the cap is 100% there is no slack
     and the auto inline margins resolve to 0, exactly upstream's margin: 0;
     below it they centre the sheet. */
  max-width: var(--bottom-sheet-panel-max-width, 100%);
  max-height: var(--bottom-sheet-panel-max-height, 85vh);
  bottom: 0;
  left: 0;
  right: 0;
  top: auto;
  margin: 0 auto;
  padding: 0;
  padding-bottom: env(safe-area-inset-bottom, 0px);
  overflow: hidden;
  /* A hidden skirt of panel colour below the sheet. An upward rubber-band
     drag lifts the sheet off the bottom edge, and without this the page
     shows through the gap. A spread-less offset shadow paints outside the
     border box, so overflow: hidden cannot clip it and it costs no layout
     — and being part of the sheet's own rendering, it travels with the
     transform. Listed first so it paints over the ambient shadow. */
  box-shadow:
    0 var(--bottom-sheet-panel-bleed, 60px) 0 0 var(--bottom-sheet-panel-background, white),
    var(--bottom-sheet-panel-box-shadow, 0 1px 20px -4px rgba(0, 0, 0, 0.3), 0 0 7px 0 rgba(0, 0, 0, 0.1));
  will-change: transform;
  transition: none;
  /* dialog-panel: closed and before the first state, faded and scaled */
  opacity: 0;
  transform: scale(0.95);
}

/* Only open dialogs get the flex layout — closed dialogs must keep the
   UA's display: none */
${D}[open] {
  display: flex;
}

/* A dialog layer that renders its own surface (Radix, Base UI, React Aria)
   is mounted only while open, above the page */
${D}:not(dialog) {
  display: flex;
  z-index: var(--bottom-sheet-z-index, 50);
}

/* When a footer is present it owns the safe-area padding instead */
${D}:has([data-slot="bottom-sheet-footer"]) {
  padding-bottom: 0;
}

/* State-driven animations. Each rule includes opacity: 1 to override
   dialog-panel's default fade — the sheet uses transform-only (slide). */
${D}[data-sheet-state="hidden"] {
  opacity: 1;
  transform: translate3d(0, calc(100% + var(--bottom-sheet-panel-hidden-offset, 20px)), 0);
}

${D}[data-sheet-state="showing"] {
  opacity: 1;
  transform: translate3d(0, calc(100% + var(--bottom-sheet-panel-hidden-offset, 20px)), 0);
}

${D}[data-sheet-state="shown"] {
  opacity: 1;
  transform: translate3d(0, 0, 0);
}

${D}[data-sheet-state="hiding"] {
  opacity: 1;
  transform: translate3d(0, calc(100% + var(--bottom-sheet-panel-hidden-offset, 20px)), 0);
  transition: transform var(--bottom-sheet-transition-duration, 400ms)
    var(--bottom-sheet-transition-timing, cubic-bezier(0.32, 0.72, 0, 1));
}

/* Drag transitioning (set and cleared by the gesture code). height only
   ever carries a value on a snapping sheet — a binary sheet leaves it auto,
   and auto never animates, so listing it here costs nothing. */
${D}[data-transitioning] {
  transition:
    transform var(--bottom-sheet-transition-duration, 400ms)
      var(--bottom-sheet-transition-timing, cubic-bezier(0.32, 0.72, 0, 1)),
    height var(--bottom-sheet-transition-duration, 400ms)
      var(--bottom-sheet-transition-timing, cubic-bezier(0.32, 0.72, 0, 1));
}

/* Settling onto a snap. Never reaches an open or a close — both travel much
   further and keep the shared duration. Its extra attribute also outranks
   the hiding rule, which is why it must not be left on when a drag
   dismisses instead of snapping. */
${D}[data-transitioning][data-snapping] {
  transition:
    transform var(--bottom-sheet-snap-duration, 400ms)
      var(--bottom-sheet-snap-timing, cubic-bezier(0.2, 1.25, 0.3, 1)),
    height var(--bottom-sheet-snap-duration, 400ms)
      var(--bottom-sheet-snap-timing, cubic-bezier(0.2, 1.25, 0.3, 1));
}

/* ---- Snap points ----
   On a snapping sheet the inline height IS the snap position, so the
   max-height that bounds a binary sheet would only fight it. */
${D}[data-snap-points],
${D}[data-snap-points] [data-slot="bottom-sheet"] {
  max-height: none;
}

/* Fill whatever height the snap gave the dialog, so the footer stays pinned
   to its bottom edge and the content flexes into the visible remainder */
${D}[data-snap-points] [data-slot="bottom-sheet"] {
  height: 100%;
}

/* ---- Inset (detached, fully rounded) ---- */
${D}[data-inset] {
  left: var(--bottom-sheet-panel-inset-x, 12px);
  right: var(--bottom-sheet-panel-inset-x, 12px);
  width: auto;
  max-width: var(--bottom-sheet-panel-max-width, none);
  border-radius: var(--bottom-sheet-panel-border-radius, 25px);
  margin-bottom: calc(var(--bottom-sheet-panel-inset-bottom, 12px) + env(safe-area-inset-bottom, 0px));
  padding-bottom: 0;
  /* No skirt when detached — the gap under the sheet is the whole point */
  box-shadow: var(--bottom-sheet-panel-box-shadow, 0 1px 20px -4px rgba(0, 0, 0, 0.3), 0 0 7px 0 rgba(0, 0, 0, 0.1));
}

/* The bottom margin already clears the safe area, so the footer must not
   add it a second time or a floating sheet gets a double gap */
${D}[data-inset] [data-slot="bottom-sheet-footer"] {
  padding-bottom: var(--bottom-sheet-footer-padding, var(--bottom-sheet-content-padding, 20px));
}

/* Off-screen has to clear the bottom gap too */
${D}[data-inset][data-sheet-state="hidden"],
${D}[data-inset][data-sheet-state="showing"],
${D}[data-inset][data-sheet-state="hiding"] {
  transform: translate3d(
    0,
    calc(
      100% + var(--bottom-sheet-panel-inset-bottom, 12px) + env(safe-area-inset-bottom, 0px) +
        var(--bottom-sheet-panel-hidden-offset, 20px)
    ),
    0
  );
}

/* The native ::backdrop is the scrim: one top-layer surface, created and
   destroyed with the dialog. The dialog stays open until the exit
   transition completes, so the scrim fades out fully before close(). */
${D}::backdrop {
  background: var(--bottom-sheet-overlay-background, rgba(0, 0, 0, 0.5));
  backdrop-filter: blur(var(--bottom-sheet-overlay-blur, 5px));
  opacity: 0;
}

${D}[data-sheet-state="shown"]::backdrop {
  opacity: 1;
  transition: opacity var(--bottom-sheet-transition-duration, 400ms)
    var(--bottom-sheet-transition-timing, cubic-bezier(0.32, 0.72, 0, 1));
}

${D}[data-sheet-state="hiding"]::backdrop {
  opacity: 0;
  transition: opacity var(--bottom-sheet-transition-duration, 400ms)
    var(--bottom-sheet-transition-timing, cubic-bezier(0.32, 0.72, 0, 1));
}

/* A scrim element for dialog layers without a native ::backdrop */
[data-slot="bottom-sheet-overlay"] {
  position: fixed;
  inset: 0;
  z-index: var(--bottom-sheet-z-index, 50);
  background: var(--bottom-sheet-overlay-background, rgba(0, 0, 0, 0.5));
  backdrop-filter: blur(var(--bottom-sheet-overlay-blur, 5px));
  opacity: 0;
}

[data-slot="bottom-sheet-overlay"][data-sheet-state="shown"] {
  opacity: 1;
  transition: opacity var(--bottom-sheet-transition-duration, 400ms)
    var(--bottom-sheet-transition-timing, cubic-bezier(0.32, 0.72, 0, 1));
}

[data-slot="bottom-sheet-overlay"][data-sheet-state="hiding"] {
  opacity: 0;
  transition: opacity var(--bottom-sheet-transition-duration, 400ms)
    var(--bottom-sheet-transition-timing, cubic-bezier(0.32, 0.72, 0, 1));
}

/* dialog-panel: page scroll lock from the first frame of the open through
   the last frame of the close */
body:has(${D}[data-sheet-state="showing"]),
body:has(${D}[data-sheet-state="shown"]),
body:has(${D}[data-sheet-state="hiding"]) {
  overflow: hidden;
}

/* Bottom sheet fills the dialog */
[data-slot="bottom-sheet"] {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  max-height: var(--bottom-sheet-panel-max-height, 85vh);
}

/* Header with drag handle */
[data-slot="bottom-sheet-header"] {
  padding: 0 var(--bottom-sheet-content-padding, 20px);
  position: relative;
  flex-shrink: 0;
  touch-action: none;
}

[data-slot="bottom-sheet-header"]::before {
  content: "";
  display: block;
  background: var(--bottom-sheet-handle-color, #bbb);
  height: var(--bottom-sheet-handle-height, 5px);
  width: var(--bottom-sheet-handle-width, 50px);
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  border-radius: var(--bottom-sheet-handle-height, 5px);
}

/* Pinned footer — only the content region above it flexes */
[data-slot="bottom-sheet-footer"] {
  display: block;
  box-sizing: border-box;
  flex-shrink: 0;
  padding: var(--bottom-sheet-footer-padding, var(--bottom-sheet-content-padding, 20px));
  padding-bottom: calc(
    var(--bottom-sheet-footer-padding, var(--bottom-sheet-content-padding, 20px)) +
      env(safe-area-inset-bottom, 0px)
  );
  background: var(--bottom-sheet-footer-background, transparent);
  touch-action: none;
}

/* Scrollable content */
[data-slot="bottom-sheet-content"] {
  display: block;
  box-sizing: border-box;
  overflow-y: scroll;
  overscroll-behavior-y: contain;
  touch-action: pan-y;
  -webkit-overflow-scrolling: touch;
  padding: var(--bottom-sheet-content-padding-block, 0) var(--bottom-sheet-content-padding, 20px);
  flex: 1;
  min-height: 0;
}

/* Reduced motion: the sheet and the scrim appear and leave in place; drags
   still follow the finger, and settles land without travel. */
@media (prefers-reduced-motion: reduce) {
  ${D},
  ${D}[data-sheet-state],
  ${D}[data-transitioning],
  ${D}[data-transitioning][data-snapping],
  ${D}::backdrop,
  ${D}[data-sheet-state]::backdrop,
  [data-slot="bottom-sheet-overlay"],
  [data-slot="bottom-sheet-overlay"][data-sheet-state] {
    transition: none;
  }
  ${D}[data-sheet-state="showing"],
  ${D}[data-sheet-state="hiding"],
  ${D}[data-inset][data-sheet-state="showing"],
  ${D}[data-inset][data-sheet-state="hiding"] {
    transform: translate3d(0, 0, 0);
  }
  ${D}[data-sheet-state="showing"]::backdrop,
  [data-slot="bottom-sheet-overlay"][data-sheet-state="showing"] {
    opacity: 1;
  }
}

/* Contrast on request: the handle is a faint affordance by design (about
   1.9:1 on white); raised to 4.5:1 when the visitor asks for more */
@media (prefers-contrast: more) {
  [data-slot="bottom-sheet-header"]::before {
    background: var(--bottom-sheet-handle-color-contrast, #767676);
  }
}

/* Forced colors: the panel keeps an edge and the handle a system color */
@media (forced-colors: active) {
  ${D} {
    border: 1px solid CanvasText;
  }
  [data-slot="bottom-sheet-header"]::before {
    background: CanvasText;
  }
}
`;

/** The sheet's stylesheet, hoisted into <head> and deduplicated by React. */
function BottomSheetStyles() {
  return (
    <style href="designfrom-bottom-sheet" precedence="default">
      {css}
    </style>
  );
}

export { BottomSheetStyles, css as bottomSheetCss };

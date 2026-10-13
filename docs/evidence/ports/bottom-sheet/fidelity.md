# bottom-sheet: fidelity

- Upstream: [magic-spells/bottom-sheet `src`](https://github.com/magic-spells/bottom-sheet/tree/75b6ca04d93a11d83918a54cb3562a1a6d906242/src) at `75b6ca04d93a11d83918a54cb3562a1a6d906242` (MIT, copyright 2024 Magic Spells (Cory Schulz); S-401), on [magic-spells/dialog-panel `src`](https://github.com/magic-spells/dialog-panel/tree/07c81f7dc883ddfe7aed7b73c2f614130746665d/src) at `07c81f7dc883ddfe7aed7b73c2f614130746665d` (MIT, same holder; S-402) and npm `@magic-spells/physics-engine` 1.0.0 (MIT, copyright 2026 Cory Schulz @ Magic Spells; S-408), all three rewritten as React.
- Port: `ports/magic-spells-bottom-sheet/bottom-sheet` (variants shape: `src/shared` plus `src/none`, `src/radix`, `src/base`, `src/aria`), exported to `content/components/magic-spells-bottom-sheet/bottom-sheet` (items `bottom-sheet`, `bottom-sheet-radix`, `bottom-sheet-base`, `bottom-sheet-aria`; no icons).
- Renderer: Chromium (Playwright, S-014), device scale 1, `prefers-color-scheme: dark` (the demo page is dark either way).
- Method: upstream's own `demo/index.html` is served as is (with its `dist/` and `vendor/` builds) from a static server. The fidelity page is generated from that same file: everything outside the eleven `<dialog-panel>` sheets is copied verbatim, the page's stylesheet keeps every rule with its selectors mapped to the port's parts and `--bs-*` renamed (below), and the eleven sheets are rendered by the React port from the same inner HTML (header, content, footer) with the same attributes as props; the page script is ported line for line (open buttons, snap readout, event log, width readout, theme dials). `demo/bg-noise.png` (no stated license, P-062) is replaced on both sides by the same original 100x100 noise tile (random gray, alpha 8, as upstream's). Both pages load the same web fonts. Each frame is a fresh page: open a sheet with its trigger, wait 1.4 s (open transition and spring settled), then for snap frames a real pointer click on the sheet's own 70 or 100 button and 1.2 s; mid-drag frames press the header with the mouse, move 150 px up (snap sheet) or 90 px down (basic sheet) in 12 steps 16 ms apart and hold without releasing. Whole viewport, pixelmatch (S-152) threshold 0.1, the capture of `tools/fidelity.mjs` run for all scenes in one lock hold (`fid-batch.mjs`).
- Noise floor: upstream against a second upstream load, same scenes. Upstream's sheet is a composited layer (`will-change: transform`) that is rasterized while it slides, so its text anti-aliasing depends on the frame the raster lands on: up to 0.27% of the viewport differs between two upstream loads.
- Target: at most 0.1% differing pixels, or the measured noise floor.

## Result: pixels that differ

| Frame | 1280x800 port | 1280x800 floor | 375x812 port | 375x812 floor |
| --- | --- | --- | --- | --- |
| closed (page top) | 0.000% | | 0.000% | |
| snap 40 (opened) | 0.000% | 0.000% | 0.000% | 0.000% |
| snap 70 (snapTo button, spring) | 0.000% | 0.000% | 0.000% | 0.272% |
| snap 100 (snapTo button, spring) | 0.000% | 0.000% | 0.272% | 0.000% |
| mid-drag up, snap sheet, 150 px held | 0.000% | | 0.000% | |
| mid-drag down, basic sheet, 90 px held | 0.000% | 0.000% | 0.000% | 0.000% |
| basic sheet open | 0.000% | 0.131% | 0.000% | 0.000% |
| footer (bag) sheet open | 0.000% | 0.000% | 0.000% | 0.000% |
| map sheet at its 25 peek | 0.000% | | 0.055% | |
| inset sheet open | 0.000% | | 0.000% | |
| inset + snap sheet at 40 | 0.000% | | 0.000% | |

Worst port frame: 0.272% (snap 100, 375x812); worst noise floor: 0.272% (snap 70, 375x812, upstream against upstream). Every port frame is at most the floor; 20 of 22 are 0. The differing pixels are glyph edges in the sheet's paragraph (the diff images), the same class as the floor's; the snap 40 frame at 375x812 measured 0.263% in an earlier run and 0.000% in this one, so which frame lands on a different raster changes from run to run, on both sides. Numbers: [fidelity.json](fidelity.json).

Strips, left to right closed, snap 40, 70, 100, mid-drag up, mid-drag down, inset + snap: [1280x800-before.webp](1280x800-before.webp) (upstream), [1280x800-after.webp](1280x800-after.webp) (port), [1280x800-diff.webp](1280x800-diff.webp); [375x812-before.webp](375x812-before.webp), [375x812-after.webp](375x812-after.webp), [375x812-diff.webp](375x812-diff.webp) (pixelmatch; red marks a differing pixel, yellow an anti-aliased one).

## Behavior

Measured on a 375x812 touch-emulated phone with real touch input (CDP touch events, so pointer events and native scrolling run as on a device), upstream and every port variant on the same page content: every snap, flick, threshold, rubber-band, hand-off, tap, keyboard and reduced-motion result of the port matches upstream (the gesture table in the report), except reduced motion, which the port adds. The comparison with the stock shadcn Drawer is in the decision record proposed with this port.

## Renames

| Upstream | Port |
| --- | --- |
| `<dialog-panel>` (state, events, show/hide) | `<BottomSheet>` (renders no element; holds the state machine and the props) |
| `<dialog>` inside the panel | `<BottomSheetDialog>`, a `<dialog data-slot="bottom-sheet-dialog">` (default variant) |
| `<bottom-sheet>` | `<div data-slot="bottom-sheet">` inside it |
| `<bottom-sheet-header>`, `-content`, `-footer` | `BottomSheetHeader`, `BottomSheetContent`, `BottomSheetFooter` (`div[data-slot=...]`) |
| `snap-points="40,70,100"`, `snap`, `spring="none"` / `"a,f"`, `max-display-width` | `snapPoints={[40, 70, 100]}`, `snap` / `defaultSnap`, `spring={false}` / `{[a, f]}`, `maxDisplayWidth` on `BottomSheet` |
| `inset` attribute | `inset` prop on `BottomSheetDialog` |
| panel `state` attribute | `data-sheet-state` on the dialog |
| `.transitioning`, `.snapping` classes | `data-transitioning`, `data-snapping` attributes |
| reflected `snap` attribute | `data-snap` on the dialog |
| `beforeShow`, `shown`, `beforeHide`, `hidden`, `snapChange` events | `onBeforeShow`, `onShown`, `onBeforeHide`, `onHidden` (with `preventDefault()`), `onSnapChange` |
| `sheet.show(trigger)`, `hide()`, `snapTo()`, `snap` | `BottomSheetTrigger`, `BottomSheetClose`, `useBottomSheet()` (`show`, `hide`, `snapTo`, `snap`, `state`); `[data-action-hide-dialog]` still closes the default variant |
| `--bs-*` custom properties | `--bottom-sheet-*` |
| `PhysicsEngine` (physics-engine) | `SpringEngine` (`spring.ts`) |
| `BottomSheet` class | `SheetController` (`sheet-controller.ts`); `DialogPanel` keeps its name (`dialog-panel.ts`) |

## Deviations

Every change from upstream. The numbers above are measured on the shipped code, with these changes in place.

- React instead of custom elements: what the element read from its attributes arrives through setters (`snapPoints`, `snap`, `spring`, `maxDisplayWidth`), applied in render before the dialog mounts and in a layout effect after; as `attributeChangedCallback` ignored an unchanged value, the setters do too, so a re-render never supersedes a settle. A controlled `snap` prop that echoes the committed snap is ignored the same way upstream ignores its own reflection (`#reflectingSnap`). Inline styles and the transition flags are written to the DOM directly, never through React state, so a drag never re-renders.
- dialog-panel's optional morph-engine transport is not ported (the sheet never uses it). Its `dialog-backdrop` element is not rendered: upstream's sheet stylesheet hides it and uses `::backdrop`.
- dialog-panel follows its source at the pinned commit (2.0.3), which ignores backdrop and Escape events from descendants. Upstream's demo vendors an older 2.0.x build without that guard, which closes the sheet on a synthetic `element.click()` inside it (its coordinates are 0,0, outside the sheet); real clicks behave the same on both, and the fidelity runs use real clicks.
- `physics-engine`'s event emitter is reduced to the two listeners the sheet uses (`onChange`, `onComplete`); `animateTo` no longer returns a promise. The integration step is unchanged.
- Added: `--bottom-sheet-panel-max-width` (default `100%`, `none` for inset) with `margin: 0 auto` instead of `margin: 0`. While the cap is the full width there is no slack, so the margins resolve to 0 exactly as upstream's; it lets an app cap the sheet on wide screens with a variable, since the sheet's rules are unlayered (as upstream's) and outrank layered utilities.
- Added: `color: var(--bottom-sheet-panel-foreground, CanvasText)` on the dialog, the user agent's dialog color as a token (identical by default).
- Added (dialog layers without `::backdrop`): a `[data-slot="bottom-sheet-overlay"]` scrim with the same three state rules as the `::backdrop`, and `display: flex` plus `z-index: var(--bottom-sheet-z-index, 50)` on a non-`<dialog>` surface. The page scroll lock (`body:has(...)`) keys on the dialog's `data-sheet-state`.
- Added: reduced motion. Under `prefers-reduced-motion: reduce` the sheet and scrim appear and leave in place (no transitions; the showing and hiding poses are the resting one), snap settles skip the spring and the CSS settle is instant, and the lifecycle's transitionend wait finishes on the next task instead of its 700 ms fallback. Upstream animates regardless.
- Added: `prefers-contrast: more` raises the handle from `#bbb` (about 1.9:1 on white, a decorative affordance next to the close button) to `#767676`; forced colors give the panel an edge and the handle `CanvasText`.
- Added: `BottomSheetContent` is a tab stop (`tabIndex={0}`, overridable): Chromium already makes a scroller focusable, but axe's `scrollable-region-focusable` needs it to be explicit, and other browsers do not.
- Added: `BottomSheetTrigger` sets `aria-haspopup="dialog"` and `aria-expanded`; a controlled `open` returns focus to the element that had it.
- Added: `defaultOpen` renders `<dialog open>` (non-modal, so the server render and the gallery still show the sheet at rest) and promotes it to the modal top layer on mount, in the same task, with no transition.
- Added: a sheet open from the first render (`defaultOpen`) does not take focus in a document that has none (the gallery's live stage iframe on the component page, a background tab). There `showModal()` would move focus into the frame and so take the embedding page's focus on load, so the default variant keeps the server-rendered dialog open non-modal and promotes it to `showModal()` on the first pointer down, key or focus in that document; the Radix and Base UI variants skip their initial focus in that case. Measured on the built site: before the change, loading `/ui/bottom-sheet` left the page's `document.activeElement` on the stage IFRAME; after it, on BODY. Opens and closes after load are upstream's (scripted loops on the wall are handled site-wide by the inert stage document). In a focused document nothing changes.
- Radix, Base UI and React Aria variants: the same controller, gestures, snap points, stylesheet and API on those dialogs. A `PresencePanel` (`presence-panel.ts`) runs dialog-panel's lifecycle (double frame before `shown`, transitionend wait with the 700 ms fallback, cancelable `beforeShow`/`beforeHide`, focus return) by mounting the primitive's dialog for the whole show, exit included, instead of calling `showModal()`. The primitives bring their own focus trap, Escape, outside-press dismissal (on pointer down for Radix and Base UI, where the native backdrop closes on click), page hiding and scroll lock.
- `DragGesture` assigns two private fields through `this` instead of the `_` alias in its constructor, for TypeScript's definite-assignment check; no behavior change. `beforeHide`'s microtask also checks that the sheet is still mounted.
- Fidelity page only: the demo's selectors are mapped (`dialog-panel:has(bottom-sheet) > dialog` to `dialog[data-slot="bottom-sheet-dialog"]`, `bottom-sheet-footer` to `[data-slot="bottom-sheet-footer"]`), its `--bs-*` dials write `--bottom-sheet-*` onto the dialog (upstream: onto the panel, which passes them down), and the panel ids sit on the dialogs.

# Product Tour: port fidelity

- Upstream: nilbuild/driver.js @ cc398049bde916d7e256f72a3f84e5eb4ba14506 (tag 1.9.0), as published in npm `driver.js` 1.9.0
- Upstream demo: the repository's own playground (`apps/playground`, Astro 7 dev server, installed with its own lockfile outside this repository), page `/animated-tour`: `driver({ showProgress: true, showButtons: ["next", "previous", "close"], steps: basicTourSteps }).drive()`
- Port page: the same playground markup and compiled playground stylesheet, served by a Vite page that renders `<ProductTour open steps={basicTourSteps} showProgress showButtons={["next", "previous", "close"]} />` instead of the vanilla call; no driver.js stylesheet is loaded, the wrapper injects its own
- Harness: React 19.3.0, driver.js 1.9.0 (npm build), Chromium (Playwright 1.64.0), device scale 1, light scheme, no reduced motion
- Diff: pixelmatch (S-152), threshold 0.1; percent of all pixels in the frame
- Viewports: 1280x800 and 375x812
- Target: at most 0.1%. Worst frame: **0.0000%** (14 frames, every step of the tour at both sizes)

## Method

Both pages start the tour on load. The hook waits for the first popover, then
moves step by step with the Right arrow key (driver.js's own keyboard
control on both sides), waiting 1.1 s after each move so the 400 ms stage
transition and fade have finished (settled frames, not mid-animation). Before
the screenshot it blurs the focused element and parks the pointer at (0, 0),
so neither side shows a hover or focus state, and removes the Astro dev
toolbar from the upstream page (it is not part of the playground).

The steps cover every placement in the example: a wide element with the
popover below (1), a `side: "left"` step that falls back when there is no
room (2), a small inline element (3), an element-less centered popover (4), a
group of buttons (5), a scrollable area brought into view (6) and a paragraph
inside a nested scroller (7). At 375 px the playground keeps its 260 px
sidebar and the page scrolls sideways; that is upstream's layout and is the
same on both sides.

## Results

| Step | Popover | 1280x800 | 375x812 |
| --- | --- | ---: | ---: |
| 1 | `.page-header`, bottom start | 0 px (0.0000%) | 0 px (0.0000%) |
| 2 | `.page-header h1`, left start | 0 px (0.0000%) | 0 px (0.0000%) |
| 3 | `.page-header sup`, bottom start | 0 px (0.0000%) | 0 px (0.0000%) |
| 4 | no element (centered) | 0 px (0.0000%) | 0 px (0.0000%) |
| 5 | `.buttons` | 0 px (0.0000%) | 0 px (0.0000%) |
| 6 | `#scrollable-area` (page scrolls) | 0 px (0.0000%) | 0 px (0.0000%) |
| 7 | `#third-scroll-paragraph` (nested scroll) | 0 px (0.0000%) | 0 px (0.0000%) |
| control | upstream against upstream, step 2 | 0 px (0.0000%) | 0 px (0.0000%) |

13 of the 14 port captures are byte-identical to upstream's (the 14th
differs only in its WebP encoding, 0 differing pixels). The control row shows
the noise floor of settled frames is zero, so no tolerance was needed.

## Evidence

`step-<n>-<viewport>-before.webp` is upstream, `-after.webp` the port,
`-diff.webp` the pixelmatch overlay (red: differing pixels; none). Steps 1, 2
and 4 keep all three images; steps 3, 5, 6 and 7 keep the diff only, since
their before and after images are byte-identical (size budget).

## Deviations from upstream

The item depends on npm `driver.js` and wraps it; driver.js's code is not
copied or changed. What the port adds or changes:

- **Stylesheet shipped in the item.** driver.js's `src/popover.css` and the
  tour rules of `src/driver.css` are a string in `product-tour.tsx`, injected
  once into `<head>` before the app's first stylesheet, which is where
  upstream's playground has it (driver.css before the app's styles), so app
  rules win ties as they do with the CSS import. `hints.css` is not shipped:
  the item exposes no hints.
- **Tokens.** Colors and the shadow read `--product-tour-*` variables whose
  fallbacks (and light `cssVars`) are upstream's values: `popover` #fff,
  `popover-foreground` #2d2d2d, `muted-foreground` #727272, `close` #d2d2d2,
  `button` #fff, `button-hover` #f7f7f7, `button-border` #ccc, `shadow`
  `0 1px 10px #0006`, `overlay` #000 (passed as driver.js's `overlayColor`),
  `ring` #2d2d2d. Dark values are a Labs addition.
- **Renames.** `--driver-popover-font-family` is `--product-tour-font`; the
  keyframes `animate-fade-in` are `product-tour-fade-in` (a generic global
  name). The fade reads `--product-tour-duration`, which the wrapper sets on
  `<body>` from the same `duration` option driver.js uses for its own
  `--driver-animation-duration` (component-prefixed variables only; same
  value). Class names are driver.js's, since driver.js renders the markup.
- **Logical properties.** The close button's `right: 0` is
  `inset-inline-end: 0`, the footer's `text-align: right` is `end`, and the
  gap between footer buttons is `margin-inline-start`: identical in left to
  right (the numbers above), mirrored in right to left.
- **Additions that do not change the default frame:** `:focus-visible`
  outlines on the close and footer buttons (upstream has none: `all: unset`
  and `outline: 0`); a `prefers-reduced-motion: reduce` block (no fade);
  `prefers-contrast: more` (close glyph, progress text and button borders at
  the foreground color); `forced-colors: active` (system colors, a popover
  border, no arrow).
- **Behaviour (wrapper):**
  - `animate` defaults to off under `prefers-reduced-motion: reduce`
    (upstream: always on), and smooth scrolling is forced off then.
  - Focus returns to the control that started the tour. Upstream returns it
    to whatever had focus when the last step was shown, which after the first
    step is a button of a popover that has been removed: measured on a plain
    driver.js 1.9.0 page (start from a button, ArrowRight, Escape), focus
    ended on `<body>`.
  - A popover without a title is named by `label` ("Product tour"). Measured
    upstream: its `aria-labelledby` points at the hidden title placeholder,
    so the dialog's name is "Popover Title". `aria-describedby` is dropped
    when there is no description.
  - `aria-expanded` and `aria-haspopup`, which driver.js sets on every
    highlighted element, are removed from roles that do not support them
    (WAI-ARIA 1.2, S-409), such as a highlighted list or paragraph. (axe
    4.13 did not flag them on the plain page; the attributes are still
    invalid there and announce a popup that the element does not open.) The
    overlay SVG and the arrow are `aria-hidden`.
  - The title `<header>` and the button `<footer>` get `role="none"`: inside
    the dialog `div` they were page-level banner and contentinfo landmarks,
    and axe reported `landmark-unique` on the built component page (the
    popover's footer against the site's).
  - Title, description and progress get `dir="auto"`, so Latin text in a
    right-to-left page keeps its order (P-036).
  - Right to left: `left`/`right` sides and `start`/`end` alignment of top
    and bottom popovers are mirrored, the arrow keys are swapped (ArrowLeft is
    next), and ← → glyphs in button texts are swapped.
  - Steps accept React refs as `element`; the hook creates a fresh driver
    instance per `start`, tears it down silently on unmount (StrictMode safe),
    and reports `active` and `stepIndex`.

## Enhancement checks (not part of the pixel comparison)

- axe (WCAG 2.0 to 2.2 A/AA, best practices) on the gallery demo harness,
  light and dark: 0 violations with the tour closed, on each of the three
  steps at 1280, on steps 1 and 3 in right to left at 1280, step 1 at 375,
  step 3 right to left at 375, and step 1 at 320.
- Keyboard: focus moves into each step's popover (its close button); Escape
  closes; focus returns to "Start tour"; ArrowRight (ArrowLeft in right to
  left) advances.
- Reduced motion: the body gets `driver-simple`, no animations run, and the
  popover shows at once.
- Overflow: the popover stays inside the viewport and the document does not
  scroll sideways at 320, 375 and 1280, left to right and right to left, on
  every step of the demo; also on the built component page at 320/375/1280
  with the laptop and phone stages.
- Contrast: upstream's close glyph is #d2d2d2 on white (1.5:1) and the
  button border #ccc (1.6:1); kept as the default (fidelity), raised under
  `prefers-contrast: more`, and adjustable with the tokens. axe did not flag
  the glyph. Progress text #727272 on white is 4.8:1.

## Primitive and icons

Primitive `none`: driver.js creates and owns the overlay and popover DOM
(appended to `<body>`, positioned and focus-managed by its own code), so a
Radix, Base UI or React Aria popover or dialog would be a second, competing
implementation rather than a variant of this one. Icon set `none`: the close
control is driver.js's `×` text glyph and the buttons are text; no icon
library is involved.

## Stage, tile and loop

A tour is a layout part: `stage` laptop, slot `overlay`, so the demo (a small
projects screen with a "Start tour" button) sits over the shell, and the
tour's overlay covers the whole framed screen. The tile spans 2 by 2. The
loop hydrates the specimen and clicks control 0 ("Start tour"), then control
5 (the popover's Next) three times, 1.2 s apart, so the tour plays through
its three steps and ends; it has no timer of its own, so `[data-loop-paused]`
needs no handling. Checked on a `LABS_INCLUDE_BETA=1` build (an isolated copy
of the worktree, P-047): the loop plays, the URL and the page's scroll
position stay put, and under reduced motion the tile stays static with the
tour closed.

That check found the tour pulling the page's focus into the tile: the
specimen is `inert`, but inert on an ancestor of an iframe does not stop a
script inside the framed document from focusing an element, which focuses
the iframe in the page (`document.activeElement` became the IFRAME on every
step). The site now makes a stage document inert when its frame sits in an
inert tile. With the framed `<body>` inert, the loop was measured to still
advance (scripted `click()` runs: steps 1, 2, 3, then closed) while focus
stays on the page's `<body>`; the demo needs no guard of its own, and the
component page's stage (not in a tile, not inert) is unaffected. The preview is the laptop stage on the component page with the
tour on step 2.

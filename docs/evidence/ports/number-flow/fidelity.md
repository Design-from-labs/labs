# Number Flow: port fidelity

- Upstream: barvian/number-flow @ a7b78f5d4d4b1e2cd4cb53d09d7158461bad493a (tag `@number-flow/react@0.6.2`), as published in npm `@number-flow/react` 0.6.2 (and its `number-flow` 0.6.2)
- Upstream demo: the repository's own React 19 test app (`packages/react/test/apps/react-19`: Next 15.1.4, React 19.0.0, a production `next build` served by `next start`, installed with its own lockfile outside this repository). Page `/`: two NumberFlows in a `NumberFlowGroup`, one with `locales="zh-CN"`, a USD currency format, `prefix=":"`, `suffix="/mo"`, `trend={() => -1}` and linear timings, one with `plugins={[continuous]}` and `digits={{ 0: { max: 2 } }}`; page `/enable-animated`: one NumberFlow whose `animated` flips on in the same update as its value
- Port page: the same two pages, byte for byte, except that `import NumberFlow, { ... } from "@number-flow/react"` is `import { NumberFlow, ... } from "../number-flow"`, a copy of `ports/number-flow/number-flow/number-flow.tsx` (served at `/port` and `/port-enable-animated`)
- Harness: Next 15.1.4, React 19.0.0, `@number-flow/react` 0.6.2 (npm build), Chromium (Playwright 1.64.0), device scale 1, light scheme, no reduced motion
- Diff: pixelmatch 7.2 (S-152) with PNGs read by pngjs 7 (S-153), threshold 0.1; percent of all pixels in the frame. A raw count (any channel differing) and the largest channel delta are recorded too
- Viewports: 1280x800 and 375x812
- Target: at most 0.1%. Worst frame: **0.0000%** (8 frames, 4 states at both sizes; every one is byte-identical to upstream's)

## Method

Each frame loads the upstream page, then the port page, then the upstream page a
second time (the noise floor), each in a fresh browser context. The three
screenshots of a frame are compared: upstream against port, and upstream
against upstream.

NumberFlow animates with the Web Animations API on the element's shadow
root, so the frames are matched keyframes rather than timed screenshots. The
test app's own "Change and pause" button sets the value to 152 inside
`flushSync`, pauses every animation on both elements' shadow roots and seeks
each to 300 ms; "Resume" plays them again. The frames are:

| Frame | State |
| --- | --- |
| `settled-42` | the page as loaded: value 42, no transition |
| `paused-300ms` | after "Change and pause": 42 to 152, every animation paused at 300 ms (mid spin, mid fade, mid resize) |
| `settled-152` | the same, then "Resume" and a 1.5 s wait: the settled end state |
| `enable-animated-300ms` | `/enable-animated`: `animated` turns on in the same update as the value (42 to 152), paused at 300 ms |

The pointer is parked at (0, 0) before each screenshot. Fonts are the system
fonts of the test app (it loads none), identical on both sides.

## Results

| Frame | 1280x800 | 375x812 |
| --- | ---: | ---: |
| `settled-42` | 0 px (0.0000%) | 0 px (0.0000%) |
| `paused-300ms` | 0 px (0.0000%) | 0 px (0.0000%) |
| `settled-152` | 0 px (0.0000%) | 0 px (0.0000%) |
| `enable-animated-300ms` | 0 px (0.0000%) | 0 px (0.0000%) |
| noise floor (upstream against itself), every frame | 0 px | 0 px |

Raw counts match: 0 differing pixels in every channel, largest channel delta 0.
All eight port captures are byte-identical to upstream's, and the noise floor
is zero, so no tolerance was needed. `fidelity.json` holds the numbers.

## Evidence

`<frame>-<viewport>-before.webp` is upstream, `-after.webp` the port,
`-diff.webp` the pixelmatch overlay (red: differing pixels; none). The
`settled-42` frame at 1280 and the `paused-300ms` frame at both sizes keep all
three images; the other frames keep the diff only, since their before and after
images are byte-identical (size budget).

## Deviations from upstream

The item depends on npm `@number-flow/react` and wraps it; NumberFlow's code is
not copied or changed, and its props, defaults, timings and markup are used as
they are. What the port adds or changes:

- **Named exports.** `NumberFlow` is a named export (upstream's is the default
  export), next to re-exports of `NumberFlowGroup`, `continuous` and
  `useCanAnimate` and the types, so the installed file is the one import.
- **`announce`** (new, off by default). Adds a polite, atomic live region that
  speaks each new value. Upstream names the number by its value (role `img`,
  set through `ElementInternals`) but a change of that name is not announced.
  The first value is not announced, only changes. With `announce` off the
  component renders exactly what upstream renders (this is the fidelity
  configuration above).
- **Numbering systems other than `latn` show as plain text.** NumberFlow draws
  only the digits 0 to 9. Measured on 0.6.2 in Chromium: `ar-EG` (whose default
  digits are Arabic-Indic) rendered a blank number. The wrapper detects a
  non-`latn` numbering system with `Intl.NumberFormat.resolvedOptions()` and
  renders the correctly ordered formatted text in a `<span>` instead, without
  the animation; `format={{ numberingSystem: "latn" }}` animates it. This is a
  Labs behaviour change for those locales only (documented in the item's props
  and docs); every `latn` locale, including the `zh-CN` of the fidelity page,
  goes through the unchanged upstream path.
- **Tokens.** `--number-flow-mask-height` (0.25em) and `--number-flow-mask-width`
  (0.5em) are NumberFlow's own variable names and defaults, listed in `cssVars`
  so they are discoverable; nothing is renamed.
- **Wall demo.** The gallery demo is Labs': a made-up balance and its percent
  change in a `NumberFlowGroup`, with a "Next balance" button.

## Enhancement checks (not part of the pixel comparison)

All measured on a `LABS_INCLUDE_BETA=1` build of this branch (the component
page, its preview route and the `/ui` wall) unless a harness page is named.

- axe (WCAG 2.0 to 2.2 A/AA, best practices): 0 violations on the demo at
  320, 375 and 1280 px, light and dark, left to right and right to left; on the
  preview route, light and dark; on the whole page (e2e), light, dark and right
  to left; on the `/ui` wall at the same widths and modes.
- Name: in Chromium's accessibility tree (CDP `getFullAXTree`) the element is
  one `image` named by its formatted value (`"42,00 €"` for `de-DE` EUR), and the
  e2e test reads the same name from `ElementInternals` through a value change
  (`$1,240.50`, then `$1,318.25`).
- `announce`: the live region is empty at load and holds `152,00 €` after the
  value changes from 42 to 152, with and without reduced motion.
- Reduced motion: the same change starts 9 animations with no preference and 0
  under `prefers-reduced-motion: reduce` (NumberFlow's `respectMotionPreference`,
  on by default); the number shows its new value at once.
- Numbering systems: `ar-EG` with its default digits renders as plain, correctly
  ordered text (`١٥٢٫٠٠ ج.م.`, matching `Intl.NumberFormat`); upstream's own
  render of the same props was blank (measured on `@number-flow/react` 0.6.2 in
  Chromium, 2x screenshot, nothing drawn). With `numberingSystem: "latn"` it
  animates and is named like any other number.
- Overflow: the document does not scroll sideways at 320, 375 and 1280 px, left
  to right and right to left, light and dark, on the component page and on the
  wall.
- Loop: see Stage, tile and loop.

## Primitive and icons

Primitive `none`: NumberFlow renders a custom element with its own shadow DOM
and animation engine, with no Radix, Base UI or React Aria counterpart, so
there is no primitive to vary. Icon set `none`: the component draws digits and
the symbols Intl produces (`$`, `%`, `+`, `-`); there are no icons.

## Stage, tile and loop

A number is a small specimen: no stage, and the tile spans 1 by 1. The loop
hydrates the specimen and clicks control 0 ("Next balance") twice (`wait →
click → wait → click` over 6 s), so the balance and its percent change roll
through two values. The component's animation is the Web Animations API on the
element, and the component already skips animating under
`prefers-reduced-motion: reduce` (`respectMotionPreference`); the wall also
pauses the loop then, so the tile shows the first balance, static. It has no
timer of its own, so `[data-loop-paused]` needs no handling in the demo. The
preview is the component page's demo with the first balance, rendered under
reduced motion.

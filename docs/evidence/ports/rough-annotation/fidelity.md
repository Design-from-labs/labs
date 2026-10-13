# Rough Annotation: port fidelity

- Upstream: rough-stuff/rough-notation at `668ba82ac89c903d6f59c9351b9b85855da9882c`,
  `src` (MIT, copyright 2020 Preet Shihn; S-504). That commit is the `gitHead`
  of npm `rough-notation@0.5.1` and the head of `master` on the access date
  (2026-10-13). The repository's `LICENSE` at that commit is MIT and is
  byte-identical to the one in the npm tarball. Drawing is done by
  `roughjs@4.3.1` (S-505), the version in upstream's lockfile.
- Port: `ports/pshihn-rough-notation/rough-annotation/` (decision 0016, merged
  files), exported to `content/components/pshihn-rough-notation/rough-annotation/`.
  The item is named `rough-annotation`; its React components are `RoughNotation`
  and `RoughNotationGroup`. It is a different upstream from any other
  hand-drawn text component in this repository.

## Method

Upstream side: a plain HTML page loading upstream's own IIFE build and calling
`annotate()` and `annotationGroup()`. The build was reproduced from the pinned
commit (`npm ci`, `npm run build`: `tsc` then `rollup`), and its
`rough-notation.iife.js` and `.esm.js` are byte-identical to the 0.5.1 files
published on npm (SHA-256 `f90aa009...` and `af346fb8...`; S-506), which confirms
the pin. Port side: a React 19.3 page rendering the same scenes through
`RoughNotation` and `RoughNotationGroup`. Both pages are served by one Vite
server, share one stylesheet (Figtree, 20 px, 720 px column) and draw the same
text; shapes come from the same data (`src/scenes.js` of the harness), one page
building DOM by hand and the other rendering components.

Each annotation draws its hand-drawn path from a seed it takes from
`Math.random()` when it is created, so both pages replace `Math.random` with
the same seeded generator (seed 42, the fidelity tool's `--seed` generator) and
create their annotations in the same order. Every CSS animation on the page is
then paused and seeked to a matched time (`Animation.currentTime`), and the
full page is captured at 1280x800 and 375x812, device scale 1, light, no reduced
motion, after `document.fonts.ready`. The diff is pixelmatch (S-152) at threshold
0.1. Each capture is also compared with a second upstream capture (the noise
floor). Playwright: S-014. Vite: S-237.

Target: at most 0.1%. Worst frame on the final code: **0.0007%** (2 differing
pixels of 304,500, `logical` at 375x812, 800 ms, a half-drawn dash); the other 69
frames are 0 px, and upstream against a second upstream capture is 0 px on
every frame of this run. Three runs of these scenes are in `fidelity.json`: the
first (before the keyframes were renamed) and the last each had one frame at 2 px
(0.0002% and 0.0007%) on a stroke that is mid-draw, and in the first one a
second upstream capture differed from upstream by 2 px at another frame; the
middle run was 0 px everywhere. Repeating the two frames
involved eight times per side gave 0 px for upstream against upstream, port
against port and upstream against port, so this is rare rasterizer jitter at a
partly drawn dash, not a difference between the two drawings. Every frame where
the marks are complete (`end`, and 1600 ms for most scenes) is 0 px.

## Results

70 frames: seven scenes, two viewports, five matched times each (frames in ms;
`end` seeks past every animation). The count is the number of animated paths on
the page, equal on both sides in every frame.

| Scene | What it covers | Paths | Times (ms) | 1280x800 worst | 375x812 worst | Noise floor |
| --- | --- | ---: | --- | ---: | ---: | ---: |
| types | the seven types with defaults, plus `highlight` in `currentColor` | 25 | 150, 400, 800, 1600, end | 0.0000% | 0.0000% | 0 px |
| options | `color`, `strokeWidth`, `padding` as 1, 2 and 4 values, `iterations` 1, 3 and 4, `animate: false`, `animationDuration`, `brackets` (one side, two, four), `rtl: true` | 66 | 150, 400, 800, 1600, end | 0.0000% | 0.0000% | 0 px |
| multiline | `multiline` on highlight, underline and strike-through over wrapped text, and a box around the wrapped span | 20 | 150, 400, 800, 1600, end | 0.0000% | 0.0000% | 0 px |
| group | `annotationGroup`: underline, circle, highlight, then a 1,200 ms box | 14 | 400, 1200, 2400, 3600, end | 0.0000% | 0.0000% | 0 px |
| rtl | Arabic and Hebrew rows, upstream with `rtl: true` and the port with `rtl: true` | 19 | 150, 400, 800, 1600, end | 0.0000% | 0.0000% | 0 px |
| rtl-auto | the same rows; the port is given no `rtl` and reads the page direction | 19 | 150, 400, 800, 1600, end | 0.0000% | 0.0000% | 0 px |
| logical | the port's `start` and `end` bracket sides against upstream's `left` and `right`, in left-to-right and right-to-left rows, and the port's default side against upstream's | 27 | 150, 400, 800, 1600, end | 0.0000% | 0.0007% | 0 px |

Evidence: `<scene>-<viewport>-end-{before,after,diff}.webp` for every scene,
plus the 400 ms frame of `types` and `group` (before is upstream, after the
port, diff the pixelmatch overlay; all diffs are blank white and grey). Numbers:
`fidelity.json`.

### A control that can fail

The first port run differed by 0.14% to 0.73% on every frame (for `types`:
0.2160% at 1280x800 and 0.6516% at 375x812 once the strokes were drawn) while
upstream against itself was 0 px. The strokes were slightly different shapes,
not shifted: React draws random numbers while it loads, so the port's first
annotation took later numbers from the seeded sequence. The port page now
restarts the sequence right before its first render (pitfall P-WEB2-ROUGH-2),
and the 70 frames above are 0 px (at worst 2 px). The harness therefore does
distinguish two seeds.

## Deviations from upstream

- **Merged files** (decision 0016): `src/model.ts`, `keyframes.ts`, `render.ts`
  and `rough-notation.ts` become `rough-annotation-core.ts` (installed to
  `lib/`), each module after a `// ---- upstream: src/<file> ----` marker, in
  upstream's order. The four relative imports are gone and the four `roughjs`
  imports are hoisted to the top; the two type-only ones are marked `import type`
  (the repository compiles with `verbatimModuleSyntax`). Of upstream's 542
  non-blank lines (imports aside) 536 are identical (a line-by-line comparison
  against the pinned commit); six are changed and three added, in three places
  listed next:
- **Keyframes named for the component, and a CSS reduced-motion fallback**
  (`keyframes.ts`, `render.ts`): `rough-notation-dash` is `rough-annotation-dash`
  in the injected `@keyframes` and in the one `animation` string that uses it
  (the repository guard `scripts/keyframe-items.test.mjs` requires keyframe
  names to start with the component name and a `prefers-reduced-motion`
  fallback in the same file). The injected style also gets a second rule,
  `@media (prefers-reduced-motion: reduce) { svg.rough-annotation path {
  animation: none !important; stroke-dashoffset: 0 !important; } }`, so even a
  caller that uses `annotate()` directly sees the finished mark at once. Neither
  change shows in a compared frame (the runs use no-preference motion).
- **Labs addition (CSS scale on an ancestor)** (`rough-notation.ts`,
  `svgRect`): upstream measures the element and its `<svg>` with
  `getBoundingClientRect()` (screen pixels) but draws in the svg's own
  coordinates, so under `transform: scale(s)` every mark lands off the text.
  The svg is styled 100px wide, so `k = 100 / svg.width` is 1 without a
  transform (the arithmetic is unchanged: the 70 frames stay 0 px) and `1 / s`
  with one; the measured x, y, width and height are multiplied by `k`
  (pitfall P-WEB2-ROUGH-6). The gallery wall and the preview route scale demos,
  so this was needed there. Rotations and skews are not handled.
- **Labs addition (screen readers)**: `svg.setAttribute('aria-hidden', 'true')`
  on the annotation's `<svg>`, next to upstream's `class` line. The marks are
  decoration.
- **Dependency pin**: `roughjs@4.3.1` exactly, not a range. Releases after 4.3.1
  draw ellipses differently (all 171 ellipse cases compared against 4.6.6
  differ; lines, rectangles and polylines are identical), which would change
  every `circle` (pitfall P-WEB2-ROUGH-1). The packages' optional peer is pinned
  the same.
- **Labs addition, React wrapper** (`rough-annotation.tsx`, a thin layer, not
  upstream code): `RoughNotation` creates the annotation in an effect, shows and
  hides it from `show`, forwards `color`, `strokeWidth`, `padding`, `animate`,
  `animationDuration` and `iterations` to upstream's live setters (a visible mark
  redraws without animating again), and rebuilds it when `type`, `multiline`,
  `brackets` or direction change. `RoughNotationGroup` calls `annotationGroup`
  with its annotations in document order. A group's children ignore their own
  `show`. The element is any `as` (default `span`); React's `ref` is merged.
- **Labs addition, default highlight color**: upstream's color defaults to
  `currentColor` for every type, which turns a highlight into a text-colored bar
  behind the text (the last `types` row shows upstream hiding its own text). The
  wrapper's default for `highlight` is the `--rough-annotation-highlight` token;
  every other type keeps `currentColor`; `color` always wins (pitfall
  P-WEB2-ROUGH-3). The fidelity scenes pass explicit colors, so they compare
  the wrapper with upstream rather than the two defaults.
- **Labs addition, reduced motion**: with `prefers-reduced-motion: reduce` the
  wrapper creates the annotation with `animate: false` (read from
  `matchMedia` when the annotation is created, not from a hook, so a
  server-rendered page cannot start a draw before the preference is known), and
  a preference that switches on mid-draw finishes the marks at once.
- **Labs addition, right to left**: `rtl` defaults to the element's computed
  direction when the annotation is created; `brackets` takes `start` and `end`
  (resolved to `left` and `right` by that direction), and its default is `end`,
  which is upstream's default `right` in left-to-right text. Upstream's `left`
  and `right` still work.
- **Labs addition, stylesheet**: one `<style href="designfrom-rough-annotation">`
  (React hoists and de-duplicates it) with the highlight token selection
  (`prefers-contrast: more`), forced-colors rules, and resets so `as="mark"`,
  `"del"` and `"ins"` do not double the hand-drawn mark with their own paint.
- **Tokens**: `--rough-annotation-highlight` and
  `--rough-annotation-highlight-contrast`, each with light and dark values.
- `"use client"` is on `rough-annotation.tsx`. The core file has no directive;
  nothing in it touches `window` or `document` until an annotation is created.
- Upstream's `window.__rno_kf_s` style-element guard is unchanged.
- Upstream's published type `RoughAnnotation` (the object `annotate()` returns)
  keeps its name; the React component is `RoughNotation`, so the two do not
  collide in the library barrel.
- Not ported: upstream's documentation site (a separate repository), the
  rollup build and the tslint configuration.

## Primitive and icons

Primitive `none`: the component draws an SVG beside an element; there is no
menu, dialog or input behavior a headless primitive would add. No icons.

## Accessibility, motion, direction, contrast

Measured in Chromium (Playwright 1.64) on the demo, 1280x800 and 375x812, in a
harness page with the Labs tokens:

| Check | Result |
| --- | --- |
| Marks are decoration | 6 `svg.rough-annotation` for the demo's 6 annotations, each `aria-hidden="true"`, `pointer-events: none`; React `StrictMode` gives the same 6 (no leaked duplicates); one stylesheet; no console errors |
| Reduced motion | `prefers-reduced-motion: reduce`: 0 running animations, no animated path, and the page is pixel-identical (0 of 1,024,000 px) to the normal page seeked to its end; switching the preference on while 3 animations run leaves 0 |
| Live options | Changing `color` redraws the same two paths in the new color with no running animation; `padding` 5 to 14 moves the mark's bottom edge from 68 to 77 px, still no animation; `show` false removes the paths, true animates again (2 running); a new `type` rebuilds one annotation (still one `svg` per element); unmounting removes its `svg`; a group draws a child that mounts later and hides and shows all together; the demo's group draws its six annotations in document order at 0, 800, 1,600, 2,400, 3,200 and 4,000 ms |
| Right to left | `dir="rtl"`: the `rtl` scene (explicit) and `rtl-auto` (read from the page) are 0 px against upstream's `rtl: true`; the demo's bracket moves to the left side |
| Resize | 1280 to 375 px: every mark is redrawn around its text at the new size |
| Scaled ancestor | the demo inside `transform: scale(1.6)` and `scale(0.6)`: see the scale rows below |
| Contrast (fidelity default, contrast on request) | Highlight bar against its text (computed): light default 15.96:1, light more 6.24:1, dark default 8.05:1, dark more 5.08:1. Bar against the card: 1.24:1, 3.17:1, 2.23:1, 3.54:1. The default already meets AA; `prefers-contrast: more` makes the bar visible as a shape (above 3:1) while keeping the text at 4.5:1 or more |
| Forced colors | `forced-colors: active`: the highlight bar is the system `Mark` (255,255,0) with `MarkText` text (0,0,0); every other mark takes `CanvasText` (0,0,0) (pitfall P-WEB2-ROUGH-4) |
| axe | The demo page (harness) in light, dark, right to left, 375 px wide, and dark, right to left, 375 px: no violation on the component; the three page-level rules the bare harness page cannot satisfy (landmark, h1, region) are the only reports. On the built site (`LABS_INCLUDE_BETA=1`), `e2e/rough-annotation.spec.ts` passes 6 of 6: axe at `/ui/rough-annotation` in light, dark and right to left with no violations, the marks decoration check, reduced motion, and Replay |

Stills: `enhance-default-light.webp`, `enhance-default-dark.webp`,
`enhance-contrast-more-light.webp`, `enhance-contrast-more-dark.webp`,
`enhance-forced-colors.webp`, `enhance-rtl.webp`, `enhance-375.webp`.

## Known limits

- `type`, `multiline`, `brackets` and the direction are fixed for one
  annotation (upstream's rule); the wrapper rebuilds instead of mutating.
- Upstream measures when it draws and on resize; a web font that loads late and
  changes the text size is corrected by the resize redraw about 400 ms later,
  without animation.
- The direction is read once, when the annotation is created.
- A rotated or skewed ancestor is not handled (a uniform scale is).
- `<table>` rows and other elements that cannot hold a sibling `svg` need an
  inner `span` to annotate (upstream's note).

# ThiingsGrid: fidelity evidence

- Upstream: https://github.com/charlieclark/thiings-grid at
  `a1607d3cee9e6969f5f504f0c253ee94aa50bf54` (MIT per its LICENSE file,
  Copyright (c) 2025 Charlie Clark; `package.json` has no license field)
- Port: `ports/thiings-grid/thiings-grid/` (item `thiings-grid`, primitive
  none, icon-free), from `lib/ThiingsGrid.tsx`
- Measured: 2026-10-12, Chromium (Playwright), device scale factor 1, light

## How each side was rendered

**Upstream.** The upstream Vite playground (`src/App.tsx`: sidebar, grid,
source panel) from a copy of the pinned clone, with its own dependencies
(React 19.1, Vite 6, Tailwind v3), served by Vite on `http://localhost:5330`.
The hook clicks the example in the sidebar (`SimpleNumbers`, `CardLayout`);
the default example (ThiingsIcons) shows the upstream brand images and was
not used.

**Port.** A local harness (Vite 7, React 19.3, Tailwind v4, `@/*` alias) on
`http://localhost:5331`, into which the exported item
`content/components/thiings-grid/thiings-grid/items/thiings-grid.json` is
installed the way the shadcn CLI does it (file written to
`components/thiings-grid.tsx`, `lib/utils.ts` present). The cells are the
upstream example files `SimpleNumbers.tsx` and `CardLayout.tsx` byte for
byte, with one change: the import becomes `@/components/thiings-grid`.
Both sides run in React StrictMode.

**Same box.** ThiingsGrid centers cell 0 in its container, so the container
must match to the subpixel. The upstream grid's box changes with the
example (the source panel's width pushes it), and overflows the viewport at
both sizes. The hook measures the upstream box after the example is chosen
(for example x 223.625 and about 1253 x 499 for CardLayout at 1280x800) and the harness mounts
the grid only then, in a box with exactly those coordinates. A stand-in for
the upstream sidebar's 1 px right border sits beside it, because its
antialiased edge falls into the grid's first pixel column.

**Theme parity.** The cells use Tailwind classes. The harness maps the
v3 palette values the examples use (blue-50, blue-500, blue-800, gray-*),
v3 `shadow-md`/`shadow-xl` and v3's absolute line heights (`text-xs` is
`1rem`, not v4's unitless `1.333`, which children recompute) and loads the
playground's global CSS (`:root` font stack, body reset). None of this
touches the component, which styles itself inline.

**Clip.** Pixels outside the viewport were rasterized nondeterministically
(upstream against itself differed there), so the hook overlays a
transparent fixed box on the visible part of the grid and the tool clips to
it (`--selector "#fid-target"`).

**Frozen time.** `--clock 1767225600000 --advance 500`. The shared tool's
fake clock keeps running in real time after `clock.install`, so the hook
first calls `page.clock.pauseAt(epoch + 60 s)`; from then on both sides see
identical `performance.now()`, `Date.now()`, timers and
`requestAnimationFrame`. React's Scheduler posts MessageChannel tasks the
fake clock does not control, so the hook settles two MessageChannel round
trips after every input and every 16 ms step, which makes every render
commit before the next frame. With that, the final offsets match to the
thousandth of a pixel across runs (for example `translate3d(-181.49px,
-272.236px, 0px)` three times out of three).

**Re-raster after motion.** Even with identical offsets, cells that mounted
mid-glide kept the antialiasing of the real compositor frame in which their
tile was rastered (compositor frames run in real time, not on the fake
clock): SimpleNumbers' 1 px cell borders and digits then differed by
0.16% to 0.61% in drag states while CardLayout was 0 px. After every drag or
wheel, the hook therefore sets the moving layer's `will-change` to `auto`
and back to `transform` (150 ms real time each) on both sides, which
re-creates the layer and rasters every tile at the final offset. Upstream
against itself, without this step, measured 0 px and 2 px.

| State | Hook |
| --- | --- |
| idle | example chosen, 500 ms settled |
| drag | mouse down at (330, 250), ten 16 ms steps of (-8, -12) px, release, then 300 ms of momentum (mid-glide) |
| wheel | wheel (130, 270), 100 ms, wheel (-40, 90), then 300 ms |

`fidelity.json` holds the raw numbers for every label; the WebP images
(`<label>-<viewport>-{before,after,diff}.webp`) are kept for the
post-enhancement runs only, to keep the evidence small. The pre-enhancement
SimpleNumbers drag was measured again with the re-raster step below.

## Results

"Pre" is the port as first copied (upstream code plus the `"use client"`
directive only); "post" is the enhanced export. Before = upstream, after =
port, both light.

| State | Example | Viewport | Scheme | Pre: differing px (%) | Post: differing px (%) | Pass |
| --- | --- | --- | --- | --- | --- | --- |
| idle | SimpleNumbers | 1280x800 | light | 0 (0.0000%) | 0 (0.0000%) | yes |
| idle | SimpleNumbers | 375x812 | light | 0 (0.0000%) | 0 (0.0000%) | yes |
| drag | SimpleNumbers | 1280x800 | light | 0 (0.0000%) | 0 (0.0000%) | yes |
| drag | SimpleNumbers | 375x812 | light | 0 (0.0000%) | 0 (0.0000%) | yes |
| wheel | SimpleNumbers | 1280x800 | light | 0 (0.0000%) | 0 (0.0000%) | yes |
| wheel | SimpleNumbers | 375x812 | light | 0 (0.0000%) | 0 (0.0000%) | yes |
| idle | CardLayout | 1280x800 | light | 0 (0.0000%) | 0 (0.0000%) | yes |
| idle | CardLayout | 375x812 | light | 0 (0.0000%) | 0 (0.0000%) | yes |
| drag | CardLayout | 1280x800 | light | 0 (0.0000%) | 0 (0.0000%) | yes |
| drag | CardLayout | 375x812 | light | 0 (0.0000%) | 0 (0.0000%) | yes |
| wheel | CardLayout | 1280x800 | light | 0 (0.0000%) | 0 (0.0000%) | yes |
| wheel | CardLayout | 375x812 | light | 0 (0.0000%) | 0 (0.0000%) | yes |

## Residual differences

None measured: every state is 0 px at both viewports, before and after the
enhancements. The harness differs from the playground only outside the
compared box (no sidebar text, no source panel), and in the theme mapping
described above, which concerns the example cells and not the component.

## Enhancements and the default look

The enhancements add no visible chrome in the default state: the focus
outline appears only on keyboard focus (`focus-visible`), the screen-reader
description is `sr-only`, and `left: 0; top: 0` on each cell equals the
static position the cells already had in left-to-right. Reduced motion only
changes what happens after a drag is released. The post runs above are the
evidence.

## Behavior checks (port only)

A local Playwright script against the harness (`?example=SimpleNumbers`,
full window, 1280x800):

- The viewport is `role="region"`, named "Pannable grid", role description
  "pannable grid", `tabIndex` 0, described by the sr-only instructions.
- Tab focuses it and shows a 2 px solid outline (`focus-visible`).
- Keys (gridSize 80, window 1280x800): ArrowRight `(-80, 0)`, ArrowDown
  `(-80, -80)`, ArrowLeft `(0, -80)`, PageDown `(0, -880)` (container height
  800 plus the earlier step), Shift+PageDown `(-1280, -880)`, Home `(0, 0)`;
  Ctrl+ArrowRight is ignored.
- A drag released at `(-160, -80)` glides to about `(-330, -165)` with motion
  allowed, and stays at `(-160, -80)` with `prefers-reduced-motion: reduce`.
- The same page in `dir="rtl"` differs from `ltr` by 22 px of 1,024,000
  (0.002%, glyph antialiasing): the cells keep their physical positions.
- axe (WCAG 2.0 to 2.2 A/AA and best practices): 0 violations on the gallery
  demo in light and dark, in RTL, in RTL at 375x812, and on the full-window
  grid.

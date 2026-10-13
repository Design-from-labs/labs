# Lifeline: fidelity evidence

- Upstream: [evilrabbit/lifeline](https://github.com/evilrabbit/lifeline) at
  `8ddbb3d3ad0ac6ec5bbe8efda1c051d93d04a63a` (MIT, Copyright (c) 2026 Evil Rabbit),
  registry item `lifeline` (its `shell`, `page`, `theme-switcher` and data items are not ported).
- Port: `ports/lifeline/lifeline/` exported as `lifeline-lucide` (default) and `lifeline-phosphor`.
- Tool: the port pods' Playwright + pixelmatch diff (threshold 0.1, device scale 1),
  `Math.random` seeded with 7 on both sides. Target: at most 0.1% differing pixels.

## How each side was rendered

**Upstream.** A copy of the pinned clone, dependencies from its own lockfile,
`next dev -p 5320`. Two routes were added to the copy (and nothing in
`components/lifeline/` was touched): `/fidelity`, which renders this port's
`demo.tsx` verbatim inside `<main class="mx-auto w-full max-w-5xl px-6 py-10">`,
and `/fidelity-page`, which renders `<Lifeline mode="page" className="h-full">`
with the demo's data in a full-height `overflow-hidden` column (the upstream
`LifelineStage` classes, without the nav). A one-line shim re-exports
`lib/lifeline-data.ts` at `components/lifeline/lifeline-data.ts` so the same
demo file imports work on both sides. `devIndicators: false` hides the Next.js
badge. Fonts: Geist through `next/font/google`, as upstream ships it. Theme:
`next-themes` (`attribute="class"`, system default), so the Playwright color
scheme picks light or dark.

**Port.** A local Vite 7 + React 19.2 + Tailwind CSS 4.3 harness with the `@/*`
alias and React StrictMode (as Next.js dev). `lifeline-lucide` was installed
with `npx shadcn@latest add <items/lifeline-lucide.json>` (files, `--lifeline-*`
cssVars and the keyframes/classes written by the CLI), later edits synced from
the exported item JSON. The global CSS is upstream's `app/globals.css` minus
its own Lifeline section (the item supplies it), and the same latin Geist woff2
that next/font serves upstream, so both sides typeset identically. A two-line
script mirrors next-themes (`dark`/`light` class and `color-scheme` on `<html>`).

**Data.** The neutral sample timeline in `demo.tsx` (a fictional designer,
1990 to 2026; inline SVG images; no real people). Photo-card tilts are pinned
with `rotate` in the data: unpinned, both apps consume a different number of
`Math.random` calls before mount, so a seed alone does not give identical tilts.

## Results

Before = a baseline port with only the contract-required changes (relative
imports, `next/image` to `<img>`, `next-themes` to the document theme adapter,
no `geist`). After = the enhanced port as exported. Both against the same
upstream render. Numbers are differing pixels.

| State | Viewport | Scheme | Before | After | Pass |
| --- | --- | --- | --- | --- | --- |
| Demo (`mode="embed"`), intro settled (8 s) | 1280x800 | light | 0 (0%) | 0 (0%) | yes |
| Demo (`mode="embed"`), intro settled | 375x812 | light | 0 (0%) | 0 (0%) | yes |
| Demo (`mode="embed"`), intro settled | 1280x800 | dark | 0 (0%) | 0 (0%) | yes |
| Demo (`mode="embed"`), intro settled | 375x812 | dark | 0 (0%) | 0 (0%) | yes |
| Page mode, intro settled | 1280x800 | light | 0 (0%) | 0 (0%) | yes |
| Page mode (vertical layout), intro settled | 375x812 | light | 0 (0%) | 0 (0%) | yes |
| Page mode, intro settled | 1280x800 | dark | 0 (0%) | 0 (0%) | yes |
| Page mode (vertical layout), intro settled | 375x812 | dark | 0 (0%) | 0 (0%) | yes |
| Intro keyframe (fake clock, 45 frames into the sweep) | 1280x800 | light | 0 (0%)* | 0, 36, 105 (max 0.0103%) over 3 runs | yes |
| Intro keyframe (fake clock, 45 frames into the sweep) | 375x812 | light | 0 (0%)* | 981, 0, 626 (0.32%, 0%, 0.21%) over 3 runs | see below |
| Reduced motion (no intro; rail parked at the end) | 1280x800 | light | 0 (0%) | 0 (0%) | yes |
| Reduced motion (vertical) | 375x812 | light | 0 (0%) | 0 (0%) | yes |
| Hover image on "First solo exhibition." | 1280x800 | light | 0 (0%) | 0 (0%) | yes |
| Lightbox open from the last photo card | 1280x800 | light | 0 (0%) | 0 (0%) | yes |

Images: `<state>-<viewport>-{before,after,diff}.webp` (before = upstream,
after = port, as the tool names them). `fidelity.json` holds the after run;
`fidelity-baseline.json` the before run (screenshots for it were not kept).

### States and timing

- Settled states wait 8 s of real time: the intro (rail sweep 3.2 s plus fades)
  has finished and its classes are gone, so the frame is static.
- Intro keyframe: Playwright's fake clock is installed before load; lazy images
  are loaded first; the clock is stepped in 16 ms frames (so React commits
  between frames) until the intro has started, then 45 more frames, and every
  CSS animation is paused at 720 ms. (*) The baseline row was taken with an
  earlier version of this hook (1600 ms of clock, no start detection).
- Hover: the rail is walked to its start with ArrowLeft, then stepped right until
  the event sits mid-stage (9 presses on both sides), the pointer rests on the
  event and the trailing card settles (1.5 s).
- Lightbox: a click on the last floating card; the FLIP flight (520 ms) settles
  (1.5 s).

### Residual differences

The only miss is the vertical intro keyframe at 375x812 (two of three runs
above 0.1%, one at 0 px). The diff is the first entry shifted vertically by
2 to 3 px, that is, the auto-scroll's position during the sweep. At a fixed
frame count the sweep's progress already varies run to run on *both* sides
(upstream alone read 0.0153 to 0.0215 across runs), because the frame in which the
intro starts is not pinned to the fake clock's grid; the scroll offset follows
it. This points at the measurement rather than the port, but it was not pinned
down further: the settled vertical states (intro finished, page and embed,
light and dark) are 0 px, and the vertical intro code differs from upstream
only by tokens, logical properties and screen-reader text. A sharper harness
would pin the start frame's timestamp before comparing mid-sweep frames.

During development one real miss showed up and was fixed: the lightbox's
keyboard Close button became visible after a mouse click (0.17%), because a
StrictMode effect re-run read the dialog itself as the opener. The opener is
now read once at first render, and a pointer-opened dialog focuses itself, not
the button.

Avatars: upstream renders people through `next/image`, which serves resized
copies through its optimizer; the port uses a plain `<img>` with the same 28 px
box. The sample data uses inline SVGs, which `next/image` never optimizes, so
this did not show; with raster photos expect resampling differences inside
the avatars only.

## Accessibility check (axe, after the intro settles)

| Page | Light | Dark | Dark + `prefers-contrast: more` |
| --- | --- | --- | --- |
| Demo and page mode, 1280 and 375, LTR and RTL | 0 violations | color-contrast only | 0 violations |

The dark color-contrast findings are upstream's palette, kept as the default
for fidelity: labels and ages are zinc-600 on black (about 2.7:1), the legend
and people names zinc-500 (about 4.3:1). Under `prefers-contrast: more` the
port lifts `--lifeline-label`, `--lifeline-text` and `--lifeline-icon` to
zinc-400 (about 8:1). Upstream itself, audited the same way, reports the
same dark color-contrast nodes and nothing else (the harness pages' missing
`h1` aside, which the port's harness adds as visually hidden text).

**Known deviation (fidelity default, contrast on request).** Following the
port policy in `ports/README.md`, the dark default keeps upstream's grays and
therefore does not meet WCAG AA contrast for those labels; the port lifts them
under `prefers-contrast: more` and uses the system text color under forced
colors (`@media (forced-colors: active)`).

## Fireworks on the render-loop helper (2026-10-13)

The fireworks overlay (`lifeline-fireworks.tsx`, a full-screen WebGL 1
shader) used to run its own `requestAnimationFrame` loop. It now draws
through the shared `render-loop` helper (decision
[0021](../../../decisions/0021-webgl-render-loop.md)); the shader, its
uniforms, the draw call, the palette and the theme handling are unchanged.

- Method: one Vite harness renders the fireworks provider three ways: the
  upstream file at the pinned commit (with `next-themes` stubbed to an
  already dark page), the port as it was on staging before this change
  (its own loop), and the port on the helper. React StrictMode on all three.
  `u_time` is pinned through a `uniform1f` hook, Playwright's clock is paused
  so no side can end the show, and three frames are stepped per time.
  Chromium with SwiftShader (`--use-angle=swiftshader --enable-unsafe-swiftshader`),
  device scale 1, full-viewport screenshots of the canvas over a white page.
  Noise floor: a second upstream load.
- Buffers: 1280x800 and 375x812 on every side (the pixel-ratio cap of 1.5 is
  kept as the helper's `maxDpr`).

| Viewport | t = 0.6 | 1.2 | 2.0 | 3.1 | 4.5 | 6.0 | 7.2 s |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1280x800, port on the helper vs upstream | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% |
| 1280x800, port on the helper vs staging port | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% |
| 1280x800, noise floor | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% |
| 375x812, port on the helper vs upstream | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% |
| 375x812, port on the helper vs staging port | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% |
| 375x812, noise floor | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% |

Strips at 1280x800 (t = 1.2, 3.1, 6.0 s): [before](fireworks-1280x800-before.webp)
(upstream), [after](fireworks-1280x800-after.webp) (port on the helper),
[diff](fireworks-1280x800-diff.webp); numbers in
[fireworks.json](fireworks.json).

Deviations from upstream in the fireworks (behavior, not pixels):

- The show's clock is the helper's: paused time (a hidden tab) is not
  counted, so the show resumes where it stopped instead of ending unseen, and
  a frame advances at most 0.1 s, so a very slow device plays it slower
  rather than skipping bursts. The first frame is drawn at t = 0 instead of
  one frame later (the shader's envelope is 0 there either way).
- A lost WebGL context is restored and the show continues; upstream stopped
  drawing.
- A failed shader link throws in `setup`, which the helper reports as
  `unsupported`; the provider then ends the show and restores the theme, as
  upstream's early return did. The same happens if reduced motion is turned on
  mid-show (upstream kept playing). `launch()` still refuses under reduced
  motion, so there is no static fallback picture: the fireworks are an
  overlay, and without them the timeline is unchanged.
- The program and buffer are deleted on unmount (upstream left them to the
  context). The canvas carries `data-slot="lifeline-fireworks"` and
  `data-status`.

# Liveline: fidelity evidence

- Upstream: https://github.com/benjitaylor/liveline at
  `069899598a11e00094ea1eb6b838404825f828be` (MIT, Copyright (c) 2025-2026
  Benji Taylor)
- Port: `ports/liveline/liveline/` (item `liveline`, primitive none, icon-free)
- Measured: 2026-10-12, Chromium (Playwright), device scale factor 1

## How each side was rendered

**Upstream.** The upstream demo app (`dev/`) from a copy of the pinned clone,
with its own dependencies (React 18, Vite 6), served by Vite directly on
`http://localhost:5310` (the `dev` script wraps Vite in a proxy we do not
use). `/` is the line playground (`dev/main.tsx`), `/demo.html` the
candlestick page (`dev/demo.tsx`). Both import `liveline` from `src/`.

**Port.** A local harness (Vite 7, React 19, Tailwind v4, `@/*` alias) on
`http://localhost:5311` (moved to `5312` for the last re-check, because
another process took `5311`), into which the exported item
`content/components/liveline/liveline/items/liveline.json` is installed the
way the shadcn CLI does it (every `files[].content` written to its `target`,
so the code lives in `components/liveline/`). Its `/` and `/demo.html` are
the two upstream demo files byte for byte, with one change: the import
`from 'liveline'` becomes `from '@/components/liveline'`. Same props, same
data generators, same page chrome. Tailwind's theme and utilities layers are
loaded (no preflight), so the port's focus utilities exist while the upstream
page reset stays the only reset on both sides.

**Frozen time.** Both pages are driven by `Math.random` and the clock, so each
shot uses `--seed 42` (a seeded `Math.random`) and a fake clock at epoch
`1767225600000`. Playwright's `clock.install` leaves the fake clock running in
real time while the page loads, which leaks load time into the frame:
upstream against itself differed by 0.22%. We ran the shared fidelity tool
with a two-line local change that pauses the clock before navigation
(`page.clock.pauseAt(epoch + 1000)` right after `clock.install`), after which
upstream against itself differed by at most 20 px.

**Converged frames.** The demo pages tick every 300 ms, but the engine's
smoothing (value, Y range, badge) needs about 320 ms to converge, so every
frame landed mid-ease and React's render timing (real time, not the fake
clock) still moved the dot and badge by a pixel in about one run in three.
Every state therefore starts with a hook that sets the page's own
"Tick rate" control to `1s`; shots are taken 700 ms after a tick, when all
easing has settled. Twelve repeated runs then gave 0 px every time.

Per state: `--advance 3500` (the 3 s loading phase, then live data), then the
hook, then 3.7 s more of fake time, then the shot. Viewports 1280x800 and
375x812; `fidelity.json` holds the raw numbers.

| State | Page and hook |
| --- | --- |
| line-dark | `/`, default (dark theme, line chart, window and mode buttons) |
| line-light | `/`, the page's Features > Light button |
| line-scrub | `/`, mouse at 60% of the main chart (crosshair and tooltip) |
| candle-dark | `/demo.html`, default (dark, candlesticks, 2 s candles) |
| candle-light | `/demo.html`, Features > Light |
| candle-line-morph | `/demo.html`, Chart > Line (candles morphed into the line, badge shown) |

## Results

"Before" is the port as first copied (upstream code with only the contract
changes); "after" is the enhanced export. Scheme is the chart's `theme`
prop, set by the page.

| State | Viewport | Scheme | Before: px | Before: % | After: px | After: % | Pass |
| --- | --- | --- | --- | --- | --- | --- | --- |
| line-dark | 1280x800 | dark | 0 | 0.0000 | 0 | 0.0000 | yes |
| line-dark | 375x812 | dark | 0 | 0.0000 | 0 | 0.0000 | yes |
| line-light | 1280x800 | light | 0 | 0.0000 | 0 | 0.0000 | yes |
| line-light | 375x812 | light | 0 | 0.0000 | 0 | 0.0000 | yes |
| line-scrub | 1280x800 | dark | 0 | 0.0000 | 0 | 0.0000 | yes |
| line-scrub | 375x812 | dark | 0 | 0.0000 | 0 | 0.0000 | yes |
| candle-dark | 1280x800 | dark | 0 | 0.0000 | 0 | 0.0000 | yes |
| candle-dark | 375x812 | dark | 0 | 0.0000 | 0 | 0.0000 | yes |
| candle-light | 1280x800 | light | 0 | 0.0000 | 0 | 0.0000 | yes |
| candle-light | 375x812 | light | 0 | 0.0000 | 0 | 0.0000 | yes |
| candle-line-morph | 1280x800 | dark | 0 | 0.0000 | 0 | 0.0000 | yes |
| candle-line-morph | 375x812 | dark | 0 | 0.0000 | 0 | 0.0000 | yes |

After the contrast change below, line-dark, candle-dark and line-light were
re-run at both viewports against the final export: 0 px each.

Images kept here are from the "after" run: upstream (`-before`), port
(`-after`) and diff for line-dark, line-light, candle-dark and
candle-line-morph; diffs only for line-scrub and candle-light (their upstream
and port shots were byte-identical, dropped to stay under the size budget).

## Known deviation kept from upstream: label contrast

The default look keeps upstream's colors, including the unselected window
(and series) labels: 11 px text at `rgba(0,0,0,0.22)` in the light theme and
`rgba(255,255,255,0.25)` in the dark theme, about 1.6:1 against the surface,
below WCAG 1.4.3 (4.5:1). axe reports it as `color-contrast` on the default
state. Raising it would make the unselected color equal the selected one
(0.55 alpha), a visible change to the design, so the owner chose to keep the
default and raise both label states (to about 7:1) only when the user asks
for it: `prefers-contrast: more` or `forced-colors: active` (forced colors
also underline the selected window, since the sliding indicator disappears).
That path is not part of the pixel comparison; axe is clean under both
preferences.

## Residual differences

None measured. Two things are worth knowing when reading the images:

- In the upstream line playground the window buttons start on `10s` while
  the page's own Window row says `30s`: the chart takes its first `windows`
  entry. This is upstream behaviour and the port keeps it.
- The main chart's time axis is clipped at the bottom on both sides: the
  control row plus a `height: 100%` canvas overflow the 320 px card. Also
  upstream behaviour; our gallery demo uses a flex column so it does not clip.

## Not covered by the pixel diff

- `LivelineTransition` has no upstream demo page. It was checked in the
  harness (cross-fade between a single and a multi-series chart, the outgoing
  chart inert and aria-hidden while it fades).
- Under `prefers-reduced-motion` the port intentionally differs from upstream
  (no pulse rings, frozen loading line, snapped easing in candle mode); that
  is an enhancement, not a fidelity state. A check confirmed the loading line
  is static under reduced motion and moves without it.

# Financial Chart: port fidelity

- Upstream: tradingview/lightweight-charts @ b2ce010e4ad59f6556c9ed60e2b2b30feccdd2d1 (tag `v5.2.1`), as published in npm `lightweight-charts` 5.2.1 (Apache-2.0, with a NOTICE file)
- Upstream demos: the repository's own documentation examples, run as the documentation site runs them (its `replaceThemeConstantStrings` substitution of the light theme constants from `website/theme-colors.js`, its `delete-start`/`delete-end` removal, a `#container` filling the page): the candlestick example of `website/docs/series-types.mdx`, the price and volume example (`website/tutorials/how_to/price-and-volume.js`), and the React snippet (`website/src/components/tutorials/simple-react-example.jsx`), plus a bare `createChart()` with a candlestick series (the library's defaults)
- Port page: the same data and chart settings on `<FinancialChart>` (`ports/lightweight-charts/financial-chart/financial-chart.tsx`), the theme constants passed as `--financial-chart-*` tokens on the chart's `style`
- Harness: a small Vite 7.3.1 page per side (React 19.3.0, `lightweight-charts` 5.2.1 npm production build, Tailwind 4.3.3 for the wrapper's classes), installed outside this repository; Chromium (Playwright 1.64.0), device scale 1, light scheme, no reduced motion
- Diff: pixelmatch 7.2 (S-152) with PNGs read by pngjs 7 (S-153), threshold 0.1; percent of all pixels in the frame. A raw count (any channel differing) and the largest channel delta are recorded too
- Viewports: 1280x800 and 375x812
- Target: at most 0.1%. Worst frame: **0.0000%** (10 frames, 5 charts at both sizes), and in raw terms at most 8 pixels with a largest channel delta of 3 of 255 (two frames at 375 px)

## Method

Each frame loads the upstream page, then the port page, then the upstream page a
second time (the noise floor), each in a fresh browser context, and waits 500 ms
for the canvas to draw. The chart fills the whole viewport on both sides
(`#container` and `#root` are 100% by 100%, as on the documentation site), so
the 375 px frames are charts of 375 px, which exercises the time scale's
spacing at a narrow width. Lightweight Charts has no animation, so there is
nothing to pause.

Data. The documentation's candlestick and React snippets use their own small
datasets, which are given to both sides unchanged. The price and volume
example's original arrays are market-like data; both sides run it with a
synthetic set instead: a seeded random walk (seed 7, 90 weekdays from
2026-01-05, prices positive, every high and low bracketing its open and close,
volumes whole non-negative counts), the same generator as the demo. The
documentation constants (`CHART_BACKGROUND_COLOR`, `LINE_LINE_COLOR`, ...) are
the light theme values; the port gets them as tokens (`background`,
`foreground`, `up`, `down`, `area-line`, `area-top`, `area-bottom`).

| Frame | Upstream | Port |
| --- | --- | --- |
| `candlestick-snippet` | `series-types.mdx` candlestick example: 10 candles, UTC timestamps, no volume | `series="candlestick"`, `volume={false}`, `up`, `down`, `background`, `foreground` tokens |
| `price-and-volume` | the price and volume example (area, line width 2, no right scale border, volume histogram overlay at 70% to 100%, price scale margins 10% and 40%), synthetic data | `series="area"`, `seriesOptions={{ lineWidth: 2 }}`, `options={{ rightPriceScale: { borderVisible: false } }}`, volume on by default |
| `library-defaults` | `createChart(container)` and `addSeries(CandlestickSeries)` with no options | `<FinancialChart>` with no tokens set (the component's fallbacks are the library's defaults) |
| `react-area` | `simple-react-example.jsx`: an area series, 300 px high, in a React component | `series="area"`, `height={300}`, area tokens |
| `crosshair` | the price and volume example with the pointer at 42% of the width and y 300 | the same, so the crosshair and its labels are drawn |

## Results

| Frame | 1280x800 | 375x812 |
| --- | ---: | ---: |
| `candlestick-snippet` | 0 px (0.0000%) | 0 px (0.0000%), 8 raw px, max delta 3 |
| `price-and-volume` | 0 px (0.0000%) | 0 px (0.0000%) |
| `library-defaults` | 0 px (0.0000%) | 0 px (0.0000%), 8 raw px, max delta 3 |
| `react-area` | 0 px (0.0000%) | 0 px (0.0000%) |
| `crosshair` | 0 px (0.0000%) | 0 px (0.0000%) |
| noise floor (upstream against itself), every frame | 0 px (0 raw) | 0 px (0 raw) |

Eight of the ten captures are byte-identical to upstream's. The two others
(375 px wide, the 10-candle charts) differ in 8 pixels by at most 3 of 255 in
one channel: below pixelmatch's threshold (0 pixels counted) and invisible,
but the noise floor is exactly 0, so they are a real difference.
Isolated by switching the wrapper's settings one at a time on the 375 px
candlestick frame: with `autoSize` off the port is byte-identical to upstream
(0 differing pixels), while turning off the resize lock (see Deviations) or the color
parser leaves the same 8 pixels. So the difference is the wrapper's
`autoSize: true` (upstream's snippets size the chart once, to the container's
width at creation; the wrapper follows the container with a resize observer, so
the chart stays responsive), which at this width lands one anti-aliased row of
candle edges (all 8 pixels are in one row, near-`up` color against white) on a
different subpixel. Kept as a documented deviation: a responsive chart is the
point of the wrapper. `fidelity.json` holds every number.

## Evidence

`<frame>-<viewport>-before.webp` is upstream, `-after.webp` the port,
`-diff.webp` the pixelmatch overlay (red: differing pixels; none at threshold
0.1). `price-and-volume` at both sizes and `crosshair` at 1280 keep all three
images, and the two 375 px frames with raw differences keep all three; the
other frames keep the diff only, since their before and after images are
byte-identical (size budget).

## Deviations from upstream

The item depends on npm `lightweight-charts` and wraps it; the library's code
is not copied or changed. What the port adds or changes:

- **The chart follows its container.** The wrapper creates it with
  `autoSize: true` (upstream's snippets size it once, at creation). This is the
  cause of the 8 raw pixels at 375 px (see Results).
- **Resize keeps the visible range.** The wrapper sets
  `timeScale.lockVisibleTimeRangeOnResize: true` (upstream: `false`). With
  upstream's default the bar spacing is kept when the chart resizes, so a chart
  that grows after it mounts (a container measured late, a rotated phone) shows
  a wider time range than its data covers; with the lock the visible range
  follows the width. The frames above are taken after mount at a fixed width,
  where both settings draw the same (measured: turning the lock off leaves the
  results unchanged). The growing-container behaviour itself was not re-measured
  in this pass.
- **Touch scrolling under reduced motion.** `kineticScroll.touch` is on unless
  `prefers-reduced-motion: reduce` (upstream: always on); mouse kinetic scroll
  stays off, as upstream.
- **Tokens.** Every color is read from a `--financial-chart-*` variable where
  the chart sits, with the library's own defaults as the fallback and the light
  `cssVars` (`background` #FFFFFF, `foreground` #191919, `grid` #D6DCDE,
  `border` #2B2B43, `crosshair` #9598A1, `crosshair-label` #131722, `up`
  #26a69a, `down` #ef5350, `line` #2196f3, `area-line` #33D778, `area-top`
  rgba(46, 220, 135, 0.4), `area-bottom` rgba(40, 221, 100, 0), `volume-up`,
  `volume-down`). The dark values are a Labs addition; the chart reads the
  tokens again when the page's theme or color scheme changes. A color parser
  accepts any CSS color (`oklch()`, `color-mix()`) that the library does not
  parse itself.
- **Volume layout.** `volume` (default: when any datum has a volume) adds a
  histogram overlay with the price and volume example's margins. `volumeScale`
  (`"auto"` by default, the library's own behaviour, as in the frames above;
  `"zero"` starts the scale at zero so bar heights are proportional) is a Labs
  addition; the demo uses `"zero"`.
- **Accessibility.** The chart is a `figure` named by `label` and described by
  a generated summary (or `summary`); one keyboard slider moves the crosshair
  from point to point and reads each one; `dataTable` adds a hidden table; the
  library's layout `<table>` is marked `role="presentation"`. The slider is
  transparent, ignores the pointer (`pointer-events: none`) and shows a focus
  ring only on keyboard focus.
- **Direction.** The plot is `dir="ltr"` in every language (time runs left to
  right); the summary and labels follow the page.
- **The attribution logo stays on.** The license's NOTICE asks for a visible
  link to https://www.tradingview.com/. The library's attribution logo
  (`layout.attributionLogo`, its default, set explicitly) is that link, and the
  wrapper does not offer a way to hide it other than the library's own option,
  which the docs and the item's a11y notes tell users to leave on. It is part of
  every frame above, on both sides.
- **Notice in every file.** Apache-2.0 section 4(d) asks derivative works to
  carry the upstream NOTICE. `ports/lightweight-charts/NOTICE` is upstream's,
  verbatim, and `scripts/export-ports.mjs` now writes it into the footer of
  every exported file of a port that has a `NOTICE`, between the attribution and
  the license text (new, see the report). The NOTICE's "(c)" is written with a
  Cyrillic letter (U+0441) upstream; it is kept as is, and `sources.yaml` carries
  the same text.
- **Wall demo.** The gallery demo is Labs': the 90-day synthetic series
  (labelled "synthetic, not market prices" on the card), a chart type toggle,
  and (on the wall only) a crosshair that sweeps across the days.

## Enhancement checks (not part of the pixel comparison)

All measured on a `LABS_INCLUDE_BETA=1` build of this branch (the component
page, its preview route and the `/ui` wall).

- axe (WCAG 2.0 to 2.2 A/AA, best practices): 0 violations on the demo at 320,
  375 and 1280 px, light and dark, left to right and right to left; on the
  preview route, light and dark; on the whole page (e2e), light, dark and right
  to left; on the `/ui` wall at the same widths and modes.
- Name and description: the chart is a `figure` named "Sample asset, synthetic
  daily prices and volume" and described by the generated summary ("Candlestick
  chart of 90 points ..."), both asserted by the e2e test.
- Keyboard: the chart has one slider that takes focus (`aria-valuenow` 90, the
  last day); Home goes to point 1 and its `aria-valuetext` reads "2026-01-05:
  open ...", ArrowRight to point 2 (e2e). That the crosshair follows the slider
  and hides on blur is from the code, not separately measured.
- Attribution: the logo link "Charting by TradingView" is visible on the
  component page and on the wall tile (e2e asserts both).
- Theme: the chart reads its tokens again on a theme or color scheme change
  (the light and dark page screenshots draw the matching palette).
- Reduced motion: touch kinetic scrolling is off; the chart has no other
  animation; the wall's crosshair sweep is paused (see below).
- Overflow: the document does not scroll sideways at 320, 375 and 1280 px, left
  to right and right to left, light and dark, on the component page and on the
  wall, where the tile spans the full width at 320 and 375.

## Primitive and icons

Primitive `none`: the chart is a canvas drawn by the library; the demo's toggle
is a set of plain buttons, so there is no Radix, Base UI or React Aria
component to vary. Icon set `none`: the chart draws no icons (the library's
attribution logo is its own mark and is kept).

## Stage, tile and loop

A chart is a wide specimen: no stage, and the tile spans 2 by 2. The loop
hydrates the specimen (`client:visible`; a canvas needs JavaScript) and waits:
the demo's own timer (every 140 ms, one day further, then 12 steps with the crosshair hidden before it starts over)
moves the crosshair across the days through `ref.showPoint`. It runs only inside
the wall (the specimen carries `data-specimen`) and skips its step while
`element.closest("[data-loop-paused]")` is set, which the wall sets offscreen,
in a hidden tab, under reduced motion and when the visitor pauses animations.
Paused, the tile shows the chart with no crosshair, static, and the attribution
logo stays visible on the tile. The preview is the component page's demo.

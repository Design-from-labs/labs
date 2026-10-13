# Image Generation Loader: port fidelity

- Upstream: kasturibuilds/generative-loaders @ 4d34499e850b5f062bc6b88283f211150a15c78d (packages/generative-loaders/src), `ImageLoader`
- Harness: one Vite 7.3.1 page renders either upstream's source (with its `styles.css` imported) or the port's file, with the same props, stage, background and font; React 19.3.0, motion and framer-motion 14.1.0 (the same library); Chromium (Playwright 1.64.0), device scale 1
- Diff: pixelmatch (S-152) at threshold 0 (any color difference counts; at the usual 0.1 the low-contrast layers, such as 3 to 13% color mixes, fall under pixelmatch's cutoff), anti-aliased pixels excluded; percent of the cropped stage (the loader plus its padding), not of the whole page, so small loaders are measured strictly
- Viewports: 1280x800 (desktop) and 375x812 (mobile)
- Target: at most 0.1%. Worst port frame: **0.0000%** (desktop-skeleton-700ms; 27 frames against upstream)

## Scene

`<ImageGenerationLoader>` (upstream `<ImageLoader>`), every one of the 12 variants at the default 10rem, with the CSS animations paused at matched times (`Animation.currentTime`, P-034) of 700 and 1200 ms. Grids render all 12 together: at 120 px on a phone, at 140 px light on dark (#e5e5e5 on #111111) with a 24 px radius, and under reduced motion. `static` captures the port twice 500 ms apart under reduced motion. `right to left` renders the port in a `dir="rtl"` page against its left-to-right render (expected identical), or against the mirrored render for the skeleton sweep. Right-to-left rows are also given at threshold 0.1, because fractional positions round differently when mirrored.

## Upstream demo

generative-loaders has no demo app in its repository (its site, generativeloaders.com, is maintained separately and is not in the pinned commit), so there is no upstream demo comparison; every frame comes from the harness.

## Results

| Against | Viewport | State | Crop | Differing pixels | Percent |
| --- | --- | --- | --- | ---: | ---: |
| upstream | desktop | desktop-skeleton-700ms | 208x213 | 0 | 0.0000% |
| upstream | desktop | desktop-skeleton-1200ms | 208x213 | 0 | 0.0000% |
| upstream | desktop | desktop-bands-700ms | 208x213 | 0 | 0.0000% |
| upstream | desktop | desktop-bands-1200ms | 208x213 | 0 | 0.0000% |
| upstream | desktop | desktop-tiles-700ms | 208x213 | 0 | 0.0000% |
| upstream | desktop | desktop-tiles-1200ms | 208x213 | 0 | 0.0000% |
| upstream | desktop | desktop-scan-700ms | 208x213 | 0 | 0.0000% |
| upstream | desktop | desktop-scan-1200ms | 208x213 | 0 | 0.0000% |
| upstream | desktop | desktop-pixel-grid-700ms | 208x213 | 0 | 0.0000% |
| upstream | desktop | desktop-pixel-grid-1200ms | 208x213 | 0 | 0.0000% |
| upstream | desktop | desktop-resolution-700ms | 208x213 | 0 | 0.0000% |
| upstream | desktop | desktop-resolution-1200ms | 208x213 | 0 | 0.0000% |
| upstream | desktop | desktop-coalesce-700ms | 208x213 | 0 | 0.0000% |
| upstream | desktop | desktop-coalesce-1200ms | 208x213 | 0 | 0.0000% |
| upstream | desktop | desktop-diffusion-700ms | 208x213 | 0 | 0.0000% |
| upstream | desktop | desktop-diffusion-1200ms | 208x213 | 0 | 0.0000% |
| upstream | desktop | desktop-raster-700ms | 208x213 | 0 | 0.0000% |
| upstream | desktop | desktop-raster-1200ms | 208x213 | 0 | 0.0000% |
| upstream | desktop | desktop-bloom-700ms | 208x213 | 0 | 0.0000% |
| upstream | desktop | desktop-bloom-1200ms | 208x213 | 0 | 0.0000% |
| upstream | desktop | desktop-focus-700ms | 208x213 | 0 | 0.0000% |
| upstream | desktop | desktop-focus-1200ms | 208x213 | 0 | 0.0000% |
| upstream | desktop | desktop-shutter-700ms | 208x213 | 0 | 0.0000% |
| upstream | desktop | desktop-shutter-1200ms | 208x213 | 0 | 0.0000% |
| upstream | mobile | mobile-grid-1000ms | 343x888 | 0 | 0.0000% |
| upstream | desktop | dark-grid-1000ms | 1248x352 | 0 | 0.0000% |
| upstream | desktop | reduced-grid | 1248x312 | 0 | 0.0000% |
| static check (port, 500 ms apart) | desktop | reduced-static-grid | 1248x312 | 0 | 0.0000% |
| right to left (port) | desktop | rtl-pixel-grid-700ms | 208x213 | 0 | 0.0000% |
| right to left (port) | desktop | rtl-tiles-700ms | 208x213 | 0 | 0.0000% |
| right to left (port) | desktop | rtl-raster-700ms | 208x213 | 0 | 0.0000% |
| right to left (port) | desktop | rtl-skeleton-700ms-mirrored | 160x160 | 1223 | 4.7773% |
| right to left (port) | desktop | rtl-pixel-grid-700ms (threshold 0.1) | 208x213 | 0 | 0.0000% |
| right to left (port) | desktop | rtl-tiles-700ms (threshold 0.1) | 208x213 | 0 | 0.0000% |
| right to left (port) | desktop | rtl-raster-700ms (threshold 0.1) | 208x213 | 0 | 0.0000% |
| right to left (port) | desktop | rtl-skeleton-700ms-mirrored (threshold 0.1) | 160x160 | 0 | 0.0000% |
| upstream in right to left (control) | desktop | upstream-rtl-image-pixel-grid-700ms | 208x213 | 14648 | 33.0625% |
| upstream in right to left (control) | desktop | upstream-rtl-image-skeleton-700ms-mirrored | 160x160 | 2758 | 10.7734% |
| upstream in right to left (control) | desktop | upstream-rtl-image-pixel-grid-700ms (threshold 0.1) | 208x213 | 362 | 0.8171% |
| upstream in right to left (control) | desktop | upstream-rtl-image-skeleton-700ms-mirrored (threshold 0.1) | 160x160 | 0 | 0.0000% |

Before the Labs enhancements (the plain port: renames and the hoisted style only), the same 27 frames measured a worst of 0.0000% at pixelmatch threshold 0.1 (desktop-skeleton-700ms, harness timing noise). The table above is after the enhancements, at threshold 0, so the default look is unchanged.

## Evidence

`<state>-before.webp` is upstream, `-after.webp` the port, `-diff.webp` the pixelmatch overlay (red: differing pixels), for a representative subset of the frames above. `rtl-skeleton-1000ms` is the port only (200 px, black): before is its left-to-right render mirrored, after its right-to-left render, so the sweep runs right to left; the remaining differences are uniform one-level raster rounding from the mirrored layer, and the faint sweep is the reason the mirrored rows are confirmed by eye.

## Deviations

- Split out of upstream's shared `components.tsx`, `types.ts` and `styles.css`: `classes`, `safeRate` and `ImageLoader`, its types, and styles.css lines 423-519 plus the reduced-motion block for its prefix, in one file. Upstream lines are unchanged apart from the items below.
- Renamed: `ImageLoader` to `ImageGenerationLoader`, `ImageLoaderProps` to `ImageGenerationLoaderProps`, `ImageLoaderVariant` to `ImageGenerationLoaderVariant`.
- `framer-motion` is imported as `motion/react` (only `useReducedMotion`).
- The stylesheet ships as a string rendered with `<style href="designfrom-image-generation-loader" precedence="default">` (decision 0013) instead of upstream's CSS import.
- Custom properties carry the component name, in the CSS and inline: `--iml-color`, `-size`, `-radius`, `-duration`, `-i`, `-delay`, `-x`, `-y`, `-tone`, `-start-x`, `-start-y`, `-mid-x`, `-mid-y`, `-end-x`, `-end-y`, `-particle-size`, `-particle-opacity`, `-dot-size` to `--image-generation-loader-*`. The 20 keyframes (`iml-skeleton`, `iml-band`, `iml-tile`, `iml-scan-fill`, `iml-scan-line`, `iml-scan-frame`, `iml-pixel`, `iml-resolution`, `iml-coalesce-flow`, `iml-coalesce-core`, `iml-diffusion`, `iml-raster`, `iml-bloom-ring`, `iml-bloom-fill`, `iml-bloom-core`, `iml-focus`, `iml-focus-core`, `iml-shutter-panel`, `iml-shutter-seam`, `iml-shutter-mark`) become `image-generation-loader-*`. Class names keep upstream's `iml-` prefix.
- Labs addition (right to left): `.iml-visual { direction: ltr; }`, because in a `dir="rtl"` page upstream's grids reverse while each cell keeps its position-based delay and offset (the pixel grid then converges on the wrong diagonal; control row); and `.iml-loader:dir(rtl) .iml-skeleton { scale: -1 1; }`, so the skeleton sweep runs in the reading direction (measured against the mirrored render).
- Labs addition (screen readers): the status region also carries the label (default "Generating image") as visually hidden content, since live regions announce content, not `aria-label`.
- Reduced motion: upstream's own handling already lands on a static frame; the `static` row confirms it. Kept as is.
- Tokens: `currentColor` by default, as upstream. No shared tokens.

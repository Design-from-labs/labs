# Inline Activity Loader: port fidelity

- Upstream: kasturibuilds/generative-loaders @ 4d34499e850b5f062bc6b88283f211150a15c78d (packages/generative-loaders/src), `InlineLoader`
- Harness: one Vite 7.3.1 page renders either upstream's source (with its `styles.css` imported) or the port's file, with the same props, stage, background and font; React 19.3.0, motion and framer-motion 14.1.0 (the same library); Chromium (Playwright 1.64.0), device scale 1
- Diff: pixelmatch (S-152) at threshold 0 (any color difference counts; at the usual 0.1 the low-contrast layers, such as 3 to 13% color mixes, fall under pixelmatch's cutoff), anti-aliased pixels excluded; percent of the cropped stage (the loader plus its padding), not of the whole page, so small loaders are measured strictly
- Viewports: 1280x800 (desktop) and 375x812 (mobile)
- Target: at most 0.1%. Worst port frame: **0.0000%** (desktop-glyph-300ms; 43 frames against upstream)

## Scene

`<InlineActivityLoader>` (upstream `<InlineLoader>`), every one of the 18 variants at 64 px, with the CSS animations paused at matched times (`Animation.currentTime`, P-034) of 300 and 900 ms; `count-up` (timer driven) runs on Playwright's clock to 1000 and 5200 ms. Grids render all 18 together: at the default 1.15em in 16 px text, at 40 px on a phone, light on dark (#f5f5f5 on #111111), at speed 2, paused, and under reduced motion. `labelled` passes `label`. `static` captures the port twice 500 ms apart under reduced motion. `right to left` renders the port in a `dir="rtl"` page against its left-to-right render (expected identical; also at threshold 0.1).

## Upstream demo

generative-loaders has no demo app in its repository (its site, generativeloaders.com, is maintained separately and is not in the pinned commit), so there is no upstream demo comparison; every frame comes from the harness.

## Results

| Against | Viewport | State | Crop | Differing pixels | Percent |
| --- | --- | --- | --- | ---: | ---: |
| upstream | desktop | desktop-glyph-300ms | 112x115 | 0 | 0.0000% |
| upstream | desktop | desktop-glyph-900ms | 112x115 | 0 | 0.0000% |
| upstream | desktop | desktop-matrix-300ms | 112x123 | 0 | 0.0000% |
| upstream | desktop | desktop-matrix-900ms | 112x123 | 0 | 0.0000% |
| upstream | desktop | desktop-orbit-300ms | 112x114 | 0 | 0.0000% |
| upstream | desktop | desktop-orbit-900ms | 112x114 | 0 | 0.0000% |
| upstream | desktop | desktop-ripple-300ms | 112x112 | 0 | 0.0000% |
| upstream | desktop | desktop-ripple-900ms | 112x112 | 0 | 0.0000% |
| upstream | desktop | desktop-signal-300ms | 112x112 | 0 | 0.0000% |
| upstream | desktop | desktop-signal-900ms | 112x112 | 0 | 0.0000% |
| upstream | desktop | desktop-spark-300ms | 112x114 | 0 | 0.0000% |
| upstream | desktop | desktop-spark-900ms | 112x114 | 0 | 0.0000% |
| upstream | desktop | desktop-rotor-300ms | 112x114 | 0 | 0.0000% |
| upstream | desktop | desktop-rotor-900ms | 112x114 | 0 | 0.0000% |
| upstream | desktop | desktop-pixel-drift-300ms | 112x119 | 0 | 0.0000% |
| upstream | desktop | desktop-pixel-drift-900ms | 112x119 | 0 | 0.0000% |
| upstream | desktop | desktop-chomp-300ms | 112x114 | 0 | 0.0000% |
| upstream | desktop | desktop-chomp-900ms | 112x114 | 0 | 0.0000% |
| upstream | desktop | desktop-snake-300ms | 112x114 | 0 | 0.0000% |
| upstream | desktop | desktop-snake-900ms | 112x114 | 0 | 0.0000% |
| upstream | desktop | desktop-fold-300ms | 112x112 | 0 | 0.0000% |
| upstream | desktop | desktop-fold-900ms | 112x112 | 0 | 0.0000% |
| upstream | desktop | desktop-gravity-300ms | 112x114 | 0 | 0.0000% |
| upstream | desktop | desktop-gravity-900ms | 112x114 | 0 | 0.0000% |
| upstream | desktop | desktop-domino-300ms | 112x112 | 0 | 0.0000% |
| upstream | desktop | desktop-domino-900ms | 112x112 | 0 | 0.0000% |
| upstream | desktop | desktop-aperture-300ms | 112x114 | 0 | 0.0000% |
| upstream | desktop | desktop-aperture-900ms | 112x114 | 0 | 0.0000% |
| upstream | desktop | desktop-dot-pulse-300ms | 112x112 | 0 | 0.0000% |
| upstream | desktop | desktop-dot-pulse-900ms | 112x112 | 0 | 0.0000% |
| upstream | desktop | desktop-vortex-300ms | 112x114 | 0 | 0.0000% |
| upstream | desktop | desktop-vortex-900ms | 112x114 | 0 | 0.0000% |
| upstream | desktop | desktop-halo-300ms | 112x114 | 0 | 0.0000% |
| upstream | desktop | desktop-halo-900ms | 112x114 | 0 | 0.0000% |
| upstream | desktop | desktop-count-up-1000ms | 112x112 | 0 | 0.0000% |
| upstream | desktop | desktop-count-up-5200ms | 112x112 | 0 | 0.0000% |
| upstream | desktop | desktop-grid-text-600ms | 1248x216 | 0 | 0.0000% |
| upstream | mobile | mobile-grid-600ms | 343x344 | 0 | 0.0000% |
| upstream | desktop | dark-grid-600ms | 1248x240 | 0 | 0.0000% |
| upstream | desktop | speed2-grid-600ms | 1248x240 | 0 | 0.0000% |
| upstream | desktop | paused-grid | 1248x240 | 0 | 0.0000% |
| upstream | desktop | reduced-grid | 1248x240 | 0 | 0.0000% |
| static check (port, 500 ms apart) | desktop | reduced-static-grid | 1248x240 | 0 | 0.0000% |
| right to left (port) | desktop | rtl-domino-300ms | 112x112 | 0 | 0.0000% |
| right to left (port) | desktop | rtl-glyph-300ms | 112x115 | 0 | 0.0000% |
| right to left (port) | desktop | rtl-signal-300ms | 112x112 | 0 | 0.0000% |
| right to left (port) | desktop | rtl-chomp-300ms | 112x114 | 0 | 0.0000% |
| right to left (port) | desktop | rtl-orbit-300ms | 112x114 | 0 | 0.0000% |
| upstream | desktop | desktop-labelled-orbit-300ms | 112x114 | 0 | 0.0000% |
| right to left (port) | desktop | rtl-domino-300ms (threshold 0.1) | 112x112 | 0 | 0.0000% |
| right to left (port) | desktop | rtl-glyph-300ms (threshold 0.1) | 112x115 | 0 | 0.0000% |
| right to left (port) | desktop | rtl-signal-300ms (threshold 0.1) | 112x112 | 0 | 0.0000% |
| right to left (port) | desktop | rtl-chomp-300ms (threshold 0.1) | 112x114 | 0 | 0.0000% |
| right to left (port) | desktop | rtl-orbit-300ms (threshold 0.1) | 112x114 | 0 | 0.0000% |
| upstream in right to left (control) | desktop | upstream-rtl-inline-domino-300ms | 112x112 | 1562 | 12.4522% |
| upstream in right to left (control) | desktop | upstream-rtl-inline-glyph-300ms | 112x115 | 256 | 1.9876% |
| upstream in right to left (control) | desktop | upstream-rtl-inline-domino-300ms (threshold 0.1) | 112x112 | 1554 | 12.3884% |
| upstream in right to left (control) | desktop | upstream-rtl-inline-glyph-300ms (threshold 0.1) | 112x115 | 102 | 0.7919% |

Before the Labs enhancements (the plain port: renames and the hoisted style only), the same 42 frames measured a worst of 0.0000% at pixelmatch threshold 0.1 (desktop-glyph-300ms, harness timing noise). The table above is after the enhancements, at threshold 0, so the default look is unchanged.

## Evidence

`<state>-before.webp` is upstream, `-after.webp` the port, `-diff.webp` the pixelmatch overlay (red: differing pixels), for a representative subset of the frames above.

## Deviations

- Split out of upstream's shared `components.tsx`, `types.ts` and `styles.css`: `classes`, `safeRate` and `InlineLoader`, its types, and styles.css lines 203-421 plus the reduced-motion block for its prefix, in one file. Upstream lines are unchanged apart from the items below.
- Renamed: `InlineLoader` to `InlineActivityLoader`, `InlineLoaderProps` to `InlineActivityLoaderProps`, `InlineLoaderVariant` to `InlineActivityLoaderVariant`.
- `framer-motion` is imported as `motion/react` (only `useReducedMotion`).
- The stylesheet ships as a string rendered with `<style href="designfrom-inline-activity-loader" precedence="default">` (decision 0013) instead of upstream's CSS import.
- Custom properties carry the component name, in the CSS and wherever the component sets them inline: `--il-color`, `-size`, `-duration`, `-i`, `-delay`, `-distance`, `-angle`, `-x`, `-y`, `-scale`, `-snake-duration` to `--inline-activity-loader-*`. The 26 keyframes `il-glyph`, `il-matrix`, `il-turn`, `il-ripple`, `il-signal`, `il-spark`, `il-rotor`, `il-pixel-drift`, `il-chomp`, `il-chomp-lower`, `il-chomp-dot`, `il-snake`, `il-snake-food`, `il-fold`, `il-gravity`, `il-gravity-warp`, `il-gravity-core`, `il-domino`, `il-aperture`, `il-aperture-turn`, `il-dot-pulse`, `il-vortex-turn`, `il-vortex-dot`, `il-vortex-core`, `il-halo`, `il-halo-drift` become `inline-activity-loader-*`. Class names keep upstream's `il-` prefix.
- Labs addition (right to left): `.il-loader { direction: ltr; }`. In a `dir="rtl"` page upstream's flex rows and grids reverse while each piece keeps its per-index delay and transform, so the domino tiles topple away from the next one and the glyph and signal waves run backwards (control rows). The figure now draws the same in both directions; a loader has nothing to mirror.
- Labs addition (screen readers): with `label`, the status region also carries the label as visually hidden content, since live regions announce content, not `aria-label`. Without `label` it stays `aria-hidden`, as upstream: the adjacent text names the activity and a second announcement would repeat it.
- Reduced motion: upstream's own handling (animations reduced to one 0.01 ms iteration and paused) already lands on a static frame; the `static` row confirms it. Kept as is.
- Tokens: `currentColor` by default, as upstream. No shared tokens.

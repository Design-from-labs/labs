# Gradient Spin: port fidelity

- Upstream: BIAsia/gradient-spin @ 3fc9ef08fa0d2d4e0aba84a9ba00848a93e216e2 (src)
- Harness: one Vite 7.3.1 page renders either upstream's source or the port's files with the same props; React 19.3.0; Chromium (Playwright 1.64.0), device scale 1
- Diff: pixelmatch (S-152) at threshold 0 (any color difference counts), anti-aliased pixels excluded; percent of the cropped stage (the spinner plus 20 px padding)
- Viewports: 1280x800 (desktop) and 375x812 (mobile)
- Target: at most 0.1%. Worst port frame: **0.0000%** (desktop-default-0ms; 34 frames against upstream)

## Scene

`<GradientSpin>` with the CSS animation paused at matched times (`Animation.currentTime`): the default 3x3 at 0, 250 and 500 ms; each pattern as a 5x5 grid of 14 px cells at 200 and 550 ms; each of the 8 presets with `colorBy="path"`; a custom three-stop gradient on a 7x9 ripple with a 1200 ms period and 0.25 dim; and all 32 preset and pattern pairs in one grid on light and dark pages and on a phone. `reduced` emulates prefers-reduced-motion (`respectReducedMotion` on and off); `static` captures the port twice 500 ms apart. `right to left` renders the port in a `dir="rtl"` page against the mirrored left-to-right render (also at threshold 0.1).

## Upstream demo

Upstream's site (`site/`, Vite 6.4.3, React 19.2.7 from its lockfile) ran from the pinned commit twice, with its `gradient-spin` alias pointed at upstream's `src/index.ts` and at the port, so the page code is upstream's own. Both sides seed `Math.random` (the hero shuffles its specimens) and run on Playwright's clock (GSAP entrance and scroll reveals, the hero's wavefront timer), with the spinners' CSS animation paused at matched times. Rows crop the hero specimen wall, the configured preview and the "Loading older messages" card.

## Results

| Against | Viewport | State | Crop | Differing pixels | Percent |
| --- | --- | --- | --- | ---: | ---: |
| upstream | desktop | desktop-default-0ms | 56x58 | 0 | 0.0000% |
| upstream | desktop | desktop-default-250ms | 56x58 | 0 | 0.0000% |
| upstream | desktop | desktop-default-500ms | 56x58 | 0 | 0.0000% |
| upstream | desktop | desktop-arrow-up-5x5-200ms | 126x126 | 0 | 0.0000% |
| upstream | desktop | desktop-arrow-up-5x5-550ms | 126x126 | 0 | 0.0000% |
| upstream | desktop | desktop-diagonal-5x5-200ms | 126x126 | 0 | 0.0000% |
| upstream | desktop | desktop-diagonal-5x5-550ms | 126x126 | 0 | 0.0000% |
| upstream | desktop | desktop-snake-5x5-200ms | 126x126 | 0 | 0.0000% |
| upstream | desktop | desktop-snake-5x5-550ms | 126x126 | 0 | 0.0000% |
| upstream | desktop | desktop-ripple-5x5-200ms | 126x126 | 0 | 0.0000% |
| upstream | desktop | desktop-ripple-5x5-550ms | 126x126 | 0 | 0.0000% |
| upstream | desktop | desktop-sunrise-path-400ms | 126x126 | 0 | 0.0000% |
| upstream | desktop | desktop-bubble-path-400ms | 126x126 | 0 | 0.0000% |
| upstream | desktop | desktop-peach-path-400ms | 126x126 | 0 | 0.0000% |
| upstream | desktop | desktop-tonic-path-400ms | 126x126 | 0 | 0.0000% |
| upstream | desktop | desktop-mint-path-400ms | 126x126 | 0 | 0.0000% |
| upstream | desktop | desktop-spring-path-400ms | 126x126 | 0 | 0.0000% |
| upstream | desktop | desktop-twilight-path-400ms | 126x126 | 0 | 0.0000% |
| upstream | desktop | desktop-bay-path-400ms | 126x126 | 0 | 0.0000% |
| upstream | desktop | desktop-custom-ripple-7x9-300ms | 154x128 | 0 | 0.0000% |
| upstream | desktop | desktop-grid-all-300ms | 1248x468 | 0 | 0.0000% |
| upstream | mobile | mobile-grid-all-300ms | 343x404 | 0 | 0.0000% |
| upstream | mobile | mobile-arrow-up-5x5-400ms | 126x126 | 0 | 0.0000% |
| upstream | desktop | dark-grid-all-300ms | 1248x468 | 0 | 0.0000% |
| upstream | desktop | reduced-grid-all | 1248x468 | 0 | 0.0000% |
| upstream | desktop | reduced-ignore-grid-all-300ms | 1248x468 | 0 | 0.0000% |
| static check (port, 500 ms apart) | desktop | reduced-static-grid-all | 1248x468 | 0 | 0.0000% |
| right to left (port) | desktop | rtl-snake-5x5-200ms-mirrored | 86x86 | 0 | 0.0000% |
| right to left (port) | desktop | rtl-diagonal-5x5-200ms-mirrored | 86x86 | 0 | 0.0000% |
| right to left (port) | desktop | rtl-arrow-up-5x5-200ms-mirrored | 86x86 | 0 | 0.0000% |
| upstream | desktop | desktop-label-override-250ms | 56x58 | 0 | 0.0000% |
| right to left (port) | desktop | rtl-snake-5x5-200ms-mirrored (threshold 0.1) | 86x86 | 0 | 0.0000% |
| right to left (port) | desktop | rtl-diagonal-5x5-200ms-mirrored (threshold 0.1) | 86x86 | 0 | 0.0000% |
| right to left (port) | desktop | rtl-arrow-up-5x5-200ms-mirrored (threshold 0.1) | 86x86 | 0 | 0.0000% |
| upstream demo | desktop | desktop-hero-wall | 460x52 | 0 | 0.0000% |
| upstream demo | desktop | desktop-configured-preview | 460x120 | 0 | 0.0000% |
| upstream demo | desktop | desktop-older-messages | 300x184 | 0 | 0.0000% |
| upstream demo | mobile | mobile-hero-wall | 327x52 | 0 | 0.0000% |
| upstream demo | mobile | mobile-configured-preview | 327x120 | 0 | 0.0000% |
| upstream demo | mobile | mobile-older-messages | 301x184 | 0 | 0.0000% |
| upstream demo | desktop | reduced-hero-wall | 460x52 | 0 | 0.0000% |

## Evidence

`<state>-before.webp` is upstream, `-after.webp` the port, `-diff.webp` the pixelmatch overlay (red: differing pixels), for a representative subset of the frames above.

## Deviations

- Merged into two files (decision 0016): `gradient-spin.tsx` (`GradientSpin.tsx`) and `gradient-spin-core.ts` (`types`, `presets`, `patterns`, `sample-gradient`), each module after a `// ---- upstream: <path> ----` marker. Only the import lines changed. `index.ts`'s re-exports are not needed: the library re-exports both files, and a shadcn install imports helpers from `@/components/ui/gradient-spin-core`.
- `useInjectedStyles()` (a `useInsertionEffect` that appended a `<style id="gradient-spin-styles">` to `document.head`) is replaced by `<style href="designfrom-gradient-spin" precedence="default">` rendered by the component (decision 0013). The stylesheet is the same; it is now in the server-rendered markup too, so a server-rendered gallery tile animates without JavaScript. Upstream's doc comment about the injection is kept, with a note below it.
- Custom properties carry the component name: `--gspin-period`, `--gspin-dim`, `--gspin-phase` to `--gradient-spin-period`, `-dim`, `-phase`. The keyframe was already `gradient-spin-pulse`. The `data-gspin-reduced-motion` attribute keeps its upstream name.
- Labs addition (screen readers): the status span keeps `aria-label` and now also carries the label (default "Loading") as visually hidden content, absolutely positioned, so it takes no grid cell. Live regions announce content, not `aria-label`.
- Right to left: unchanged from upstream. The grid mirrors, so diagonal and snake waves run in the reading direction; the right-to-left rows match the mirrored render exactly.
- Reduced motion: upstream's freeze to 0.6 opacity (`respectReducedMotion`, on by default) is kept; the `static` row is 0 px.
- Tokens: upstream's presets are kept as raw colors (they read the same on any theme). No shared tokens.

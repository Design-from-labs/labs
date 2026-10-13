# Shimmer Trace: port fidelity

- Upstream: jeetvora331/shimmer-trace @ e473c07f6ab3836e5d2110872a85c2d34093c466 (src)
- Harness: one Vite 7.3.1 page renders either upstream's source or the port's files with the same props and markup; React 19.3.0; Chromium (Playwright 1.64.0), device scale 1
- Diff: pixelmatch (S-152) at threshold 0 (any color difference counts: at the usual 0.1 the default sweep, #f5f5f5 over #e0e0e0, falls under pixelmatch's cutoff, so a missing sweep measured 0 px; at 0 it measures 19%, the `reduced-wave` row), anti-aliased pixels excluded; percent of the cropped stage (or demo section)
- Viewports: 1280x800 (desktop) and 375x812 (mobile)
- Target: at most 0.1%. Worst port frame: **0.0000%** (desktop-wave-300ms; 56 frames against upstream)

## Scene

A profile card (avatar image, heading, two paragraphs, two tags and a button) inside `<Shimmer loading>`, with "Below the shimmer" text after it in a flex column with a 12 px gap. Every animation (`wave`, `pulse`, `shine`, `glow`, `gradient`) is paused at matched times (`Animation.currentTime`) of 300, 600 or 900 ms; dark uses #26262b / #3a3a40 on a dark card; `list` clones the card three times (`dummyLength`, `dummyData`), `as` renders `as={Card}` twice, `nested` adds a reporter Shimmer, `no-preserve` sets `preserveBackground={false}`, `radius-shine` a 12 px radius at speed 2.5, `loaded` is `loading={false}`. `parent-*` puts the Shimmer in a two-column grid, a space-between flex row, a Tailwind `space-y-4` stack and a block with margins, to show that the new live region takes no space. `right to left` renders the port's master in a `dir="rtl"` page against the mirrored left-to-right render (also at threshold 0.1, because fractional positions round differently when mirrored).

## Upstream demo

Upstream's own demo app (`demo/`, Vite 5.4.21, React 18.3.1 from its lockfile) ran from the pinned commit twice, with its `shimmer-trace` import aliased to upstream's `src/index.ts` and to the port (so the demo code is upstream's own, and React 18 also exercises the port's non-hoisted `<style>`). Remote avatars were answered with the same local image on both sides and Google Fonts were refused on both (fallback fonts); the sticky controls bar was made static so it does not cover the sections. Each `st-demo` row crops one `.demo-section` after the Suspense examples resolve, with the animation picked by the demo's own buttons and paused at 400 ms.

## Results

| Against | Viewport | State | Crop | Differing pixels | Percent |
| --- | --- | --- | --- | ---: | ---: |
| upstream | desktop | desktop-wave-300ms | 520x254 | 0 | 0.0000% |
| upstream | desktop | desktop-wave-900ms | 520x254 | 0 | 0.0000% |
| upstream | mobile | mobile-wave-600ms | 343x275 | 0 | 0.0000% |
| upstream | desktop | dark-wave-600ms | 520x254 | 0 | 0.0000% |
| upstream | desktop | desktop-pulse-300ms | 520x254 | 0 | 0.0000% |
| upstream | desktop | desktop-pulse-900ms | 520x254 | 0 | 0.0000% |
| upstream | mobile | mobile-pulse-600ms | 343x275 | 0 | 0.0000% |
| upstream | desktop | dark-pulse-600ms | 520x254 | 0 | 0.0000% |
| upstream | desktop | desktop-shine-300ms | 520x254 | 0 | 0.0000% |
| upstream | desktop | desktop-shine-900ms | 520x254 | 0 | 0.0000% |
| upstream | mobile | mobile-shine-600ms | 343x275 | 0 | 0.0000% |
| upstream | desktop | dark-shine-600ms | 520x254 | 0 | 0.0000% |
| upstream | desktop | desktop-glow-300ms | 520x254 | 0 | 0.0000% |
| upstream | desktop | desktop-glow-900ms | 520x254 | 0 | 0.0000% |
| upstream | mobile | mobile-glow-600ms | 343x275 | 0 | 0.0000% |
| upstream | desktop | dark-glow-600ms | 520x254 | 0 | 0.0000% |
| upstream | desktop | desktop-gradient-300ms | 520x254 | 0 | 0.0000% |
| upstream | desktop | desktop-gradient-900ms | 520x254 | 0 | 0.0000% |
| upstream | mobile | mobile-gradient-600ms | 343x275 | 0 | 0.0000% |
| upstream | desktop | dark-gradient-600ms | 520x254 | 0 | 0.0000% |
| upstream | desktop | desktop-list-wave-600ms | 520x658 | 0 | 0.0000% |
| upstream | desktop | desktop-as-pulse-600ms | 520x456 | 0 | 0.0000% |
| upstream | desktop | desktop-nested-wave-600ms | 520x456 | 0 | 0.0000% |
| upstream | desktop | desktop-no-preserve-wave-600ms | 520x254 | 0 | 0.0000% |
| upstream | desktop | desktop-radius-shine-600ms | 520x254 | 0 | 0.0000% |
| upstream | desktop | desktop-loaded | 520x254 | 0 | 0.0000% |
| upstream | mobile | mobile-loaded | 343x275 | 0 | 0.0000% |
| upstream | mobile | mobile-list-gradient-600ms | 343x721 | 0 | 0.0000% |
| upstream (Labs change: upstream keeps animating) | desktop | reduced-wave | 520x254 | 25138 | 19.0324% |
| static check (port, 500 ms apart) | desktop | reduced-static-wave | 520x254 | 0 | 0.0000% |
| static check (port, 500 ms apart) | desktop | reduced-static-gradient | 520x254 | 0 | 0.0000% |
| upstream | desktop | desktop-parent-grid-wave-300ms | 520x498 | 0 | 0.0000% |
| upstream | desktop | desktop-parent-row-wave-300ms | 520x275 | 0 | 0.0000% |
| upstream | desktop | desktop-parent-space-wave-300ms | 520x666 | 0 | 0.0000% |
| upstream | desktop | desktop-parent-block-wave-300ms | 520x334 | 0 | 0.0000% |
| upstream | mobile | mobile-parent-grid-wave-300ms | 343x498 | 0 | 0.0000% |
| upstream | desktop | desktop-label-override-wave-300ms | 520x254 | 0 | 0.0000% |
| right to left (port) | desktop | rtl-wave-300ms-mirrored | 488x190 | 32 | 0.0345% |
| right to left (port) | desktop | rtl-shine-300ms-mirrored | 488x190 | 30 | 0.0324% |
| right to left (port) | desktop | rtl-wave-300ms-mirrored (threshold 0.1) | 488x190 | 0 | 0.0000% |
| right to left (port) | desktop | rtl-shine-300ms-mirrored (threshold 0.1) | 488x190 | 0 | 0.0000% |
| upstream demo | desktop | desktop-wave-section1 | 852x210 | 0 | 0.0000% |
| upstream demo | desktop | desktop-wave-section2 | 852x436 | 0 | 0.0000% |
| upstream demo | desktop | desktop-wave-section3 | 852x1036 | 0 | 0.0000% |
| upstream demo | desktop | desktop-wave-section4 | 852x239 | 0 | 0.0000% |
| upstream demo | desktop | desktop-wave-section5 | 852x492 | 0 | 0.0000% |
| upstream demo | desktop | desktop-wave-section6 | 852x249 | 0 | 0.0000% |
| upstream demo | desktop | desktop-wave-section7 | 852x338 | 0 | 0.0000% |
| upstream demo | desktop | desktop-pulse-section1 | 852x210 | 0 | 0.0000% |
| upstream demo | desktop | desktop-pulse-section4 | 852x239 | 0 | 0.0000% |
| upstream demo | desktop | desktop-shine-section1 | 852x210 | 0 | 0.0000% |
| upstream demo | desktop | desktop-shine-section4 | 852x239 | 0 | 0.0000% |
| upstream demo | desktop | desktop-glow-section1 | 852x210 | 0 | 0.0000% |
| upstream demo | desktop | desktop-glow-section4 | 852x239 | 0 | 0.0000% |
| upstream demo | desktop | desktop-gradient-section1 | 852x210 | 0 | 0.0000% |
| upstream demo | desktop | desktop-gradient-section4 | 852x239 | 0 | 0.0000% |
| upstream demo | mobile | mobile-wave-section1 | 327x275 | 0 | 0.0000% |
| upstream demo | mobile | mobile-wave-section3 | 327x1108 | 0 | 0.0000% |
| upstream demo | mobile | mobile-wave-section4 | 327x559 | 0 | 0.0000% |
| upstream demo | desktop | desktop-loaded-section1 | 852x210 | 0 | 0.0000% |
| upstream demo | desktop | desktop-loaded-section2 | 852x436 | 0 | 0.0000% |
| upstream demo | desktop | desktop-loaded-section3 | 852x1036 | 0 | 0.0000% |
| upstream demo | desktop | desktop-loaded-section4 | 852x239 | 0 | 0.0000% |

## Evidence

`<state>-before.webp` is upstream, `-after.webp` the port, `-diff.webp` the pixelmatch overlay (red: differing pixels), for a representative subset of the frames above.

## Deviations

- Merged nine modules into two files (decision 0016): `shimmer-trace.tsx` (index.ts's documentation, `ShimmerContext`, `ShimmerOverlay`, `Shimmer`, `ShimmerSuspense`, `createShimmer`) and `shimmer-trace-core.ts` (`types`, `utils`, `styles`, `useTrace`), each module after a `// ---- upstream: <path> ----` marker. Only the import lines changed (type-only imports are marked `type`).
- Every upstream export keeps its name. Because the npm library re-exports every file of an item, names that upstream's `index.ts` did not re-export (`DEFAULTS`, `IsShimmeringContext`, `ShimmerOverlay`, `useTrace`, `generateShimmerKey`, `FALLBACK_DIMENSIONS`, `ShimmerContextValue`) are public too; none collide (P-040).
- `styles.ts`: `injectStyles()` and its `document.head` injection are gone. The stylesheet is exported as `SHIMMER_TRACE_CSS` and the master Shimmer renders it as `<style href="designfrom-shimmer-trace" precedence="default">` (decision 0013), which also works in server rendering. React 18 (upstream demo rows) renders that element inline inside the container; it is `display: none` and skipped by the tracer, and the demo rows match.
- Keyframes carry the component name: `shimmer-wave`, `-pulse`, `-shine`, `-glow`, `-gradient` to `shimmer-trace-wave`, and so on, in the stylesheet and in the overlay's inline `animation` values.
- Labs addition (screen readers): upstream's overlay is `role="status"` with `aria-busy` and `aria-label="Loading content"`, but it sits inside the container that is `aria-hidden` while loading, so it was never announced. The port keeps that overlay as is and adds a polite live region (`role="status"`, `aria-live="polite"`, visually hidden, absolutely positioned) just before the container, outside the hidden subtree. It holds the new `loadingLabel` prop (default "Loading content"; also on `ShimmerSuspense`) while loading and is empty otherwise. It is not `aria-busy`, because a busy live region defers its announcements. The `parent-*` rows show grid, flex, `space-y` and block parents lay out exactly as before. Caveat: a selector that counts siblings (`:first-child`, `* + *`, Tailwind v3 `space-y`) now sees one more element before the container.
- Labs addition (reduced motion; upstream had none): under `prefers-reduced-motion: reduce` the blocks are static and base-colored, with no sweep, pulse, glow or gradient drift. The overlay gets `data-shimmer-overlay` and an inline `--shimmer-trace-base-color`, and the sweep layer gets `data-shimmer-sweep`, so the stylesheet can target them. The `reduced-wave` row differs from upstream by design. The `static` rows are 0 px.
- Labs addition (right to left): `[data-shimmer-sweep]:dir(rtl) { scale: -1 1; }` makes the sweep run right to left. The blocks already follow the mirrored layout, because they are measured. The right-to-left rows match the mirrored render.
- Tokens: upstream's colors (`#e0e0e0`, `#f5f5f5`) are the defaults. Pass `baseColor` and `highlightColor` (for example `var(--accent)` and `var(--card)`, as the demo does) to theme it.

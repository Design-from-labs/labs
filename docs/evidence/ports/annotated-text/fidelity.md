# Annotated Text: port fidelity

- Upstream: harshjdhv/componentry @ b602c2872fea85c9f2464016ce3bbe0af17b51b4 (`packages/ui/src/components/annotated-text.tsx`)
- Harness: one Vite and Tailwind 4.3.3 page renders upstream's docs preview (`apps/web/components/docs/annotated-text.tsx`, the twelve marks in a two-column grid, verbatim) with either upstream's component or the port, same props, page, Figtree and theme; React 19.3.0; Chromium (Playwright 1.64.0), device scale 1
- Diff: pixelmatch (S-152), threshold 0.1, anti-aliased pixels excluded; percent of all pixels in the frame. The noise floor is upstream diffed with a second upstream load of the same frame.
- Viewports: 1280x800 (desktop) and 375x812 (mobile); light and dark color schemes
- Target: at most 0.1%. Worst port frame: **0.0167%** (16 frames). Noise floor: up to 0.0161% (49 px) over three full runs.

## Scene

All twelve variants (wavy, underline, doubleUnderline, dottedUnderline, line, arrow, highlight, circle, box, bracket, strikethrough, crossOut) with upstream's staggered delays (0 to 0.88 s). The strokes come from fixed seeds in the component, so no randomness is involved. Mid-draw frames are frozen by pausing every Web Animation and setting the same `currentTime` in both (300, 700 and 1100 ms); rest is after every mark has drawn.

## Upstream demo

The componentry site (Next.js, `apps/web`) was run from the same commit and its docs page for the component captured: `upstream-site-desktop-at-500ms.webp` (every animation paused at 500 ms) and `upstream-site-desktop-rest.webp`. The site is dark themed with its own fonts and layout, so it is the reference picture, and the numbers come from the shared harness.

## Results

| Against | Viewport | State | Differing pixels | Percent | Noise floor |
| --- | --- | --- | ---: | ---: | ---: |
| upstream | desktop | light-at-300ms | 0 | 0.0000% | 0.0033% |
| upstream | desktop | light-at-700ms | 0 | 0.0000% | 0.0000% |
| upstream | desktop | light-at-1100ms | 0 | 0.0000% | 0.0000% |
| upstream | desktop | light-rest | 0 | 0.0000% | 0.0000% |
| upstream | desktop | dark-at-300ms | 0 | 0.0000% | 0.0000% |
| upstream | desktop | dark-at-700ms | 0 | 0.0000% | 0.0000% |
| upstream | desktop | dark-at-1100ms | 0 | 0.0000% | 0.0000% |
| upstream | desktop | dark-rest | 0 | 0.0000% | 0.0000% |
| upstream | mobile | light-at-300ms | 49 | 0.0161% | 0.0000% |
| upstream | mobile | light-at-700ms | 0 | 0.0000% | 0.0000% |
| upstream | mobile | light-at-1100ms | 0 | 0.0000% | 0.0000% |
| upstream | mobile | light-rest | 0 | 0.0000% | 0.0000% |
| upstream | mobile | dark-at-300ms | 0 | 0.0000% | 0.0000% |
| upstream | mobile | dark-at-700ms | 51 | 0.0167% | 0.0000% |
| upstream | mobile | dark-at-1100ms | 0 | 0.0000% | 0.0000% |
| upstream | mobile | dark-rest | 0 | 0.0000% | 0.0000% |

The few differing pixels (on either side, and between two upstream loads) are a single stroke edge in a mid-draw frame; the same frames match exactly on other runs.

## Evidence

`<state>-before.webp` is upstream, `-after.webp` the port, `-diff.webp` the pixelmatch overlay (red: differing pixels).

## Deviations

- `@workspace/ui/lib/utils` is `@/lib/utils` (the shadcn `utils` item).
- Labs, right to left: the marks are positioned with `start-*` instead of `left-*` and the SVG marks are mirrored (`rtl:-scale-x-100`), and the clip-path reveal runs from the right in a right-to-left context, so each mark is drawn from the inline start and the arrow points along the reading direction. Left to right is unchanged (the numbers above).
- Labs, contrast on request (ports/README.md): the default highlight keeps upstream's translucent yellow, under which light text in dark mode measures **3.30:1** (#fafafa on the composited fill, rgb(158, 138, 23)). Under `prefers-contrast: more` in dark mode the fill is dimmed to 30% (8.51:1). In light mode the default already measures well above 4.5:1.
- Labs, forced colors: the dotted underline and the line are CSS backgrounds, which forced colors remove, so they are drawn in `CanvasText` there; the highlight's drawn fill is hidden and the words take the system `Mark` and `MarkText` colors, like a `<mark>`.
- Reduced motion is upstream's own behavior: under `prefers-reduced-motion` the marks are drawn from the start.

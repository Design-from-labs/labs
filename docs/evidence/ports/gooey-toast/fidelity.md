# Gooey Toast: port fidelity

- Upstream: anl331/goey-toast @ be6bd884c85d52cca930b09b425ef68858d1b63c (src)
- Harness: one page renders either upstream's source or the port's files, same props, page, fonts and state; React 19.3.0, motion/framer-motion 14.1.0, sonner 2.0.8, tegaki 1.1.0; Chromium (Playwright 1.64.0), device scale 1
- Diff: pixelmatch (S-152), threshold 0.1, anti-aliased pixels excluded; percent of all pixels in the frame
- Viewports: 1280x800 (desktop) and 375x812 (mobile)
- Target: at most 0.1%. Worst port frame: **0.0916%** (26 frames)

## Scene

`<GooeyToaster>` with the demo's options (spring, bounce 0.3) and the demo's own toasts: success pill, error with description, info with action, warning, default and a pending promise; light top-left, dark bottom-right and top-right. `clock-*` frames run on Playwright's clock (mid-morph frames and fixed timestamps); the other states run in real time, one toast per fresh page, captured once two frames 250 ms apart are identical, with the wall-clock timestamps hidden in both. Real-time states take the best of three captures; the `control` rows measure upstream against itself under the same conditions, which is the noise floor.

## Upstream demo

The upstream demo app (`demo/`, Vite, its own lockfile with framer-motion 12.34 and sonner 2.0.7) was run from the same commit, and its Success example compared with the port cropped to the toast (background #fafaf7 in both): see `demo-*`.

## Results

| Against | Viewport | State | Differing pixels | Percent |
| --- | --- | --- | ---: | ---: |
| upstream | desktop | clock-success-pill | 3 | 0.0003% |
| upstream | desktop | clock-plus-error-desc-at-300ms | 0 | 0.0000% |
| upstream | desktop | clock-error-desc-at-900ms | 398 | 0.0389% |
| upstream | mobile | clock-success-pill | 3 | 0.0010% |
| upstream | mobile | clock-plus-error-desc-at-300ms | 0 | 0.0000% |
| upstream | mobile | clock-error-desc-at-900ms | 0 | 0.0000% |
| upstream | desktop | tl-light-success | 3 | 0.0003% |
| upstream | mobile | tl-light-success | 3 | 0.0010% |
| upstream | desktop | tl-light-error-desc | 0 | 0.0000% |
| upstream | mobile | tl-light-error-desc | 0 | 0.0000% |
| upstream | desktop | tl-light-action | 0 | 0.0000% |
| upstream | mobile | tl-light-action | 0 | 0.0000% |
| upstream | desktop | br-dark-success | 304 | 0.0297% |
| upstream | mobile | br-dark-success | 231 | 0.0759% |
| upstream | desktop | br-dark-error-desc | 0 | 0.0000% |
| upstream | mobile | br-dark-error-desc | 0 | 0.0000% |
| upstream | desktop | br-dark-action | 0 | 0.0000% |
| upstream | mobile | br-dark-action | 0 | 0.0000% |
| upstream | desktop | tr-info | 466 | 0.0455% |
| upstream | mobile | tr-info | 0 | 0.0000% |
| upstream | desktop | tr-warning | 668 | 0.0652% |
| upstream | mobile | tr-warning | 0 | 0.0000% |
| upstream | desktop | tr-default | 185 | 0.0181% |
| upstream | mobile | tr-default | 164 | 0.0539% |
| upstream | desktop | tr-loading | 158 | 0.0154% |
| upstream | mobile | tr-loading | 279 | 0.0916% |
| control | desktop | br-dark-success | 211 | 0.0206% |
| control | mobile | br-dark-success | 272 | 0.0893% |
| control | desktop | br-dark-error-desc | 0 | 0.0000% |
| control | mobile | br-dark-error-desc | 0 | 0.0000% |
| control | desktop | tr-info | 493 | 0.0481% |
| control | mobile | tr-info | 49 | 0.0161% |
| control | desktop | tr-warning | 410 | 0.0400% |
| control | mobile | tr-warning | 158 | 0.0519% |
| upstream demo | desktop | success (251x66 crop) | 5 | 0.0302% |
| upstream demo | mobile | success (375x66 crop) | 3 | 0.0121% |

## Evidence

`<state>-before.webp` is upstream, `-after.webp` the port, `-diff.webp` the pixelmatch overlay (red: differing pixels).

## Deviations

- Merged into four files (`gooey-toast`, `-view`, `-core`, `-icons`); upstream lines are unchanged apart from imports.
- `framer-motion` is imported as `motion/react` (the same library under its current name).
- The stylesheet ships as a string the toaster injects just ahead of Sonner's own style element, reproducing upstream's cascade order (upstream: `import "goey-toast/styles.css"`). Injecting it after Sonner's broke the first toast on mobile.
- The inline SVG icons are Lucide icons with the same geometry (the Phosphor item swaps them). The default type's bell is Lucide's current Bell, a few pixels different from upstream's older outline (part of the under 250 px on `tr-default`).
- No `process.env` (contract): the dev-only missing-CSS warning is gone (the CSS cannot be missing now), and the error boundary logs in every environment.
- Labs addition: the status icon wrapper is `aria-hidden` (Phosphor icons are not hidden by default).
- The keyframes and the progress variable carry the component's name (`gooey-toast-spin`, `gooey-toast-progress-shrink`, `--gooey-toast-progress-duration`), as the repository's keyframe guard requires; class names keep upstream's `gooey-` prefix.
- Tokens: upstream's palette is kept as the default. It follows the toaster's own `theme` prop (light or dark), not the page's color scheme, so it is not mapped to shared tokens; toasts are themed with `fillColor`, `borderColor` and `classNames`, as upstream.
- Upstream behavior kept, noted for review: in real time a pill toast occasionally disappears a few seconds in, in upstream and port alike (the harness retriggers it).

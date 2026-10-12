# ripple: fidelity

- Upstream: [yui540/css-animations `2026-04-25/tips-4.html`](https://github.com/yui540/css-animations/blob/e30edfcfcc3e0f7a3bd44f3d5566ee23c9aaa186/2026-04-25/tips-4.html) at `e30edfcfcc3e0f7a3bd44f3d5566ee23c9aaa186` (MIT, copyright 2026 yui540; S-150)
- Port: `content/components/yui540-css-animations/ripple` (item `ripple`, primitive none, no icons)
- Method: the upstream HTML page and a page with our component's server-rendered markup (React 19, Tailwind v4 preflight and utilities) in the same frame (page background, a centered 320px stage), in Chromium (Playwright S-014) at device scale 1. Every CSS animation is paused with the Web Animations API and set to the same `currentTime`, at 0, 25, 50, 75 and 100% of the 2000 ms sequence (one pass of both waves; it loops). The 320x320 stage is diffed with pixelmatch (S-152, threshold 0.1; PNG handling S-153; the port bundled for server rendering with esbuild S-154).
- Target: at most 0.1% differing pixels.

## Result: stage pixels that differ

| Viewport | 0% | 25% | 50% | 75% | 100% |
| --- | --- | --- | --- | --- | --- |
| 1280x800 | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% |
| 375x812 | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% |

A denser sweep (every 5%, 21 frames, 1280x800) peaks at 0.000%. Whole-viewport diffs are 0.000% as well.

Strips (left to right: 0, 25, 50, 75, 100%; 1280x800): [before.webp](before.webp) (upstream), [after.webp](after.webp) (port), [diff.webp](diff.webp) (pixelmatch; red would mark a differing pixel).

## Enhancements (after fidelity)

- Colors are the item's own variables (`--ripple-surface`, `--ripple-wave`) in light and dark; the light values are the upstream grays, so the default look is unchanged.
- Reduced motion (`prefers-reduced-motion: reduce`): only opacity animates. Measured: the animated properties under reduced motion are [opacity].
- Right to left: the figure is mirrored. The `dir="rtl"` render equals the horizontally flipped left-to-right render at every step: 0.000%, 0.000%, 0.000%, 0.000%, 0.000% (reduced motion: 0.000%, 0.000%, 0.000%, 0.000%, 0.000%).
- Accessibility: decorative (aria-hidden) by default; with aria-label it is role="img". axe found no violations in the gallery demo at 1280 and 375 wide. It loops, so it takes `paused` (WCAG 2.2.2); the demo's toggle is a native button with aria-pressed.

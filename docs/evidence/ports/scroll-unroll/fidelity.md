# scroll-unroll: fidelity

- Upstream: [yui540/css-animations `2026-04-25/tips-1.html`](https://github.com/yui540/css-animations/blob/e30edfcfcc3e0f7a3bd44f3d5566ee23c9aaa186/2026-04-25/tips-1.html) at `e30edfcfcc3e0f7a3bd44f3d5566ee23c9aaa186` (MIT, copyright 2026 yui540; S-150)
- Port: `content/components/yui540-css-animations/scroll-unroll` (item `scroll-unroll`, primitive none, no icons)
- Method: the upstream HTML page and a page with our component's server-rendered markup (React 19, Tailwind v4 preflight and utilities) in the same frame (page background, a centered 320px stage), in Chromium (Playwright S-014) at device scale 1. Every CSS animation is paused with the Web Animations API and set to the same `currentTime`, at 0, 25, 50, 75 and 100% of the 2700 ms sequence. The 320x320 stage is diffed with pixelmatch (S-152, threshold 0.1; PNG handling S-153; the port bundled for server rendering with esbuild S-154).
- Target: at most 0.1% differing pixels.

## Result: stage pixels that differ

| Viewport | 0% | 25% | 50% | 75% | 100% |
| --- | --- | --- | --- | --- | --- |
| 1280x800 | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% |
| 375x812 | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% |

A denser sweep (every 5%, 21 frames, 1280x800) peaks at 0.000%. Whole-viewport diffs are 0.000% as well.

Strips (left to right: 0, 25, 50, 75, 100%; 1280x800): [before.webp](before.webp) (upstream), [after.webp](after.webp) (port), [diff.webp](diff.webp) (pixelmatch; red would mark a differing pixel).

## Font context

The upstream page loads M PLUS 1 (S-151) from Google Fonts and sets it on the letters only; the spaces between the letter spans and the line box strut come from the page's default font and line height. Our component sets no font family (it inherits yours), so the harness applies M PLUS 1 to the letters and gives the page the browser defaults the upstream page has (`font-family: initial; line-height: normal`). Under Tailwind preflight's sans font and `line-height: 1.5` the same markup measures 0.25% to 0.82% of stage pixels: the inter-letter spaces and the strut follow the inherited font, as they do upstream.

## Enhancements (after fidelity)

- Colors are the item's own variables (`--scroll-unroll-surface`, `--scroll-unroll-ink`, `--scroll-unroll-line`, `--scroll-unroll-roll`, `--scroll-unroll-roll-shade`, `--scroll-unroll-core`) in light and dark; the light values are the upstream grays, so the default look is unchanged.
- Reduced motion (`prefers-reduced-motion: reduce`): only opacity animates. Measured: the animated properties under reduced motion are [opacity].
- Right to left: the scroll follows the title's own direction (dir="auto"); a right-to-left title (checked with Hebrew) mirrors the roll and line while the letters keep their reading order. A left-to-right title in a right-to-left page renders identically to the left-to-right page (0.000% at every step).
- Accessibility: the title is announced once from a visually hidden copy; the letters are aria-hidden. axe found no violations in the gallery demo at 1280 and 375 wide. The demo's Replay button remounts it (a new `key`).

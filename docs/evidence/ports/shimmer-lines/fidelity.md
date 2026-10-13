# shimmer-lines: fidelity

- Upstream: [Text Shimmer Lines [contenteditable] by Jhey](https://codepen.io/jh3y/pen/Exqbaem), the pen's debug view saved verbatim as `ports/jh3y-text-shimmer/shimmer-lines/upstream/debug.html` on 2026-10-13 (MIT, copyright 2026 Jhey; S-455). The pen has no git commit, so the pin is the git tree hash of that directory, `0cb5373d804aea412b690a490e4dfa945978038c` (decision `docs/decisions/0030-pin-snapshot-sources.md`); `git rev-parse <commit>:ports/jh3y-text-shimmer/shimmer-lines/upstream` must equal it.
- Port: `content/components/jh3y-text-shimmer/shimmer-lines` (item `shimmer-lines`, primitive none, no icons)
- Method: the pen's own page, served locally with the substitutions listed under Deviations, against a page with our component (React 19.3, Tailwind 4.3 and the component's `cssVars`, generated from `component.json`) in the same frame, in Chromium (Playwright S-014) at device scale 1. The four lines of the pen are rendered with the pen's own fluid type scale. Every CSS animation is paused with the Web Animations API and set to the same `currentTime` (0, 400, 800, 1200, 1600, 2000 and 3000 ms of the 2.28 to 4.56 s sweeps), then the full viewport and the stage (the `main` element plus 8 px) are diffed with pixelmatch (S-152, threshold 0.1; PNG handling S-153). The pen's tweakpane panel is replaced by its default values (dark theme, speed 0.12, spread 3, angle 295, position 50, classic).
- Target: at most 0.1% differing pixels.

## Result: stage pixels that differ

| State | Viewport | Frames | Worst stage | Worst viewport |
| --- | --- | --- | --- | --- |
| classic, dark (the pen default) | 1280x800 | 0, 400, 800, 1200, 1600, 2000, 3000 ms | 0.000% | 0.000% |
| classic, dark | 375x812 | same 7 | 0.000% | 0.000% |
| classic, light | 1280x800 and 375x812 | 0, 800, 1600 ms | 0.000% | 0.000% |
| aurora, dark | 1280x800 and 375x812 | 0, 800, 1600 ms | 0.000% | 0.000% |
| flame, dark | 1280x800 and 375x812 | 0, 800, 1600 ms | 0.000% | 0.000% |
| "Configure" mode, position 50 | 1280x800 and 375x812 | static | 0.000% | 0.000% |
| "Configure" mode, position 20, spread 6, angle 60 | 1280x800 and 375x812 | static | 0.000% | 0.000% |
| speed 0.2 | 1280x800 and 375x812 | 0, 1000, 2000 ms | 0.000% | 0.000% |

Noise floor (the upstream page against a second load of itself, classic dark, 7 frames, both viewports): 0.000%. The stage is 87,474 px at 1280x800 and 50,042 px at 375x812.

Strips (left to right: the 7 frames; 1280x800): [before.webp](before.webp) (upstream), [after.webp](after.webp) (port), [diff.webp](diff.webp) (pixelmatch; a red pixel would mark a difference).

## Deviations (every change from upstream)

- The tweakpane panel (`esm.sh/tweakpane@4.0.4`) is left out and its defaults are pinned, as the brief asks. The `bordered` option the pen defines is not read by any rule, so it has no counterpart.
- Fonts: the pen imports Ubuntu from Google Fonts, but its body font stack never names it (the first installed face of `SF Pro Text, ..., Helvetica Neue` wins, so the pen looks different on each machine). Both sides of the diff use Figtree, the repository's font (S-035); the port inherits the font of its surroundings.
- `normalize.css` (S-458) is the file the pen links from a CDN, 8.0.1, served from a local copy on the upstream side; the port page repeats its three rules that matter (`html` line height, `body` margin, `main` display) in its own page style. Nothing from it ships.
- Page chrome that is not the component is hidden on the upstream side and absent on the port side: the author's follow link and the backdrop grid.
- The pen's `p` with `contenteditable` becomes an inline-block `span` that takes any children. Editing is a demo-only feature: the demo makes each line editable, and passes `length` so the duration follows what you type, as the pen does.
- The pen counts the markup's indentation in each line's `textContent`, so its sweeps last 38, 30, 23 and 19 characters long (not 22, 14, 7 and 3). The component counts the real text; the diff passes the pen's counts as `length`.
- The fluid type scale (`.fluid`) belongs to the page; the demo applies it, the component inherits the font size.
- `canvas` and `canvasText` follow `color-scheme`, which the site does not drive from its theme class. The resting and band colors are the variables `--shimmer-lines-base` and `--shimmer-lines-highlight`, whose light and dark values are the colors those keywords resolve to (`#fff` and `#000`; `#121212` and `#fff`); the keywords stay as the fallback.
- Names: the keyframes, variables and the `data-slot` part carry the component name (decision 0013).

## Enhancements (after fidelity)

- Props: `variant` (classic, aurora, flame: the pen's three styles), `speed`, `duration`, `length`, `spread`, `angle`, `position` (the pen's "Configure" mode) and `paused`. The defaults are the pen's, so the default look is unchanged.
- Reduced motion (`prefers-reduced-motion: reduce`): no animation and no band; the text shows in the full-contrast highlight color. Measured: 0 running animations, `background-image: none`, color white on a dark page.
- Forced colors: no animation, the system text color. Measured: 0 animations, color white (CanvasText on a dark page).
- More contrast (`prefers-contrast: more`): the resting text takes the highlight color. The default resting colors fail WCAG AA by design, as in the original: about 1.6:1 (light) and 2.1:1 (dark) against the page, computed from the HSL mix of the page color with 20% of the text color. The lift is on request only (ports/README.md, "Contrast policy").
- Right to left: the band sweeps from the inline start edge and its slant is mirrored (`360 - angle`); left to right is unchanged. The `dir="rtl"` render equals the horizontally flipped left-to-right render of the full viewport (block glyphs, so the text is symmetric): 0.000% at 1280x800 for all 6 frames (aurora: 0.000%), and at most 0.090% at 375x812 for classic (aurora: 0.220% at one frame; not isolated, it only appears at the odd viewport width, where a centered line cannot mirror to the same sub-pixel). The unmirrored comparison differs by 1% to 6%, so the check can fail.
- Accessibility: the text is real text, selectable and read as it is. axe (wcag2a to wcag22aa, best-practice) found no violations in the demo, light and dark, left to right and right to left, at 1280 and 375 wide. The demo's lines are `role="textbox"` with a name; Enter is blocked so a line stays one line. No horizontal overflow at 320 and 375 wide.
- Motion cost (not traced: a DevTools performance trace returned no insights for these pages, so this follows from the animated property): the sweep animates `background-position`, as upstream does, which the browser repaints on the main thread rather than compositing; Text Shimmer, which animates `translate`, is the compositor-friendly alternative.

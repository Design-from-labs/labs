# text-shimmer: fidelity

- Upstream: ["GPU accelerated text shimmer" by Devon Govett](https://codepen.io/editor/devongovett/pen/01a0439c-4b7f-7f44-bf84-205c514ad139), a CodePen 2.0 project, its files (`index.html`, `style.css` and an empty `script.js`) saved verbatim under `ports/devongovett-text-shimmer/text-shimmer/upstream` on 2026-10-13 (MIT, copyright 2026 Devon Govett; S-456). The project has no git commit, so the pin is the git tree hash of that directory, `33ec0fa624b1dd5e2f19c0f90baf11adbf5cf42b` (decision `docs/decisions/0030-pin-snapshot-sources.md`).
- Port: `content/components/devongovett-text-shimmer/text-shimmer` (item `text-shimmer`, primitive none, no icons)
- Method: the project's own `index.html` and `style.css`, served locally with the substitution under Deviations, against a page with our component (React 19.3, Tailwind 4.3 and the component's `cssVars`) in the same frame, in Chromium (Playwright S-014) at device scale 1, light and dark. Every CSS animation (the shine's `::after`) is paused with the Web Animations API and set to the same `currentTime` (0, 400, 800, 1250, 1700, 2100 and 2450 ms of the 2.5 s sweep), then the full viewport and the stage (the wrapper plus 8 px) are diffed with pixelmatch (S-152, threshold 0.1; PNG handling S-153).
- Target: at most 0.1% differing pixels.

## Result: stage pixels that differ

| State | Viewport | Frames | Worst stage | Worst viewport |
| --- | --- | --- | --- | --- |
| light | 1280x800 | 0, 400, 800, 1250, 1700, 2100, 2450 ms | 0.000% | 0.000% |
| light | 375x812 | same 7 | 0.000% | 0.000% |
| dark | 1280x800 and 375x812 | 0, 800, 1250, 1700 ms | 0.000% | 0.000% |
| system light and system dark (no theme override, the project's own `color-scheme: light dark`) | 1280x800 and 375x812 | 0 and 1250 ms | 0.000% | 0.000% |

Noise floor (the upstream page against a second load of itself, light, 7 frames, both viewports): 0.000%. The stage is 5,600 px.

Strips (left to right: the 7 frames; 1280x800): [before.webp](before.webp) (upstream), [after.webp](after.webp) (port), [diff.webp](diff.webp) (pixelmatch; a red pixel would mark a difference).

## Deviations (every change from upstream)

- Font: the project sets `font-family: system-ui`, which differs by machine. Both sides use Figtree, the repository's font (S-035); the component sets no font family and inherits it.
- The project's `html { color-scheme }` rule and the browser's default body margin belong to the page, not the component; the port page repeats them.
- The upstream's fixed `#text` id (for the Firefox mask fallback) is a per-instance id from `useId`, so several instances on a page each mask with their own text.
- The gray (`#777`), the shine color (`light-dark(black, white)`), the spread (`4ch`) and the duration (`2.5s`) became the variables `--text-shimmer-color` and `--text-shimmer-highlight` (light `#000`, dark `#fff`, the values `light-dark` resolves to) and the props `spread` and `duration`, with the project's values as defaults.
- The CSS is the project's, line for line and with its comments, with the nesting kept; the parts, keyframes and variables carry the component name (decision 0013), and `user-select: none` is added to the hidden copy.
- Name: Text Shimmer is the item name; the project has none.

## Enhancements (after fidelity)

- `paused` holds the shine (WCAG 2.2.2).
- Reduced motion: the shine is not drawn (the project's own rule), only the plain gray text remains. Measured: 0 running animations, shine `display: none`.
- Forced colors: the shine is hidden and the text takes the system color (white on a dark page). More contrast (`prefers-contrast: more`): the gray moves a quarter toward the highlight color (`#777` becomes `#999` on dark, `#595959` on light). The default gray is 4.48:1 on white and 4.18:1 on `#121212`, so it fails AA by a hair, as the project does; the lift is on request only (ports/README.md, "Contrast policy").
- Right to left: the shine sweeps from the inline start edge. The keyframes are mirrored instead of reversing the animation, because reversing also reverses the default `ease`, which is not symmetric (found when the first attempt differed by 0.38%). The `dir="rtl"` render equals the horizontally flipped left-to-right render of the full viewport (block glyphs), 0.000% for all 6 frames at 1280x800 and at 375x812; unmirrored they differ by up to 0.93%.
- Accessibility: the words are real text, read once; the hidden copy is `inert` and `aria-hidden` (the accessibility snapshot of the demo lists each phrase once). axe (wcag2a to wcag22aa, best-practice) found no violations in the demo, light and dark, left to right and right to left, at 1280 and 375 wide. No horizontal overflow at 320 and 375 wide.
- Cost (not traced: a DevTools performance trace returned no insights for the page, so this follows from the animated property): the shine moves with `translate` on a `will-change: transform` layer, which is the compositor-friendly path; the text is drawn twice, so keep it to short phrases.

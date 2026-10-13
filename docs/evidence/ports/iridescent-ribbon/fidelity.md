# iridescent-ribbon: fidelity

- Upstream: [mark-x64/siri-ribbon-shader `src/ribbon.frag`, `src/renderer.js`, `src/App.jsx`](https://github.com/mark-x64/siri-ribbon-shader/tree/775a3c093a14d89880532733e9acc6782acad4aa) at `775a3c093a14d89880532733e9acc6782acad4aa` (MIT, copyright 2026 Mark By; S-274)
- Port: `ports/mark-x64-ribbon-shader/iridescent-ribbon`, exported to `content/components/mark-x64-ribbon-shader/iridescent-ribbon` (item `iridescent-ribbon`, primitive none, no icons)
- Renderer: Chromium (Playwright S-014) with SwiftShader software WebGL (`--use-angle=swiftshader --enable-unsafe-swiftshader`, S-283), device scale 1.
- Method: The upstream demo runs from its own Vite dev server (S-284) with `?time=<t>&solo=1`, which stops its clock at t. The port renders in a harness page at the same box width as the upstream canvas (1216 px at 1280 wide, 339 px at 375 wide) with `time={t}`. The canvas box is captured snapped to whole CSS pixels (the upstream canvas sits at a fractional offset) and diffed with pixelmatch (S-152, threshold 0.1; PNG S-153). Noise floor: the same frame from a second upstream page load.
- Target: at most 0.1% differing pixels, or within the measured noise floor where GPU output is not repeatable (owner brief, S-288).

## Result: pixels that differ

| Viewport | t = 0 s | t = 0.25 s | t = 0.5 s | t = 0.8 s | t = 1.27 s | t = 1.43 s |
| --- | --- | --- | --- | --- | --- | --- |
| 1280x800 (port) | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% |
| 1280x800 (noise floor) | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% |
| 375x812 (port) | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% |
| 375x812 (noise floor) | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% |

Worst port frame: 0.000%; worst noise floor: 0.000%.

Strips (t = 0, 0.25, 0.5, 0.8, 1.27, 1.43 s; 1280x800): [before.webp](before.webp) (upstream), [after.webp](after.webp) (port), [diff.webp](diff.webp) (pixelmatch; red marks a differing pixel).

The wave loop (`sequence="wave"`) sets the same shader's `uFull` to 0; below t = 1.07 s the full sequence has not started to dissolve (`dissolve = 0`, `fade = 1`), so the frames above cover it pixel for pixel.

## Deviations

Every change from upstream. The numbers above are measured on the shipped code, with these changes in place.

- Renamed from the upstream project and stripped of its branding; the upstream reference footage (third-party, excluded from its MIT license) is not used.
- Drawn through the shared `render-loop` helper (decision 0021): the pixel ratio stays capped at 2 as upstream, and drawing stops off screen and in hidden tabs; a fixed `time` or a paused ribbon draws only on change.
- Without WebGL 2, under reduced motion and before the first frame: a static SVG picture of the ribbon (the upstream page started paused under reduced motion instead).
- The stage background is `--iridescent-ribbon-background` (black in light and dark, as upstream). Decorative by default; `aria-label` makes it `role="img"`.

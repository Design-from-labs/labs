# lenticular: fidelity

- Upstream: [obta1ner/lenticular `index.html`](https://github.com/obta1ner/lenticular/blob/fe6e33bbc5850b3be7694d0a822a2ee451621e6e/index.html) at `fe6e33bbc5850b3be7694d0a822a2ee451621e6e` (MIT, copyright 2025 obtainer; S-273)
- Port: `ports/obta1ner-lenticular/lenticular`, exported to `content/components/obta1ner-lenticular/lenticular` (item `lenticular`, primitive none, no icons)
- Renderer: Chromium (Playwright S-014) with SwiftShader software WebGL (`--use-angle=swiftshader --enable-unsafe-swiftshader`, S-283), device scale 1.
- Method: The upstream page is served as a static file with its three `images/*.png` replaced by our own three frames (sun, moon, star, 480x640: the upstream photographs are not redistributed here, so both sides get the same original inputs). Its menu is hidden with its own HIDE MENU button. The port renders the same three PNGs in a harness page with the upstream page's body styles (black, the stage centered). The pointer moves to the same x on both pages (0, 20, 40, 60, 80 and 99.9% of the window width, the upstream input), and the whole viewport is diffed with pixelmatch (S-152, threshold 0.1). Noise floor: a second upstream load.
- Target: at most 0.1% differing pixels, or within the measured noise floor where GPU output is not repeatable (owner brief, S-288).

## Result: pixels that differ

| Viewport | x = 0% | x = 20.0% | x = 40.0% | x = 60.0% | x = 80.0% | x = 99.9% |
| --- | --- | --- | --- | --- | --- | --- |
| 1280x800 (port) | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% |
| 1280x800 (noise floor) | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% |
| 375x812 (port) | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% |
| 375x812 (noise floor) | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% |

Worst port frame: 0.000%; worst noise floor: 0.000%.

Strips (pointer at 0, 20, 40, 60, 80, 99.9% of the width; 1280x800): [before.webp](before.webp) (upstream), [after.webp](after.webp) (port), [diff.webp](diff.webp) (pixelmatch; red marks a differing pixel).

## Deviations

Every change from upstream. The numbers above are measured on the shipped code, with these changes in place.

- The page chrome (upload, settings and about panels) is left out; the dials are props (`gridWidth`, `rowHeight`, `rowOffset`, `speed`, `maxAngle`).
- Keyboard and screen readers: a `role="slider"` with `aria-valuetext` ("View 2 of 3"); arrow keys step one view, Home and End jump to the ends (APG slider, S-290).
- `track="element"` follows the pointer over the picture only; `progress` makes it controlled. On iPhone a "Tilt to play" button asks for motion permission (S-289), replacing the full-screen ENTER overlay.
- Reduced motion: no pointer or tilt tracking; keys still work. The barrier redraws through the `render-loop` helper on demand, so nothing is drawn off screen. The grid color is `--lenticular-grid` (black).

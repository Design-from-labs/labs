# globe: fidelity

- Upstream: [shuding/cobe `src/index.js`](https://github.com/shuding/cobe/blob/7e94076fa8c38707f4c9cd114ff4f7c5c880971e/src/index.js) at `7e94076fa8c38707f4c9cd114ff4f7c5c880971e` (MIT, copyright 2021 Shu Ding; S-342), and its documented usage: the code example on the COBE site (`website/app/page.tsx`, `codeExample`) and the README quick start.
- Port: `ports/shuding-cobe/globe`, exported to `content/components/shuding-cobe/globe` (item `globe`, primitive none, no icons). A React wrapper over npm `cobe` 2.0.1, which draws the globe; Motion (S-104) drives drag and keys.
- Renderer: Chromium 156 (Playwright S-014) with SwiftShader software WebGL (`--use-angle=swiftshader --enable-unsafe-swiftshader`, S-283), reporting `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (LLVM 10.0.0)), SwiftShader driver)`, device scale 1 (and 2 where marked).
- Method: upstream is `cobe` built from the pinned commit with its own build script (`scripts/build.js`), run as a plain HTML page with the code example's options: theta 0.2, diffuse 1.2, mapSamples 16000, mapBrightness 6, base and glow white, marker (0.2, 0.4, 1), the two markers and the arc, arc color (0.3, 0.5, 1), arcWidth 0.5, arcHeight 0.3. Sizing follows the site's own components (`width` = the CSS size, `devicePixelRatio` = the screen's), because the example's literal `width: 600 * 2` with `devicePixelRatio: 2` makes cobe 2.x allocate a 2400 px buffer (cobe 2 multiplies by the ratio itself). The port renders `<Globe phi={...} speed={0} markers arcs />` with its shipped tokens (`--globe-*` from `component.json`) in a box of the same size: 600x600 at 1280x800, 375x375 at 375x812, both at the page origin. Phi is fixed per frame (0, 1, 2.5, 4) instead of the example's `phi += 0.005` loop; each page is captured once the land texture has loaded and drawn (upstream: a load listener; port: `data-status="ready"` and the fallback at opacity 0). `preserveDrawingBuffer` is false, so the box is captured by a page screenshot snapped to whole pixels (P-058) after the last draw. Dark: `dark: 1` with the site's dark playground preset (base 0.3 gray, marker (1, 0.5, 1), glow 0.1 gray) and arc (1, 0.5, 1) as in the README quick start, on black; the port gets the same values from its dark tokens. Noise floor: a second upstream load of every frame. Diff: pixelmatch (S-152), threshold 0.1.
- Target: at most 0.1% differing pixels, or within the noise floor (owner brief, S-157, S-344).

## Result: pixels that differ

| Theme, viewport | phi 0 | phi 1 | phi 2.5 | phi 4 |
| --- | --- | --- | --- | --- |
| light, 1280x800 (port) | 0.000% | 0.000% | 0.000% | 0.000% |
| light, 1280x800 (noise floor) | 0.000% | 0.000% | 0.000% | 0.000% |
| light, 375x812 (port) | 0.000% | 0.000% | 0.000% | 0.000% |
| light, 375x812 (noise floor) | 0.000% | 0.000% | 0.000% | 0.000% |
| dark, 1280x800 (port) | 0.000% | 0.000% | 0.000% | 0.000% |
| dark, 1280x800 (noise floor) | 0.000% | 0.000% | 0.000% | 0.000% |
| dark, 375x812 (port) | 0.000% | 0.000% | 0.000% | 0.000% |
| dark, 375x812 (noise floor) | 0.000% | 0.000% | 0.000% | 0.000% |
| light, 1280x800 at device scale 2 (port) | 0.000% | | 0.000% | |
| light, 1280x800 at device scale 2 (noise floor) | 0.000% | | 0.000% | |

Worst port frame: 0.000%; worst noise floor: 0.000% (the frames differ between phis by 2.5% and between themes by 95%, so the captures are not trivially equal).

Strips (phi 0, 1, 2.5, 4; 1280x800): [before.webp](before.webp) (upstream), [after.webp](after.webp) (port), [diff.webp](diff.webp) (pixelmatch; red marks a differing pixel), and the dark theme in [before-dark.webp](before-dark.webp), [after-dark.webp](after-dark.webp), [diff-dark.webp](diff-dark.webp).

## npm 2.0.1 against the pinned source

The port depends on npm `cobe` 2.0.1 (published from `4fc247f`, before the pinned commit). Built from the pinned source, the shaders and the land texture are byte-identical to the 2.0.1 bundle; three behaviors differ, and the wrapper restores the pinned behavior for each:

| Behavior | 2.0.1 | Pinned `7e94076` | Port |
| --- | --- | --- | --- |
| Anchor `<style>` (`--cobe-visible-*`) | rewritten on every `update`, which restyles the page each frame | written only when its text changes | wraps that element's `textContent` setter to skip equal writes (measured: 0 writes in 30 rotating frames) |
| Land texture loaded | no redraw | `update({})` redraws | listens for the texture image's load and redraws; the fallback stays up until then |
| `destroy()` | keeps the texture and the image's `onload` | deletes the texture and clears `onload` (#125) | clears `onload` and deletes the texture itself |

## Deviations

Every change from upstream. The numbers above are measured on the shipped code, with these changes in place.

- A React component instead of the imperative `createGlobe` call: the loop is the `render-loop` helper (decision 0021), which creates the WebGL 2 context with cobe's exact attributes (`alpha`, `antialias`, no depth or stencil, no preserved buffer; P-059) before `createGlobe` takes it. Without WebGL 2 the loop reports `unsupported` and the static picture shows (cobe alone would fall back to WebGL 1).
- Sizing: `width` and `height` are the canvas's CSS size and `devicePixelRatio` the loop's ratio, capped at 2 (cobe multiplies them itself). cobe fixes its ratio at creation, so a new ratio recreates the globe. Drawing pauses off screen and in hidden tabs; a lost WebGL context is restored.
- DOM: cobe wraps the canvas in a `<div>` (with its anchor elements) and adds a `<style>` to `<head>`. The canvas sits in its own layer so the wrapper never sits among React's children; on unmount, a StrictMode re-run, a context restore or a new pixel ratio the wrapper is removed and the canvas put back, and cobe's vertex attributes are disabled so the next globe on the same context starts clean. After a context loss cobe's objects are gone, so only its DOM is removed.
- To capture the texture image, `window.Image` is replaced by a subclass for the duration of the synchronous `createGlobe` call only.
- Motion: auto-rotation is `speed` radians per second (default 0.3, the example's 0.005 per frame at 60 Hz), so it no longer depends on the frame rate; 0.8 times as fast under the pointer (as the site's hero), paused while dragging, while focused and inside `[data-loop-paused]`. Drag uses upstream's ratio (1/300 radian per pixel) through a Motion spring, with inertia after release, and the tilt is bounded to 0.4 either way with a rubber band and a spring back (the site's limits). Arrow keys turn 15 degrees and tilt 0.1; Home returns to the start.
- Colors: from `--globe-base`, `--globe-marker`, `--globe-glow`, `--globe-arc` and `--globe-dark`, read from the computed style and converted to cobe's 0 to 1 RGB (`color(srgb ...)`, `rgb()` and hex at full precision; other colors through a 2D canvas at 8 bits). Light defaults are the code example; dark values are the site's dark preset. `options` overrides them.
- Static picture (server render, wall tile, no WebGL 2, reduced motion, before the land loads): an inline SVG sphere with an even dot lattice (no land map), the glow, and the markers and arcs at their starting positions, in the same tokens.
- Accessibility: `label` gives `role="img"` and a name; unlabelled, the globe is decorative and out of the tab order. Interactive and labelled, it is focusable with a ring. On touch screens vertical swipes scroll the page (`touch-action: pan-y`).


## Assets

The land map is not in this repository: `cobe` embeds it as a small bitmap
(its README credits "World map blank without borders" on Wikimedia Commons,
by Crates, CC BY-SA 4.0 or GFDL). The port neither copies nor modifies it;
it is credited as S-346 in the item's credits and docs because every
rendered globe shows it.

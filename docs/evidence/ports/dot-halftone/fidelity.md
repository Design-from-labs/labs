# dot-halftone: fidelity

- Upstream: [haaarshsingh/halftone-dots `src/DotHalftone.tsx`](https://github.com/haaarshsingh/halftone-dots/blob/21ddfbdae84cf632dcb9cf617668c83a6f89723b/src/DotHalftone.tsx) at `21ddfbdae84cf632dcb9cf617668c83a6f89723b` (MIT, copyright 2026 Harsh Singh; S-340)
- Port: `ports/haaarshsingh-halftone-dots/dot-halftone`, exported to `content/components/haaarshsingh-halftone-dots/dot-halftone` (item `dot-halftone`, primitive none, no icons)
- Renderer: Chromium (Playwright S-014) launched with `--use-angle=swiftshader --enable-unsafe-swiftshader --disable-gpu-rasterization` (software 2D canvas), device scale 1, so the supersampled backing store is 1.5x on both sides.
- Inputs: the upstream demo's four sample PNGs have no license of their own and are not used. Four original drawings (a rocket, a city, a rack of servers, a robot; 600x600 SVG on white) replace them on both sides: in the scratch copy of the upstream demo the four `public/samples/*.png` paths in `src/App.tsx` point to the SVG files (the only change to upstream), and the port's harness loads the same files. The shipped demo uses the same drawings as inline SVG data URLs.
- Determinism: `Math.random` (one jitter pair per dot) is replaced before any script runs by the same seeded generator on both sides, and both apps run in React StrictMode; the number of calls matched on every run (for example 38,358 at 1280x800). Each sample is delayed 150 ms by the test's network route on both sides, so it always arrives after the component's first ResizeObserver callback: upstream re-samples the current image as a still in that callback, and a cached image can load before it (a race upstream has as well; the port keeps the same mechanism, see Deviations). For the same reason the walk never returns to an already loaded sample.
- Frames: the settled still of each sample (rocket, then city, servers and robot); the morph keyframes of each switch (rocket to city, city to servers, servers to robot) at 32, 96, 160, 240, 320, 400, 496 and 608 ms after it starts, on Playwright's fake clock (paused, then advanced with `runFor`; `performance.now` and `requestAnimationFrame` are both fake, so start time and frame times are identical on both sides); the settled stills again under `prefers-reduced-motion: reduce`.
- Two measurements:
  - **(a) Canvas pixels**: upstream's own demo, run as is with its own Vite dev server, read with `toDataURL` (the canvas keeps its pixels between frames), against the port rendered in a harness page with the same stage (`width: min(420px, 80vw); aspect-ratio: 1`, the demo's `App.css`).
  - **(b) The full stage**: upstream's component file rendered verbatim with Tailwind loaded (what its corner-cluster classes require, see below) against the port, in the same harness page; the screenshot is the stage box plus 40 px on every side (the dotted backdrop's reach), on the demo's `#f6f6f6` page.
  - Noise floor: a second upstream load. pixelmatch (S-152), threshold 0.1.
- Target: at most 0.1% differing pixels per matched frame (owner brief, S-157).

## Result: pixels that differ

Each cell is the worst frame of its group; every frame in every group measured 0.000% unless stated.

| Viewport | Measurement | Settled stills (4) | Morph keyframes (24) | Reduced motion stills (4) | Noise floor |
| --- | --- | --- | --- | --- | --- |
| 1280x800 | (a) canvas | 0.000% | 0.000% | 0.000% | 0.000% |
| 375x812 | (a) canvas | 0.000% | 0.000% | 0.000% | 0.000% |
| 1280x800 | (b) full stage | 0.000% | 0.000% | 0.000% | 0.000% |
| 375x812 | (b) full stage | 0.000% | 0.000% | 0.000% | 0.000% |

Worst port frame: 0.000%; worst noise floor: 0.000% (64 matched frames per measurement: 32 per viewport).

Strips (1280x800, full stage: the rocket settled, the rocket-to-city morph at 96, 240 and 400 ms, then city, servers and robot settled): [before.webp](before.webp) (upstream's component), [after.webp](after.webp) (port), [diff.webp](diff.webp) (pixelmatch; red marks a differing pixel).

### Upstream demo: the corner clusters without Tailwind

`CornerDots` positions its four clusters with Tailwind classes (`absolute`, `pointer-events-none`, `z-10`), but the upstream demo app does not load Tailwind. In upstream's own demo the wrapper is therefore a static block and the four clusters stack vertically in normal flow at the top center of the picture (measured: a 420x72 static box at the stage's top). The canvas is unaffected, which is why (a) compares canvas pixels against the demo as is, and (b) compares the whole stage against upstream's component file in a page where its classes work. The port renders the clusters at the four corners, as the component's code intends.

## Deviations

Every change from upstream. The numbers above are measured on the shipped code, with these changes in place.

- **Drawn through `render-loop`** (decision 0021) with a 2D context, `continuous: false` (one frame for a still, frame after frame only while a morph runs, by `invalidate()` from inside `render`) and `respectReducedMotion: false`, so reduced motion keeps upstream's own static branch (the real dots, drawn at once) instead of a placeholder. The morph clock is `performance.now()` read in the frame, as upstream's frame timestamp; drawing stops off screen and in hidden tabs (a morph that ends off screen shows its last frame when it comes back).
- **Sizing**: the loop's `resize` hook re-samples and repaints at once, as upstream's ResizeObserver did (no blank frame while resizing). The supersample is `min(3, ratio * 1.5)` with the loop's capped ratio (`clampDpr`); it equals upstream's for every device ratio of 1 or more (at 2 and above both give 3). Below 1 (a zoomed-out page) the loop's ratio is 1, so the store is 1.5x where upstream's would be smaller.
- **Upstream behavior kept on purpose**: each new `src` (or `gradient`) re-samples the current image as a still at the next frame (upstream's fresh ResizeObserver per effect run; the port uses a one-shot ResizeObserver in its effect, then the loop's for later resizes). So a switch during a morph snaps to the settled picture first, and the outgoing image is re-sampled with the incoming `gradient` (switching from the rocket to the city drops the rocket's pink-to-violet recolor while it implodes). At mount a cached image can load before that first callback, in which case the still replaces the explode-in, as in upstream.
- **Static fallback** (decision 0021): before the first frame, in the server render and on the wall tile, and without a 2D canvas: the image itself through a CSS dot screen (a 5 px radial-gradient mask), recolored with the gradient when one is set, multiplied onto the page so white drops out, plus the dotted backdrop and the corner clusters. It fades out (300 ms) once the dots are drawn. A `fallback` prop replaces it. If the image fails to load, `data-status` is `unsupported`.
- **Tokens**: the cluster color defaults to `var(--dot-halftone-accent, #5b21ff)` (upstream's `accent` default; the prop still overrides it) and the backdrop dots to `var(--dot-halftone-grid, rgba(20, 16, 40, 0.18))`; the registry item carries both, with a lighter backdrop for dark themes. Light values equal upstream's.
- **Corner clusters**: the four cluster elements are rendered from a list, with the same positions and rotations; the SVG is `display: block` and its circles take their fill from CSS (so the accent can be a CSS variable). With Tailwind's preflight, as in (b), this is pixel-identical; without a preflight upstream's inline SVG would sit on a text baseline. They keep physical corners in right-to-left pages, like the picture they frame.
- **Root**: `data-slot`, `data-status`, `aria-hidden` unless `alt` is given (then `role="img"` with that name), and default classes `relative aspect-square w-full` (upstream has no size of its own; a `className` or `style` size wins). Upstream's `position: relative` inline style is the `relative` class.
- **Types and lint only**: `parseInt` is `Number.parseInt`, `gradient` is `readonly [string, string]`, Biome formatting.

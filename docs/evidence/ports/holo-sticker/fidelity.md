# holo-sticker: fidelity

- Upstream: [jal-co/holosticker `src/lib/three-renderer.ts`](https://github.com/jal-co/holosticker/blob/34688eb3fd2986c6721ff270a00ca9267f8a195c/src/lib/three-renderer.ts) at `34688eb3fd2986c6721ff270a00ca9267f8a195c` (MIT, copyright 2026 Justin Levine; S-271), three.js 0.185.1 (S-275)
- Port: `ports/jal-co-holosticker/holo-sticker`, exported to `content/components/jal-co-holosticker/holo-sticker` (item `holo-sticker`, primitive none, no icons)
- Renderer: Chromium (Playwright S-014) with SwiftShader software WebGL (`--use-angle=swiftshader --enable-unsafe-swiftshader`, S-283), device scale 1.
- Method: The upstream studio runs from its own Vite dev server with its default dials; our original artwork (`sticker.svg`, a smiling star) is uploaded through its file input. The port renders the same SVG (by URL, through the same 1536 px rasterization) in a harness box of the upstream canvas's size (960x744 at 1280 wide, 375x366 at 375 wide). Both canvases keep their drawing buffer, so the frames are read with `toDataURL` (alpha included). Frames: never hovered (no tilt), then the pointer at three points of the canvas; the tilt eases toward the pointer by 9% a frame, so each frame is taken once three consecutive reads are identical. Noise floor: a second upstream load.
- Target: at most 0.1% differing pixels, or within the measured noise floor where GPU output is not repeatable (owner brief, S-288).

## Result: pixels that differ

| Viewport | no tilt | pointer at (0.2, 0.25) | pointer at (0.8, 0.3) | pointer at (0.5, 0.85) |
| --- | --- | --- | --- | --- |
| 1280x800 (port) | 0.000% | 0.000% | 0.000% | 0.000% |
| 1280x800 (noise floor) | 0.000% | 0.000% | 0.000% | 0.000% |
| 375x812 (port) | 0.000% | 0.000% | 0.000% | 0.000% |
| 375x812 (noise floor) | 0.000% | 0.000% | 0.000% | 0.000% |

Worst port frame: 0.000%; worst noise floor: 0.000%.

Strips (no tilt, then the pointer at (0.2, 0.25), (0.8, 0.3), (0.5, 0.85) of the canvas; 1280x800; transparent canvas on white): [before.webp](before.webp) (upstream), [after.webp](after.webp) (port), [diff.webp](diff.webp) (pixelmatch; red marks a differing pixel).

## Deviations

Every change from upstream. The numbers above are measured on the shipped code, with these changes in place.

- The renderer is extracted from the studio (no GIF, video or GLB export, as upstream's own component export does); the studio's shadcn `components/ui` controls are not copied: the component itself needs none, and an app's controls install with the shadcn CLI.
- Drawn through the `render-loop` helper: the renderer takes the helper's WebGL 2 context (created with the attributes three.js requests), the pixel ratio stays capped at 2, and drawing stops off screen and in hidden tabs; WebGL context loss is restored. A `dispose()` frees textures, materials and the renderer on unmount.
- Without WebGL 2, under reduced motion and before the first frame: the artwork with a CSS die-cut edge and foil sheen. `alt` makes it `role="img"`; otherwise decorative.
- `tilt` fixes the pose for stills; `interactive={false}` stops pointer tilt.

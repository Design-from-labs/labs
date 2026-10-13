# holo-foil: fidelity

- Upstream: [dmitrykurash/holocloth `src/holoMaterial.ts`, `src/scene.ts`, `src/textures.ts`](https://github.com/dmitrykurash/holocloth/tree/a6078ba698a53cbf18be870cea555c1971f84103/src) at `a6078ba698a53cbf18be870cea555c1971f84103` (MIT, copyright 2026 Dmitry Kurash; S-272), three.js 0.185.1 (S-275)
- Port: `ports/dmitrykurash-holocloth/holo-foil`, exported to `content/components/dmitrykurash-holocloth/holo-foil` (item `holo-foil`, primitive none, no icons)
- Renderer: Chromium (Playwright S-014) with SwiftShader software WebGL (`--use-angle=swiftshader --enable-unsafe-swiftshader`, S-283), device scale 1.
- Method: The upstream tool runs from its own Vite dev server with its startup dials (the Holo preset). After its loader, the harness stops its animation loop and, through the app instance the dev build exposes, gives it the same inputs as the port: our procedural scratch bump map (the upstream photo is not redistributed) and either a transparent 2:3 print (the bare sheet, upstream's shape) or our own poster. The cloth is reset to its captured pose, normals and cavity occlusion are computed as its tick does, the film grain time is set to 0, and one frame is rendered. The port renders the same pose, bump and print with `time={0}` at the same full-viewport size. Whole viewports are diffed with pixelmatch (S-152, threshold 0.1). Noise floor: a second upstream load.
- Target: at most 0.1% differing pixels, or within the measured noise floor where GPU output is not repeatable (owner brief, S-288).

## Result: pixels that differ

| Viewport | bare sheet | with a poster |
| --- | --- | --- |
| 1280x800 (port) | 0.000% | 0.000% |
| 1280x800 (noise floor) | 0.000% | 0.000% |
| 375x812 (port) | 0.000% | 0.000% |
| 375x812 (noise floor) | 0.000% | 0.000% |

Worst port frame: 0.000%; worst noise floor: 0.000%.

Strips (bare sheet, with a poster; 1280x800): [before.webp](before.webp) (upstream), [after.webp](after.webp) (port), [diff.webp](diff.webp) (pixelmatch; red marks a differing pixel).

## Deviations

Every change from upstream. The numbers above are measured on the shipped code, with these changes in place.

- The material only: no Verlet cloth, grab, poke, decal editing, depth of field pass (off by default upstream) or control panel. The sheet keeps upstream's captured drape (its baked pose and cavity occlusion are ported as static geometry).
- The captured pose's 4,851 numbers are one string literal parsed into the same Float32Array (checked equal), so the page's source view stays light (docs/pitfalls.md, P-064).
- The upstream photographic bump map is replaced by a seeded procedural scratch texture drawn in code; the upstream poster is not shipped (`image` prints your own).
- Interaction: the sheet leans toward the pointer (the orbit and grab tools capture the pointer, which a component in a scrolling page must not); at rest the view is upstream's.
- Drawn through the `render-loop` helper (pixel ratio capped at 2, paused off screen and in hidden tabs, context loss restored); `time` freezes the grain for stills. Without WebGL 2 or under reduced motion: a CSS foil sheet. Decorative by default; `aria-label` makes it `role="img"`.

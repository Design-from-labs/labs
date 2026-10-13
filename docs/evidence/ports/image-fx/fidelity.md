# image-fx: fidelity

- Upstream: [Jakubantalik/Libraries.dev `packages/img-fx/src`](https://github.com/Jakubantalik/Libraries.dev/tree/bcaf88f8a16a75fd95bf21e0747193ee3380a927/packages/img-fx/src) (img-fx 0.5.1) at `bcaf88f8a16a75fd95bf21e0747193ee3380a927` (MIT, copyright 2026 Jakub Antalik; S-386, S-230), three.js 0.185.1 (S-275)
- Port: `ports/libraries-dev/image-fx`, exported to `content/components/libraries-dev/image-fx` (item `image-fx`, primitive none, no icons). Upstream modules are merged into three files that keep their lines, each section starting with a `// ---- upstream: <path> ----` marker: `image-fx-engine.ts` (renderer, reveal, cycle, palette, tween), `image-fx-presets.ts` (the three presets and their index) and `image-fx-shaders.ts`; the Labs-written `image-fx.tsx` is `ImageGeneration.tsx` with `types.ts`, `styles.ts` and `index.ts`.
- Renderer: Chromium (Playwright S-014) with SwiftShader software WebGL (`--use-angle=swiftshader --enable-unsafe-swiftshader --disable-gpu-rasterization`, S-283), device scale 1.
- Method: one harness page renders upstream's `ImageGeneration` (its `src/index.ts`, imported as source) or the port's `ImageFx` with identical props: the preset and theme under test, `images` set to one original picture (an inline SVG of dusk over layered hills, the demo's first image; no upstream picture is used), a 320x280 card at 1280x800 and 280x220 at 375x812 (the sizes of upstream's demo cards), corner radius 16. `Math.random` is seeded (the effect's start time is `Math.random() * 1000` s) and Playwright's fake clock drives `Date`, `performance.now`, timers and `requestAnimationFrame`, paused before navigation; each frame is a box screenshot after advancing the clock to a fixed time. Sequence: idle at 1.5 s and 3.0 s, `triggerReveal({ hold: "manual" })` then frames 0.6 s, 1.8 s and 3.5 s later, then `triggerRegenerate({ durationMs: 3000 })` and frames 1.2 s and 3.8 s later (the churn, then the next image dissolving in). Noise floor: a second upstream load with the same seed.
- Upstream's own demo (`vite --config vite.config.demo.ts`, its three.js 0.149.0) was run with every `demo/public` picture swapped for the same original image by request interception: [reference.webp](reference.webp) (its three hero cards, shader phase).
- Target: at most 0.1% differing pixels, or within the measured noise floor where the output is not repeatable (decision 0021).

## Result: pixels that differ

| Scene | Viewport | idle 1.5 s | idle 3.0 s | reveal +0.6 s | reveal +1.8 s | visible +3.5 s | regenerate +1.2 s | regenerate +3.8 s |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| pixels-organic, dark (port) | 1280x800 | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% |
| pixels-organic, dark (noise floor) | 1280x800 | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% |
| pixels-organic, dark (port) | 375x812 | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% |
| pixels-organic, dark (noise floor) | 375x812 | 0.000% | 0.000% | 7.635% | 0.000% | 0.000% | 0.000% | 0.000% |
| pixels-mechanic, dark (port) | 1280x800 | 0.000% | 0.000% | 2.669% | 0.000% | 0.000% | 0.000% | 0.000% |
| pixels-mechanic, dark (noise floor) | 1280x800 | 0.000% | 0.000% | 2.669% | 0.000% | 0.000% | 0.000% | 0.000% |
| pixels-mechanic, dark (port) | 375x812 | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% |
| pixels-mechanic, dark (noise floor) | 375x812 | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% |
| sweep-gradient, dark (port) | 1280x800 | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% |
| sweep-gradient, dark (noise floor) | 1280x800 | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% |
| sweep-gradient, dark (port) | 375x812 | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% |
| sweep-gradient, dark (noise floor) | 375x812 | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% |
| pixels-organic, light (port) | 1280x800 | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% |
| pixels-organic, light (noise floor) | 1280x800 | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% |
| pixels-organic, light (port) | 375x812 | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% |
| pixels-organic, light (noise floor) | 375x812 | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% |

56 port frames: 55 at 0.000%; the worst, 2.669%, equals that frame's noise floor: the first upstream load differs from the port and from the second upstream load by the same pixel count. Worst noise floor: 7.635%. Only the first reveal frame (0.6 s in, during the shader-sampled mask and pixel dissolve) varies between runs; every other frame is byte-identical. Rechecks on the final code: pixels-mechanic, dark, 1280x800 gave 0.000% on all seven frames, noise floor included; sweep-gradient, dark, 375x812 gave 0.000% except reveal +0.6 s at 8.500%, equal to its noise floor of 8.500% (the same pattern), so the worst noise floor measured is 8.500%. In the matrix every differing frame is the first reveal frame, and in each case the port matches one of the two upstream loads (0.000% to it, or the same count as the noise floor); it is run-to-run variation at the start of a reveal, not a port difference.

three.js 0.149.0 (upstream's lockfile) against 0.185.1 (the site's pin), upstream source on both, `Math.random` fixed at 0.5 so the different number of three.js UUID draws cannot move the effect's clock: 0.000% on every frame except the same two run-to-run frames (reveal +0.6 s: 6.546% for pixels-organic, 4.635% for sweep-gradient; regenerate +1.2 s: 0.232%), where the 0.185.1 port against 0.185.1 upstream differs by about as much (sweep-gradient 4.511% and 0.232%). The upgrade does not change the picture.

Strips (1280x800): pixels-organic dark at idle 1.5 s, reveal +0.6 s and regenerate +1.2 s, pixels-mechanic dark reveal +0.6 s, sweep-gradient dark reveal +0.6 s, pixels-organic light idle 3.0 s: [before.webp](before.webp) (upstream), [after.webp](after.webp) (port), [diff.webp](diff.webp) (pixelmatch; red marks a differing pixel). [fallback.webp](fallback.webp): the static mosaic under reduced motion for the three presets, dark then light, and the image shown statically by `triggerReveal()`.

## three.js 0.149 to 0.185

Upstream declares `three >=0.149.0` and develops on 0.149.0; the item installs `three@^0.185.1`. Checked against both builds:

- `WebGLRenderer` needs WebGL 2 since r163 (S-398); upstream's "WebGL 1 otherwise" path is gone, so without WebGL 2 the constructor throws, the render loop reports `unsupported` and the static mosaic stays.
- Color management is on by default since r152 (S-397), but `Color.setRGB(r, g, b)` defaults to the working color space (no conversion) and the `ShaderMaterial` has no color-space chunk, so the uploaded uniforms and the output are the same; only the placeholder `new THREE.Color(0x1a1a1a)` initial values convert, and every one is overwritten before the first draw.
- `ShaderMaterial` still maps `gl_FragColor` on WebGL 2; `IUniform`, `setScissor`, `setViewport`, `setSize(w, h, false)` and `getPixelRatio` are unchanged. `@types/three` 0.185.3 typechecks the merged files without edits.

## Deviations

Every change from upstream. The numbers above are measured on the shipped code, with these changes in place.

- Drawn through the `render-loop` helper (decision 0021), adapted to upstream's architecture: one offscreen three.js renderer is still shared by every card (a single WebGL context), and each card's visible canvas is a 2D canvas the shared frame is copied into. So each card runs `useRenderLoop` with a `"2d"` context, and its `render` calls `tickInstance()`, which is upstream's shared `tick` for one instance (same 10 fps cap, clock, grow-only GL resize and paint); upstream's single requestAnimationFrame loop and its `wakeLoop` re-arming are replaced by the per-card loops (`wakeLoop` now asks each card's loop for a frame). Drawing therefore stops off screen and in hidden tabs through the helper, which replaces upstream's IntersectionObserver (64 px margin); the clock restarts after a pause as upstream's did. The helper's default resize is replaced by a no-op: upstream's measure sizes the instance and the paint sizes the canvas (assigning `canvas.width` would clear it). Pixel ratios stay upstream's: 1.25 for the GL render, at most 2 for the visible canvas.
- Fallback (0021): a static mosaic in the preset's palette and cell size, with the shader's edge fade (inline SVG, no image files), in its own layer above the canvases, shown under reduced motion, without WebGL 2, while the shared WebGL context is lost (upstream already restores it; components now subscribe to the loss), before the first frame and in the server render. A `fallback` prop replaces it; `onStatusChange` reports the loop status.
- Without the animated effect the ref handle still works: `triggerReveal`, `triggerHide`, `triggerRegenerate` and `isImageActive` show and hide the image statically and emit the same `onCycle` phases; `autoReveal` does not cycle images then.
- The injected `<style>` (`styles.ts`, which ran at module scope) is replaced by equivalent utility classes; `data-slot` attributes name the parts. The `ImageGeneration` module-scope `ensureStylesInjected()` call is gone (no document access at import).
- `theme="auto"` resolves after hydration (upstream read the document during the first render, which mismatches a server render); before that the fallback shows both palettes, switched by the `dark:` variant, and the engine starts with the dark mode block as upstream's server fallback did.
- Renamed: `ImageGeneration` to `ImageFx` (and `ImageGenerationProps`, `ImageGenerationHandle`, `ImageGenerationPreset`, `ImageGenerationTheme`, `ImageGenerationCycleEvent` to `ImageFx*`); upstream's names are exported as aliases. `forwardRef` became React 19's `ref` prop. `children` is optional (size the effect with `className` instead).
- The engine primitives upstream's `index.ts` exported are re-exported from `image-fx.tsx`, plus `tickInstance`; `setFrameRate` and `setMaxDpr` keep their page-wide meaning.
- `fragmentShader` is applied once the loop is ready (so reduced motion never creates a WebGL context for it).
- Merged-file edits: intra-package imports are commented out (`// Labs: merged into this file`), duplicated imports are dropped, and the presets' trailing re-export is commented out (each preset is already exported).
- Demo: three original inline-SVG pictures (dusk hills, a tide pool, paper shapes) replace upstream's screenshots and photos, which are not redistributed.
- Labs, added after the fidelity runs: on a software WebGL renderer (SwiftShader, llvmpipe and similar, read from `WEBGL_debug_renderer_info`) the loop reports `unsupported` and the static picture stays, unless `allowSoftwareRenderer` is set. Measured on the site's beta build in headless Chromium (SwiftShader): the first frame blocked the main thread for 24 s and each later frame was a long task, so the page could not be scrolled. GPU renderers are unaffected; re-running the harness above needs `allowSoftwareRenderer` on the port.

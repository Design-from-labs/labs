# surface-field: fidelity

- Upstream: [angelolibero/surface-field `src`](https://github.com/angelolibero/surface-field/tree/1674954a249b2e76aac1a83c8bfa1c3a4e5d543f/src) at `1674954a249b2e76aac1a83c8bfa1c3a4e5d543f` (MIT, copyright 2026 Angelo Libero; S-512). The repository's `LICENSE` was read at that commit and is MIT. Its hosted demo is S-513.
- Port: `ports/angelolibero-surface-field/surface-field`, exported to `content/components/angelolibero-surface-field/surface-field` (item `surface-field`, primitive none, no icons).
- Upstream side: the demo app of the pinned commit (`demo/`), run unmodified with its own Vite dev server (`npm ci --ignore-scripts` in the clone, the package built with its own `tsc` build). The picture measured is its `.canvas` element: the field, its three surfaces and the dots' clearing around them.
- Port side: the port's demo stage (`SurfaceFieldStage`, the same three surfaces and the four presets with upstream's values) in a harness page (Vite, React 19.3, Tailwind 4.3) whose `.canvas` wrapper is the whole viewport, as upstream's is (its 306 px sidebar floats over the canvas).
- Method: Chromium (Playwright S-014), device scale 1, light scheme, 1280x800 and 375x812. `tools/fidelity.mjs` with Playwright's fake clock (paused, then advanced with `runFor`: `performance.now`, timers and `requestAnimationFrame` are identical on both sides), `Math.random` replaced by the same seeded generator on both sides (and again after the configuration steps, so the wander draws match), then a hook (`hook.mjs`, not in the repository) that configures each side the way a visitor would, moves the mouse to fixed fractions of the canvas box and advances the clock by a fixed time. The surfaces themselves and upstream's floating chrome (sidebar, tabs, credit link, controls button) are hidden on both sides (`visibility: hidden`) so the diff is the field alone; the cards are Labs-styled in the port and upstream-styled in the demo, and are not part of the claim. Upstream's configuration goes through its own controls (keyboard on the preset select and the "Linked surfaces" switch, the controls sheet below 769 px), the port's through the harness at the same clock time, and both run the same 400 ms afterwards. The dot color and the page background are pinned to upstream's values on both sides (`oklch(0.22 0 0)` ink, `oklch(0.971 0 0)` paper, and the dark pair). Noise floor: upstream against a second load of itself, same states. pixelmatch (S-152) with threshold 0.1; images are written with pngjs (S-153) and sharp.
- Target: at most 0.1% differing pixels per matched frame (owner brief, S-157).

## Result: pixels that differ

| State (clock after the last input) | 1280x800 | 375x812 |
| --- | --- | --- |
| Rest: Workspace, no pointer (1.5 s) | 0.0000% | 0.0000% |
| Pointer settled at 30%, 30% (2.5 s) | 0.0000% | 0.0000% |
| Pointer mid-travel to 75%, 65% (64 ms and 208 ms after) | 0.0000% | 0.0000% |
| Press held at 50%, 88% (300 ms) | 0.0000% | 0.0000% |
| Press released, wave in flight (240 ms) | 0.0002% | 0.0000% |
| Ambient preset: wander, breath and tint (2.6 s) | 0.0076% | 0.0184% |
| Mesh preset: cursor distortion and breath (0.9 s) | 0.0080% | 0.0194% |
| Still preset (0.3 s) | 0.0000% | 0.0000% |
| Linked surfaces with the wave (0.7 s) | 0.0000% | 0.0174% |
| Dark theme, pointer settled (2 s) | 0.0000% | 0.0000% |
| Reduced motion, pointer moved | 0.0000% | 0.0000% |
| Noise floor: rest, and pointer mid-travel | 0.0000% | 0.0000% |

Worst port frame: 0.0194% (59 pixels of 304,500). Worst noise floor: 0.0000%. The few differing pixels are all in states with a time-driven breath, wander or wave (Ambient, Mesh, Linked surfaces at 375). Not isolated further; the likely cause is that the port's frame callback runs inside the loop's frame and reads `performance.now()` there instead of using the frame's own timestamp, so a breath or wave can sit a fraction of a frame apart at a fixed clock time. Every state without those is identical to the byte at both sizes.

After the last change to the demo (card sizes on short stages, scale-aware geometry; the field code did not change) rest, mid-travel, the wave, Ambient, Linked surfaces and dark were measured again with the numbers above; the other states are from the run before it.

Evidence images (cards hidden on both sides): `<state>-<viewport>-before.webp` (upstream), `-after.webp` (port), `-diff.webp` (pixelmatch; red marks a differing pixel) for the states listed in `fidelity.json`, which has the numbers of all of them. Only a representative set of images is kept.

## Behavior checks (Chrome, not part of the diff)

- Off screen the loop does not draw: 0 `requestAnimationFrame` calls in a second with the field scrolled out of view against 120 per second with it in view (Ambient, a 120 Hz display), and it resumes when scrolled back.
- Touch and pen: a synthetic `pen` move relocates the light, a `touch` press drops the held ring and releasing it sends the wave, and `pointercancel` ends a press, all through the engine's own handlers.
- Switching presets keeps the same dots canvas element while the line fabric canvas comes and goes, and the field draws after every switch.

## Deviations

Every change from upstream. The numbers above are measured on the shipped code, with these changes in place.

- **Frames run on `render-loop`** (decision 0033, extending 0021 and 0026): the engine's `env.frame` and `env.cancelFrame` queue the callback and call the loop's `invalidate()`; the loop (`context: "2d"`, `continuous: false`, `respectReducedMotion: false`) runs the queued callbacks with `performance.now()` from its own frame, so nothing draws off screen or in a hidden tab, and the engine's own sleep and doze are unchanged. The engine file itself is upstream's byte for byte except its two import paths, its marker line and one renamed type.
- **Size observation is the loop's**: its custom `resize` hook calls the engine's `resize`; the host-listener module no longer creates a `ResizeObserver`.
- **The `worker` prop is not ported** (and with it `field.worker.ts`, `worker-client.ts`, `worker-runtime.ts` and `worker.test.ts`): a worker entry has to be built by the host's bundler, which a registry item cannot ship, and a worker lane would draw on its own clock outside the render loop. The engine's environment object, which is what makes the worker possible, is untouched.
- **Merged layout** (decision 0016): `viewport.ts`, `controller.ts`, `engine.ts` and `dom.ts` become `surface-field-viewport.ts`, `-controller.ts`, `-engine.ts` and `-dom.ts` with relative imports renamed and a marker line each; `SurfaceField.tsx` and the entry's exports become `surface-field.tsx`. The engine's type `SurfaceFieldPoint` is `SurfaceFieldEnginePoint` here, because the viewport module exports a type of the same name and the library barrel re-exports every module.
- **dom module**: `mainThreadEnv` takes the frame clock as a parameter; the tint token is read from the field's own element (custom properties inherit, so a value on the root is still the one used, and a scoped theme now works); the theme observer also watches `data-theme` on the root and the system color scheme, so a site that switches themes that way repaints.
- **Component**: the dots' ink is `color: var(--surface-field-ink, inherit)` on the root (a host's own `color` in `style` still wins, as upstream's demo passes it); the dots canvas and the optional fabric canvas sit in one grid wrapper whether or not `connected` is on, so the canvas the loop observes is never replaced (P-189); the engine also restarts when the reduced-motion preference changes; a faint dot grid (replaceable with a new `fallback` prop) shows in the server render, before the first frame and without a 2D canvas, and fades out once the loop is drawing; the root carries `data-slot`, `data-status` and the canvases `data-slot`s. Props are otherwise upstream's, with their defaults.
- **Demo**: the playground's three surfaces (note, label, round), gestures (move, resize from corners and edges, turn, arrow keys) and four presets with upstream's code and values, a "Linked surfaces" toggle and a reset; not ported: the sidebar's other controls, the accent color picker, copy-config, the React Flow tab and the brand chrome. Cards use Labs tokens and Tailwind, not upstream's stylesheet; the stage's touch action is the page's (only the cards and handles stop it), and the cards are placed by percentages in the server render.
- **Tests and docs**: upstream's vitest suites (`controller`, `viewport`, `present`, `worker`) and its `docs/` are not copied; the item's markdown `docs` and `meta.json` carry the API text, and `scripts/webgl-items.test.mjs` and `e2e/webgl.spec.ts` cover the render-loop wiring, the fallback, reduced motion and hydration.

## Enhancements

- Reduced motion: the field is drawn once, with no light, drift, breathing or following (upstream's own branch), and it follows a change of the system setting while mounted.
- Decorative: `aria-hidden`, never focusable, never intercepts the pointer.
- Touch and pen: the light and the held ring follow any pointer type; `cursorPush` stays mouse-only; the field never captures a touch.
- Pause off screen and in a hidden tab, through the render loop.
- Right to left: the picture has no direction; the demo's scene coordinates are physical (they do not flip), its buttons use flex wrapping and no left or right utilities.
- Component-prefixed variables: `--surface-field-ink` and `--surface-field-tint` with light and dark values in the item (`#e67832` is upstream's own warm default for the tint).

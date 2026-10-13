# 0021: Run WebGL effects through one render-loop helper, with a static fallback and GPU fidelity measured against a noise floor

- Status: Accepted
- Date: 2026-10-12
- Deciders: Port pod W1 (glass-holo), under the owner's port brief
- Sources: S-288, S-157, S-275, S-276, S-285, S-286, S-287, S-283, S-014, S-152

## Context

The glass and holographic batch (S-288) ports four canvas effects: Holo
Sticker and Holo Foil (three.js, S-275), Iridescent Ribbon (raw WebGL 2) and
Lenticular (2D canvas). Each upstream owns its own loop: a bare
`requestAnimationFrame` that never stops, a hard-coded device pixel ratio
clamp, no off-screen pause, and context loss handled in one of the four. The
brief asks for one small internal `registry:lib` they all depend on, and a
WebGL standard:

- a static, styled picture without WebGL (or WebGL 2) and under reduced
  motion;
- no drawing off screen (IntersectionObserver, S-286) or in a hidden tab
  (Page Visibility, S-287); the pixel ratio capped at 2;
- fidelity captured deterministically (fixed time and seed, the loop paused at
  matched frames), on one machine with fixed GPU flags; where GPU output stays
  above 0.1% the measured noise floor (upstream diffed with itself across
  runs) is the bar.

## Decision

- **`render-loop`** (`examples/render-loop`, a Labs example of kind `lib`,
  beta): `useRenderLoop(canvasRef, { context, setup, render, resize?,
  dispose?, continuous?, maxDpr?, respectReducedMotion? })` returns `{ status,
  invalidate, handle }`.
  - It creates the one context (`webgl2`, `webgl` or `2d`); three.js items
    pass it to `new WebGLRenderer({ canvas, context })` with the attributes
    three would have requested itself (alpha true, depth true, stencil false,
    premultiplied alpha), so their output is unchanged.
  - Status `pending` (server and first client render), `ready`, `unsupported`
    (no context, or `setup` threw), `reduced-motion`, `lost`.
  - The pixel ratio is `min(devicePixelRatio, maxDpr)`, default 2; a
    ResizeObserver resizes the buffer (default: CSS size times that ratio,
    rounded as every upstream did).
  - Off screen or in a hidden tab the loop cancels its frame; paused time is
    not counted in `frame.time`, and a frame's delta is capped at 0.1 s.
  - `continuous: false` draws only after `invalidate()` and resizes (stills,
    input-driven pictures).
  - WebGL context loss: `preventDefault()` (asks for a restore), status
    `lost`; on restore it disposes the old state and runs `setup` again.
  - It depends on the existing `use-reduced-motion` hook item.
- **Fallback:** every WebGL component renders a static picture in its own
  layer (CSS or inline SVG, no image files) above the canvas, faded out once
  the loop reports `ready` and shown for every other status. It is also the
  server-rendered first paint and the gallery tile (tiles do not hydrate). A
  `fallback` prop replaces it. Lenticular, a 2D canvas, falls back to its
  first image and, under reduced motion, stops following the pointer and tilt
  while its arrow keys keep working.
- **Fidelity method:** Chromium with SwiftShader (`--use-angle=swiftshader
  --enable-unsafe-swiftshader`, S-283), device scale 1, 1280x800 and 375x812.
  The upstream demo runs from its own dev server (or file), the port in a
  harness page with the same box size and inputs; time, tilt and grain are
  fixed, then the canvas box is captured (snapped to whole pixels) or read
  with `toDataURL` when the upstream preserves its drawing buffer. Each frame
  is also captured from a second upstream load to give the noise floor.
  Assets whose license does not allow redistribution are replaced on both
  sides by the same procedural or original inputs.

- **Layout:** the five ports follow decision
  [0016](0016-ported-component-sources.md): sources in `ports/<source-id>/`,
  exported by `pnpm ports`. Files that keep upstream code (`glass*`,
  `holo-sticker-renderer.ts`, `holo-foil-scene.ts`, `holo-foil-pose.ts`) are
  excluded from Biome; the Labs-written wrappers and demos are linted.
  `export-ports.mjs` now also passes a port's `devDependencies` (the three.js
  items install `@types/three` for TypeScript users).
- **Library:** `three` joins `@designfrom/react`'s optional peers
  (`^0.185.1`), so a promoted three.js item never bundles it (decision 0016's
  rule); the site pins `three` 0.185.1 and `@types/three` 0.185.3 as
  devDependencies.

## Alternatives

| Option | Why not |
| --- | --- |
| A three.js-only helper (`createThreeRenderer`) | Iridescent Ribbon is raw WebGL 2 and Lenticular is 2D; a three helper would leave them on their own loops, which the brief rules out. The context-level helper serves all four and three.js takes the context. |
| `@react-three/fiber` | A renderer and reconciler dependency for two items whose upstream code is imperative three.js; porting them into a scene graph would rewrite them, against fidelity first. |
| Hardware GPU (`--use-angle=metal`) for fidelity | Measured equal within each run, but the bytes depend on the GPU and driver, so CI and other machines could never reproduce the numbers; SwiftShader is deterministic and gave a 0.000% noise floor. |
| Render one still frame under reduced motion instead of the fallback | Still costs a WebGL context and shader compile for a user who asked for less; the brief asks for the static picture. |
| Keep each upstream loop | Four copies of resize, visibility and context-loss code, three of them without off-screen pauses. |

## Evidence

- `docs/evidence/ports/<component>/fidelity.md` for `holo-sticker`,
  `holo-foil`, `lenticular`, `iridescent-ribbon` and `glass`: the port's
  differing pixels per matched frame next to the upstream noise floor.
- Headless Chromium on the reference Mac reports `ANGLE (Google, Vulkan 1.3.0
  (SwiftShader Device ...))` by default and `ANGLE Metal Renderer` with
  `--use-angle=metal`; the fidelity runs pin SwiftShader.

## Consequences

- Every WebGL item lists `render-loop` (and through it `use-reduced-motion`)
  in `registryDependencies`; the shadcn CLI installs them into `lib/` and
  `hooks/`.
- A component must render something meaningful for every status but
  `ready`; tiles show that picture.
- The three.js items carry `three@^0.185.1` (and `@types/three` as a dev
  dependency); the site pins `three` 0.185.1 for the demos (decision 0010).

## Re-test when

- An item needs WebGPU (the deferred optional glass tier): extend `context`
  with `webgpu` or give it its own helper.
- three.js stops accepting an external context, or changes the attributes it
  requests (diff a three.js item against its upstream again).
- A fidelity run on SwiftShader shows a noise floor above 0 for an item:
  record it in that item's fidelity.md and compare against it.

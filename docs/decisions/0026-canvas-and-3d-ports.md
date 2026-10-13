# 0026: Every canvas loop runs on render-loop, GSAP is rewritten with Motion, and library contexts come from the loop

- Status: Accepted
- Date: 2026-10-13
- Deciders: Port pod W2 (canvas-3d), under the owner's port brief
- Sources: S-344, S-157, S-340, S-341, S-342, S-343, S-345, S-104, S-275, S-283, S-346

## Context

The canvas and 3D batch (S-344) ports four upstreams of very different
shapes: a 2D canvas halftone with a morph (S-340), a dithering core whose
output is SVG (S-341), a WebGL globe published as an npm library that creates
its own context (S-342), and a 3,900-line single-shader three.js carousel
animated with GSAP (S-343). The brief also asks to move Lifeline's fireworks
overlay, which ran its own WebGL loop, onto the `render-loop` helper of
decision [0021](0021-webgl-render-loop.md) with unchanged fidelity. GSAP is
free to use but ships under a proprietary license (S-345), so it cannot be a
dependency of an MIT registry item.

## Decision

- **Every drawing loop goes through `useRenderLoop`**, 2D included (Dot
  Halftone), and so do transient overlays (Lifeline's fireworks). What
  differs is configured, not re-implemented:
  - `continuous: false` with `invalidate()` from inside `render` for
    pictures that move only for a while (the halftone morph);
  - `respectReducedMotion: false` where upstream already draws a still under
    reduced motion (the halftone draws its dots at once, as Lenticular does);
  - a custom `resize` where upstream sizes its buffer differently (the
    halftone's 1.5x supersample of the capped ratio; the fireworks' window
    size and 1.5 ratio cap; cobe's own sizing);
  - an overlay with no picture of its own ends itself on `unsupported` or
    `reduced-motion` (the fireworks provider restores the theme).
- **No loop, no helper.** An item that computes its picture once (Vector
  Dither's SVG) does not use `render-loop`; a gradient source renders on the
  server, so its wall tile shows the real result.
- **A library that creates its own context gets the loop's.** The loop
  creates the context with exactly the attributes the library requests
  (P-059), then the library's `getContext` call returns that same context
  (cobe; three.js takes it as `context`). Wrapper-owned DOM a library inserts
  around the canvas is removed and the canvas put back in `dispose`, so
  React's tree stays consistent through StrictMode and context restores.
- **GSAP code is never ported or depended on.** Tweens and timelines are
  rebuilt with Motion (`animateValue` with a driver on the component's own
  frame clock), with GSAP's eases written out as functions, its timeline
  offsets, `delayedCall`, `killTweensOf`, rounding and lag smoothing
  reproduced, and verified by recording the animated state every frame on
  both sides before comparing pixels (P-104 to P-106).
- **Keep the canvas laid out while the context is lost.** A canvas hidden on
  `lost` is off screen to the loop's IntersectionObserver and never draws
  again; components hide it only for `unsupported` and `reduced-motion`
  (applied to Holo Sticker, Holo Foil and Iridescent Ribbon too; e2e loses
  and restores the context of every WebGL effect; P-098).
- **Layout** follows decision [0016](0016-ported-component-sources.md):
  merged upstream modules (`vector-dither-core.ts`,
  `viscose-carousel-engine.ts`, `viscose-carousel-shaders.ts`) are excluded
  from Biome; Labs-written wrappers are linted. `cobe` joins the library's
  optional peers (`^2.0.1`); the site pins 2.0.1.

## Alternatives

| Option | Why not |
| --- | --- |
| Keep GSAP as an npm dependency | Its license is not on the allowlist (decision 0007) and forbids some uses an MIT item cannot rule out for its users. Motion is MIT and already a peer. |
| Vendor cobe's source instead of wrapping npm `cobe` | Its shaders are compiled by a build step (glslx) into a minified bundle; a wrapper keeps upstream updates a version bump. The three behaviors where 2.0.1 lags the pinned source are restored in the wrapper (globe fidelity notes). |
| Let cobe create its context and loop on its own `requestAnimationFrame` | No off-screen or hidden-tab pause, no context restore, an uncapped pixel ratio: the gaps decision 0021 closed. |
| Port Viscose's project page too | It is application content with its own data model (statements, captioned media); the component hands a card to `onOpen` instead, and the shader's page uniforms stay bound at their idle values so the ring draws exactly as upstream. |
| Render Vector Dither on a canvas, as upstream's preview does | The upstream's product is the vector file; inline SVG is the same picture (0.000% against upstream's export), scales, and server-renders. |

## Evidence

`docs/evidence/ports/<component>/fidelity.md` for `dot-halftone`,
`vector-dither`, `globe`, `viscose-carousel` and the fireworks section of
`lifeline`: 0.000% differing pixels on every matched frame (Viscose: one
pixel of 304,500 at 375x812), against a 0.000% noise floor, on SwiftShader
(S-283). Vector Dither's core matches upstream's SVG byte for byte over
56,700 settings. Viscose's recorded ring state matches upstream's on every
frame. `scripts/webgl-items.test.mjs` guards the helper use; `e2e/webgl.spec.ts`
covers fallbacks, context loss, the 2D fallback, keys and the server-rendered
SVG.

## Consequences

- Five more items depend on `render-loop`; its contract (statuses, `resize`,
  `invalidate` from `render`) is now relied on by 2D and overlay uses.
- A GSAP rewrite is a frame-by-frame verification job, not a search and
  replace: one upstream quirk (GSAP's sleeping ticker drawing a frame late
  after 120 idle frames) is deliberately not reproduced, and recorded.
- Globe shows a land map embedded in `cobe` (S-346, CC BY-SA); it is credited
  although no file here contains it.

## Re-test when

- `cobe` publishes a release past the pinned commit: drop the wrapper's
  restorations of the three behaviors and diff again.
- Motion changes `animateValue`'s driver semantics (pause and `startTime`
  read its global clock today; P-105).
- The render loop gains a device-pixel-ratio listener (today a ratio change
  without a resize is noticed at the next resize).

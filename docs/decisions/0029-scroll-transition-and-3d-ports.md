# 0029: Port scroll effects into scroll containers, let renderers that own their context run on render-loop, and carry Apache notices once

- Status: Accepted
- Date: 2026-10-13
- Deciders: Port pod J (scroll-3d), under the owner's port brief
- Sources: S-260, S-157, S-261, S-262, S-263, S-264, S-265, S-266, S-267, S-268, S-269, S-104, S-240, S-275, S-283, S-345

## Context

Batch J (S-260) ports six upstreams: two scroll-driven sections built on
GSAP's ScrollTrigger (S-261, S-262), a WebGPU page-transition site with GSAP
and SplitText (S-263), a Motion fold carousel (S-264), Paperlab's React Three
Fiber paper (S-265, Apache-2.0 with a NOTICE) and Lenis's React provider
(S-266). Decision [0026](0026-canvas-and-3d-ports.md) already rules that GSAP
is rewritten with Motion and that every canvas loop runs on `render-loop`.
Four questions were open:

- The scroll sections read the window (`100vh`, `innerHeight`,
  ScrollTrigger on the page), but the specimen wall shows them in a tile.
- three.js's `WebGPURenderer` and an R3F `<Canvas>` create their own context,
  and the WebGPU one initializes asynchronously; `render-loop` created the
  context itself and assumed a synchronous setup.
- Paper is 75 modules under Apache-2.0: the license text and NOTICE must
  travel with the code, and each modified file must say it was changed.
- The wall cannot drive a scroll effect with its hover and press states.

## Decision

- **Scroll effects scroll with the window by default and accept a
  `container`** (Motion's `useScroll({ container })`). Viewport sizes become
  container units: `100cqh` resolves to the nearest size-contained scroll
  container and, with none, to the small viewport height; window
  measurements become the container's. Demos render a size-contained scroll
  container (`container-type: size`) wrapped in Smooth Scroll, hydrate
  (`loop.hydrate`), and scroll it themselves on the wall only (inside
  `[data-specimen]`), holding while `[data-loop-paused]` is set.
- **`render-loop` gains `context: "none"`** for renderers that create their
  own context: `setup` receives `null`; `render` may return `false` while
  nothing is drawn yet (the status stays "pending", so the fallback stays
  up), and a `render` that throws releases the state and reports
  "unsupported" (an asynchronous initialization that failed). WebGPU Page
  Transition uses it with three.js's `WebGPURenderer` (WebGPU, else WebGL 2,
  else a DOM tier); Paper runs R3F with `frameloop="never"` and advances only
  its own root from the loop (`advance(time, false, state)`, time in
  seconds), so drawing stops off screen and in hidden tabs.
- **Paper keeps the 3D sheet under reduced motion**, still and without
  autoplay, as upstream does; its flat fallback shows without WebGL and until
  the first frame (the server render and the wall tile). This is the one
  exception to decision 0021's fallback under reduced motion: a still sheet
  has no motion to reduce, and the flat picture loses the paper.
- **GSAP timing is reproduced from GSAP's source, not from memory**:
  ScrollTrigger's numeric `scrub` is a tween to the new progress with ease
  `"expo"` (expo.out), restarted from the current progress on each update; a
  trigger without an animation is not scrubbed; GSAP 3.12's expo is
  `2^(10(t - 1))·t + t^6·(1 - t)` (ease-in), not the textbook curve; a tween
  fired from a scroll update starts at GSAP's last tick, so the Motion
  animation starts one frame early (a negative delay of the frame's delta).
  Paperlab names its eases in configs (`transition.ease`), so the port parses
  GSAP ease names (`paper-ease.ts`).
- **Apache-2.0 notices travel once.** `ports/<source>/NOTICE` is appended to
  the license footer; a component's `licenseFile` carries the full license
  and NOTICE in one file and every other file a short notice pointing to it;
  `changeNotice` adds the modification statement (Apache-2.0, section 4(b))
  to every file. The NOTICE is also reproduced in `THIRD_PARTY_NOTICES.md`.
- **Fidelity runs pause Playwright's clock on its own frame grid** before
  sampling animations, switch CSS transitions off on both sides, and, where
  the port must run on a newer pinned dependency than upstream (three.js
  0.185.1 against 0.184.0), add the upstream on the pinned version as a
  control so the port's code is measured apart from the dependency.

## Alternatives

| Option | Why not |
| --- | --- |
| Scroll effects only on the window | The wall shows specimens in tiles; a page-height effect cannot be looped there, and apps put sections in scroll containers. |
| A contract `loop` step that scrolls the tile | Needs a contract revision and a scroll driver on the site for three items; a hydrated demo that scrolls its own container uses what the contract already has (decision 0020). |
| Let WebGPU and R3F keep their own loops | Leaves two renderers outside decision 0021's off-screen pauses and fallback rule. |
| Create the WebGPU context in `render-loop` | Choosing WebGPU or WebGL 2 needs an asynchronous adapter request, and three.js already does it, including the WebGL 2 fallback. |
| The full Apache text in each of Paper's 75 files | About 800 KB of repeated license text in one registry item (826 KB with the license once). |
| Depend on the `paperlab` npm package | It needs `gsap` as a peer dependency (S-345 in decision 0026). |

## Evidence

- `docs/evidence/ports/<component>/fidelity.md` for `smooth-scroll`,
  `sticky-grid-scroll`, `svg-mask-scroll-transition`, `fold-carousel`,
  `webgpu-page-transition` and `paper`: every settled frame of every
  component matches upstream at 0.000% (WebGPU Page Transition: against the
  upstream on three.js 0.185.1 within 0.005% in every frame).
- `scripts/export-ports.test.mjs`: the NOTICE and change notice travel, and
  `licenseFile` carries the full text once.
- Headless Chromium on the reference Mac exposes a WebGPU adapter
  (google / swiftshader) with `--enable-unsafe-webgpu`; without the flag the
  port falls back to WebGL 2 (`data-tier="webgl2"`), measured identical.

## Consequences

- A scroll effect must be given a size-contained scroll container to work
  inside one; its docs say so.
- `render-loop`'s `render` type allows a boolean, and a throwing `render` now
  ends the loop with "unsupported".
- Paper's item is large (75 files); its demo and the npm library carry it
  only while it is beta.

## Re-test when

- three.js changes how WebGPU blends transparent planes again, or the site
  moves off 0.185.1: re-measure WebGPU Page Transition against the pinned
  upstream.
- Paperlab publishes a GSAP-free build, or R3F adds a way to hand a frame
  loop to the host: revisit the port's shape.
- The contract gains a scroll step for loops: drop the demos' own scrolling.

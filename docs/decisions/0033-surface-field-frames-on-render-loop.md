# 0033: Run an engine that schedules its own frames on the render loop, and leave out its worker prop

- Status: Accepted
- Date: 2026-10-13
- Deciders: Port pod WEB-2 (surface), under the owner's port brief
- Sources: S-512, S-157, S-528, S-286, S-287, S-514, S-515, S-014, S-152, S-153, S-237

## Context

Surface Field (S-512) is a 3,500-line canvas engine, not a component with a
draw function. It owns its frame chain: it asks for a frame, works out what
changed (the light's box, the crests, the breath), repaints only that, and
then either asks for the next frame, dozes on a timer, or goes to sleep until
a pointer event wakes it. All of that state lives in one closure, and the
engine reaches the page only through an environment object (`env`: box,
clock, frames, timers, colors), because upstream also runs the same code in a
worker on an OffscreenCanvas (its `worker` prop). Decision
[0026](0026-canvas-and-3d-ports.md) requires every drawing loop to go through
`useRenderLoop`, and the owner's brief asks for line-for-line ports.

Rewriting the engine as a `render(handle, frame)` function would change every
one of its constants' meaning (its sleep, its partial repaints and its
masters all assume it decides when the next frame happens). Leaving it on
`requestAnimationFrame` would duplicate the loop's lifecycle (off screen, hidden
tab, resize) and break the rule.

## Decision

- **The render loop is the engine's frame clock.** The port keeps `engine.ts`
  unchanged (apart from one renamed type) and gives it an `env.frame` and
  `env.cancelFrame` that queue the callback and call the loop's `invalidate()`.
  `useRenderLoop` runs with `context: "2d"`, `continuous: false` and
  `respectReducedMotion: false` (the engine already draws one still frame under
  reduced motion, as Dot Halftone does); its frame runs the queued callbacks
  with `performance.now()`, the clock the engine stamps pointer events with.
  Off screen and in a hidden tab the loop does not draw, so the queued frame
  waits; when the canvas returns it runs, with the engine's state intact.
- **The loop owns the size observer.** Its custom `resize` hook calls the
  engine's `resize`; the host-listener module no longer observes the canvas.
- **The engine restarts on its tuning props, the loop does not.** The loop's
  effect depends on the canvas ref, so the dots canvas keeps one place in the
  tree whether or not the line fabric (a second canvas) is mounted.
- **The `worker` prop is not ported.** A worker entry has to be built by the
  host's bundler (`new Worker(new URL(...))`), which a registry item cannot
  ship, and a worker lane draws on its own frame clock, outside the render
  loop. The engine's environment object is untouched, so a worker lane can be
  added later without changing the picture.
- **Tokens and theme.** The dots' ink is `--surface-field-ink` (falling back to
  the inherited color, so a host that sets `color` as upstream does is
  unaffected) and the light's tint is read from the field's own element, so a
  scoped theme works; `data-theme` changes and the system color scheme repaint
  as a class change on the root already did.

## Alternatives

| Option | Why not |
| --- | --- |
| Rewrite the engine as a draw function called by the loop every frame | Loses the sleep, the doze timer and the partial repaints that make a still field free; not a line-for-line port. |
| Keep the engine's own `requestAnimationFrame` and add an IntersectionObserver beside it | Two lifecycles for one canvas; the rule of decision 0026 exists to avoid exactly that. |
| `continuous: true` with the engine drawing only when it has something to do | The loop would wake the page every vsync for a field that is asleep. |
| Port the worker lane too | Needs a host-built worker entry and a second frame clock; see above. |

## Evidence

`docs/evidence/ports/surface-field/fidelity.md`: the field's pixels on
matched frames against upstream's own demo, with an upstream-against-itself
noise floor. `scripts/webgl-items.test.mjs` guards that no file of the item
calls `requestAnimationFrame` and that it draws through `useRenderLoop`;
`e2e/webgl.spec.ts` covers the fallback, the still frame under reduced motion
and hydration.

## Consequences

- The item depends on `render-loop` and `use-reduced-motion`.
- A host that asked upstream for `worker` must draw on the main thread here.
- Frame timestamps are read inside the loop's frame (`performance.now()`), not
  taken from the browser's frame callback; the difference is under one frame.

## Re-test when

- `render-loop` passes the browser's frame timestamp to `render`: use it.
- A worker lane is wanted: add the environment from the worker runtime and
  give it the loop's pause signals.
- Upstream changes the engine's environment object.

# smooth-scroll: fidelity

- Upstream: [darkroomengineering/lenis `packages/react/src`](https://github.com/darkroomengineering/lenis/tree/eea71595f5ae595f49b21ed87520822d3624098a/packages/react/src) at `eea71595f5ae595f49b21ed87520822d3624098a` (the v1.3.26 tag; MIT, copyright 2024 darkroom.engineering; S-266), with the `lenis@1.3.26` core from npm (the same release). `packages/react` is unchanged from that tag to the repository's head on 2026-10-13.
- Port: `ports/lenis/smooth-scroll`, exported to `content/components/lenis/smooth-scroll` (item `smooth-scroll`, primitive none, no icons)
- Renderer: Chromium (Playwright S-014), device scale 1, 1280x800 and 375x812.
- Method: one harness page renders either the upstream `ReactLenis` and `useLenis` (built from the pinned sources) or the port's `SmoothScroll` and `useSmoothScroll`, with the same content (40 rows and a progress bar that `useLenis` drives), the same options (`lerp: 0.08`, `wheelMultiplier: 1.4`) and the Lenis stylesheet. Two modes: a wrapper (a 300x320 scroll container) and `root` (the page). Time is frozen on Playwright's clock (S-240; `install`, then `pauseAt`) and advanced 16 ms per frame for 150 frames; synthetic wheel events (deltaY 240, 240, 360, then -300 at frames 2, 5, 9 and 60) are dispatched in the page, and a short real pause follows each frame so the native `scroll` events Lenis also listens to are delivered before the next frame. The scroll position is read every frame, and the box (or the viewport) is captured at frames 8, 20, 40, 90 and 149. Three upstream loads and three port loads; the port column is the worst of three port-against-upstream pairs, the noise floor the worst of three upstream-against-upstream pairs.
- Target: at most 0.1% differing pixels, or within the measured noise floor where the browser is not repeatable (owner brief, S-157, S-260).

## Result: pixels that differ

| Viewport, mode | frame 8 | frame 20 | frame 40 | frame 90 | frame 149 | scroll track, max difference |
| --- | --- | --- | --- | --- | --- | --- |
| 1280x800 wrapper (port) | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0 px |
| 1280x800 wrapper (noise floor) | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0 px |
| 1280x800 root (port) | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0 px |
| 1280x800 root (noise floor) | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0 px |
| 375x812 wrapper (port) | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0 px |
| 375x812 wrapper (noise floor) | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0 px |
| 375x812 root (port) | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0 px |
| 375x812 root (noise floor) | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0 px |

Worst port frame: 0.000%; the scroll position matches every frame of every run.
The port's scroll code is the upstream's, line for line (only the four
modules' imports are merged). An earlier run that left the clock flowing
(`install` without `pauseAt`) varied by up to 13.8% between two upstream loads
in the input window; freezing the clock removed that noise entirely
(docs/pitfalls.md).

Strips (frames 8, 20, 40, 90 and 149; 1280x800, wrapper): [before.webp](before.webp) (upstream), [after.webp](after.webp) (port), [diff.webp](diff.webp) (pixelmatch S-152; red marks a differing pixel).

## Deviations

Every change from upstream.

- The four modules (`types.ts`, `store.ts`, `provider.tsx`, `use-lenis.ts`) are merged into one file, in that order, each after a `// ---- upstream: <path> ----` marker; only their imports are merged. The file starts with `"use client"`.
- Added after them (Labs): `SmoothScroll`, which renders `ReactLenis` and the Lenis stylesheet (`packages/core/lenis.css`, line for line) as a React-hoisted `<style href="designfrom-smooth-scroll">` (decision 0013), so no CSS import is needed; `useSmoothScroll`, the same function as `useLenis`; and `Lenis`, the upstream's alias for `ReactLenis`. The upstream's default export is not kept (the registry uses named exports).
- Reduced motion is the core's own behaviour (`respectReducedMotion`, on by default in 1.3.26): wheel input tracks one to one and programmatic `scrollTo` jumps.

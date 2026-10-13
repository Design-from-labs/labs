# paper: fidelity

- Upstream: [NourMtir0722/Paperlab `packages/paperlab/src/Paper.tsx`](https://github.com/NourMtir0722/Paperlab/blob/41914833cb9ae12b32a8cbbdee4723f5b12158af/packages/paperlab/src/Paper.tsx) and its whole import closure (74 modules) at `41914833cb9ae12b32a8cbbdee4723f5b12158af` (Apache-2.0 with a NOTICE, copyright 2026 Noor Mtir; S-265)
- Port: `ports/paperlab/paper` (variants shape, `src/`), exported to `content/components/paperlab/paper` (item `paper`, primitive none, no icons; 75 files, 826 KB with the license and NOTICE once)
- Renderer: Chromium (Playwright S-014) with SwiftShader software WebGL (`--use-angle=swiftshader --enable-unsafe-swiftshader`, S-283), device scale 1, 1280x800 and 375x812. Both sides on three.js 0.185.1, @react-three/fiber 9.8.1, drei 10.7.9, three-custom-shader-material 6.4.0 and zod 4.6.5 (the upstream side adds GSAP 3.12.7 in the harness only, never in the port).
- Method: one Vite harness renders either the upstream `<Paper>` built from the pinned sources (GSAP tweens, R3F's own frame loop) or the port (Motion tweens, R3F with `frameloop="never"` advanced by `render-loop`), filling the viewport, with the same preset. Playwright's clock (S-240) is paused before the page loads, so both sides' first frame, where R3F's clock starts, lands on the same fake frame; then 3 s of 16 ms frames. Stills: five presets with different behaviours (receipt-unroll, letter-fold, hero-peel, page-flip, crumpled-note) at their preset progress. Autoplay: receipt-unroll with `autoplay`, captured 400, 1200 and 2000 ms into the loop (the GSAP-to-Motion rewrite of the yoyo tween). Noise floor: a second upstream load.
- Target: at most 0.1% differing pixels per matched frame (owner brief, S-157, S-260).

## Result: pixels that differ

| Frame | 1280x800 (port / floor) | 375x812 (port / floor) |
| --- | --- | --- |
| receipt-unroll | 0.000% / 0.000% | 0.000% / 0.000% |
| letter-fold | 0.000% / 0.000% | 0.000% / 0.000% |
| hero-peel | 0.000% / 0.000% | 0.000% / 0.000% |
| page-flip | 0.000% / 0.000% | 0.000% / 0.000% |
| crumpled-note | 0.000% / 0.000% | 0.000% / 0.000% |
| receipt-unroll autoplay, 400 ms | 0.000% / 0.000% | 0.000% / 0.000% |
| receipt-unroll autoplay, 1200 ms | 0.000% / 0.000% | 0.000% / 0.000% |
| receipt-unroll autoplay, 2000 ms | 0.000% / 0.000% | 0.000% / 0.000% |

Worst port frame: 0.000%. (Before the clock was paused from load, the receipt's
idle sway differed by 0.2 to 0.6% between sides, because R3F's clock started on
different real frames; a run interrupted by a file change reloading the Vite
page recorded a blank upstream frame, and was rerun.)

Strips (the five presets; 1280x800): [before.webp](before.webp) (upstream), [after.webp](after.webp) (port), [diff.webp](diff.webp) (pixelmatch S-152; red marks a differing pixel).

## Deviations

Every change from upstream. The numbers above are measured on the shipped code, with these changes in place.

- Files: each module of the closure is one flat file prefixed `paper` (decision 0022): `Paper.tsx` is `paper.tsx`, `PaperMesh.tsx` is `paper-mesh.tsx`, `<dir>/index.ts` is `paper-<dir>.ts`, and `<dir>/<name>` is `paper-<dir>-<kebab-name>` (for example `surface/PaperMaterial.tsx` is `paper-surface-paper-material.tsx`); relative imports follow. Files that render or use React start with `"use client"`. PaperField, PaperStage, the FX entry, the editor and the demo apps (with their walking figure and hand tracking) are not ported.
- GSAP is gone. The four `gsap.to` calls (the state machine's transitions, the sticker's recall and snap, autoplay with repeat and yoyo, the behavior commit) use `tweenTo` in `paper-ease.ts`, a Motion animation of 0 to 1 that moves an object's numbers from their current values, with GSAP's repeat and yoyo (Motion's `"reverse"`) and `kill`, `pause` and `play`. State transitions name eases as GSAP does (`transition.ease`, for example `power2.out`), so `parseEase` maps GSAP 3.12's ease names, written from GSAP's source, to functions.
- The canvas is drawn by `render-loop` (decision 0021; `context: "none"`, decision 0027): R3F runs with `frameloop="never"` and the loop advances only this canvas's root each frame (`advance(time, false, state)`), so drawing stops off screen and in hidden tabs, with the upstream's pixel ratio range `[1, 2]`.
- The upstream's flat fallback (`PaperFallback`) is also layered over the canvas until the first frame is drawn (the server render, the wall tile), then fades out; without WebGL it is shown alone, as upstream. Under reduced motion the 3D sheet stays, still and without autoplay, as upstream does (decision 0027).
- License: the full Apache-2.0 text and the upstream NOTICE end `paper.tsx`; every other file carries a short Apache notice pointing to it, and every file states that Design From Labs modified it (Apache-2.0, sections 4(a), 4(b) and 4(d)). The NOTICE is also in `THIRD_PARTY_NOTICES.md`.
- The demo uses original content (a fictional stationery receipt); the upstream preset texts are used only in the fidelity harness.

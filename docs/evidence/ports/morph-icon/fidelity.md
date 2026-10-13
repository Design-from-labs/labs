# Morph Icon: port fidelity

- Upstream: guillermolg00/morphicons @ 38d2a7221633a453eeafebd872ee3649b9274b22 (`src/core`, `src/dom/index.ts` and the React adapter `src/react/index.tsx`)
- Harness: one Vite page renders either upstream's React adapter (from its source) or the port's files, with the same props, icon data, page, fonts and state; React 19.3.0, Vite 7.3.1; Chromium (Playwright 1.64.0), device scale 1
- Diff: pixelmatch (S-152), threshold 0.1, anti-aliased pixels excluded; percent of all pixels in the frame. The noise floor is upstream diffed with a second upstream load of the same frame.
- Viewports: 1280x800 (desktop) and 375x812 (mobile)
- Target: at most 0.1%. Worst port frame: **0.0000%** (10 frames); noise floor 0.0000%

## Scene

Four `<MorphIcon>`s on white (120 px menu, 72 px play, 72 px amber sun, 72 px heart at stroke 1.5), with Lucide icon nodes (S-005) as input. 500 ms after mount every icon morphs to its pair (x, pause, moon, bell) on the default `snappy` spring; the state change is committed with `flushSync` inside the timer, so the morph starts at the same fake time on both sides. Frames are taken on Playwright's fake clock (it drives `requestAnimationFrame` too): at rest, 48, 112 and 192 ms into the morph, and settled.

## Upstream demo

The upstream playground (`playground/index.html`) was served with Vite from the same commit, with `lucide` 1.28.0 from upstream's devDependency range, and captured on the same fake clock: `upstream-playground-desktop-at-112ms.webp` is menu to x at 112 ms. It is a dark tool page with its own controls, so it is the reference picture, and the numbers come from the shared harness.

## Results

| Against | Viewport | State | Differing pixels | Percent | Noise floor |
| --- | --- | --- | ---: | ---: | ---: |
| upstream | desktop | rest-a | 0 | 0.0000% | 0.0000% |
| upstream | desktop | to-b-at-48ms | 0 | 0.0000% | 0.0000% |
| upstream | desktop | to-b-at-112ms | 0 | 0.0000% | 0.0000% |
| upstream | desktop | to-b-at-192ms | 0 | 0.0000% | 0.0000% |
| upstream | desktop | rest-b | 0 | 0.0000% | 0.0000% |
| upstream | mobile | rest-a | 0 | 0.0000% | 0.0000% |
| upstream | mobile | to-b-at-48ms | 0 | 0.0000% | 0.0000% |
| upstream | mobile | to-b-at-112ms | 0 | 0.0000% | 0.0000% |
| upstream | mobile | to-b-at-192ms | 0 | 0.0000% | 0.0000% |
| upstream | mobile | rest-b | 0 | 0.0000% | 0.0000% |

## Evidence

`<state>-before.webp` is upstream, `-after.webp` the port, `-diff.webp` the pixelmatch overlay (red: differing pixels).

## Deviations

- The core's eight modules (`types`, `parse`, `serialize`, `normalize`, `resample`, `plan`, `interpolate`, `spring`) are merged into `morph-icon-core.ts` and the DOM driver is `morph-icon-dom.ts`, so the registry item stays flat; upstream lines are unchanged apart from the relative imports, and each module starts with a `// ---- upstream: <path> ----` marker. The React adapter is `morph-icon.tsx`.
- Not ported: the Vue, Svelte, Astro, React Native and custom-element bindings, the framework-neutral controller (`src/dom/controller.ts`, which the React adapter does not use) and the format adapters (`svgToIcon`, `maskTarget`, `canvasTarget`).
- Labs: `"use client"` at the top of the React adapter.
- Two upstream comments in the core named third-party icon sets as examples; they now say "other 24-unit sets" and "packs drawn on 20 or 32 units" (repository naming rule). Code is unchanged.
- Labs: `reducedMotion` defaults to `"user"` (honor `prefers-reduced-motion`: the icon swaps without the morph) instead of upstream's `"never"`. `"never"` restores upstream's behavior. Frames above are without reduced motion, so they are unaffected.
- No icon data ships with the item. Upstream ships none either (its playground and site bring third-party icon data as dev-only inputs); the demo inlines six Lucide icons (ISC, S-005).
- No Phosphor variant: Phosphor glyphs are filled outlines, which upstream documents as unable to morph correctly (its README, "Icon library compatibility"), and the item renders no icon library itself.

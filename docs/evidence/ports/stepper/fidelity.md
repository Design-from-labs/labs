# Stepper: port fidelity

- Upstream: Josh Puckett's fluid stepper (S-400), MIT, at commit 764823ffdcc21f44d5205b8e9e995707d4f72756: the core, the React adapter and the stylesheet (`packages/*/src/core`, `src/react`, `src/styles/Stepper.css`). The Vue adapter is not ported.
- Upstream has no demo app, so one harness page renders the upstream React source exactly as its README's quick start and autoplay examples show (same props, same `Play`/`Pause` button), or the port's files with the same props, page and state. React 19.3.0, Vite 7.3.1, Chromium (Playwright 1.64.0), device scale 1. The page has no Tailwind and no font of its own (P-023), so the only difference between the sides is the component.
- Diff: pixelmatch (S-152), threshold 0.1. Two numbers per frame: the whole viewport, and the 320x160 stage box around the stepper (the stricter one, since the stepper is a small part of the frame). Lossless PNG captures; the strips here are WebP.
- Viewports: 1280x800 and 375x812. Light scheme; the README's dark theme class on a dark page for the dark rows.
- In-flight frames: every CSS transition (`document.getAnimations()`) is paused and set to the same `currentTime` right after the state change, then captured with animations allowed (P-034: no fake clock needed; everything here is CSS transitions).
- Target: at most 0.1%. **Worst port frame: 0.0000% (0 px) in all 42 port frames**, stage box and viewport. Noise floor (upstream against a second upstream load): 0 px.
- Cross-check with the shared `tools/fidelity.mjs` (whole viewport): quick start at step 3 and the autoplay fill paused at 1500 ms, both viewports: 0 px.

## Results

| Frame | Against | 1280x800 stage / viewport | 375x812 stage / viewport |
| --- | --- | ---: | ---: |
| quick-0 .. quick-4 (each active index, by clicking) | upstream | 0 / 0 px | 0 / 0 px |
| to-3 at 100, 250 and 400 ms (0 to 3, the 500 ms morph) | upstream | 0 / 0 px | 0 / 0 px |
| autoplay fill at 1500 ms (step 1) | upstream | 0 / 0 px | 0 / 0 px |
| autoplay fill at 2700 ms (step 3) | upstream | 0 / 0 px | 0 / 0 px |
| autoplay advance, 200 ms after the timer moves to step 2 | upstream | 0 / 0 px | 0 / 0 px |
| window-6 (count 9, maxVisible 5) | upstream | 0 / 0 px | 0 / 0 px |
| window to 8 at 250 ms (track translate in flight) | upstream | 0 / 0 px | 0 / 0 px |
| vertical-3, vertical to 1 at 250 ms | upstream | 0 / 0 px | 0 / 0 px |
| enter: count 5 to 6, 150 ms after promotion | upstream | 0 / 0 px | 0 / 0 px |
| exit: count 5 to 4 at 100 ms | upstream | 0 / 0 px | 0 / 0 px |
| dark theme class, step 3; and its fill at 1500 ms | upstream | 0 / 0 px | 0 / 0 px |
| reduced motion: click to step 4; autoplay play | upstream | 0 / 0 px | 0 / 0 px |
| control: to-3 at 250 ms; autoplay advance at 200 ms | upstream (second load) | 0 / 0 px | 0 / 0 px |
| rtl: step 3; fill at 1500 ms; window-6 | the port in ltr, mirrored | 0 px (stage) | 0 px (stage) |

`fidelity.json`-style numbers for every frame were produced by the harness (`results.json`); the table groups frames with identical results.

## Evidence

Each strip row is upstream (left), port (right of it) and the pixelmatch diff (right), at 2x nearest-neighbour scale.

- `static-1280.webp`: quick start, active 0 to 4.
- `transition-1280.webp`: 0 to 3 at 100, 250 and 400 ms; the window's translate at 250 ms; vertical at 250 ms.
- `autoplay-1280.webp`: fill at 1500 ms, fill at 2700 ms on step 3, the automatic advance at 200 ms, the dark class's fill.
- `count-window-375.webp`: a step entering and one leaving mid-transition, the window, vertical, the dark class.
- `reduced-control-375.webp`: reduced motion (instant), and the two upstream-against-upstream controls.
- `rtl-mirror-1280.webp`: the right-to-left port against its mirrored left-to-right render (the harness's text button is hidden in these rows; mirrored text never matches).

## Renames

| Upstream | Port | Why |
| --- | --- | --- |
| classes `*-container`, `*-track`, `*-step`, `*-vertical`, `*-step-active`, `*-step-filling`, `*-entering`, `*-exiting` (package-prefixed) | `[data-slot="stepper"]`, `[data-slot="stepper-track"]`, `[data-slot="stepper-step"]`, `[data-stepper-orientation="vertical"]`, `[data-stepper-active]`, `[data-stepper-filling]`, `[data-stepper-phase="entering"]`, `[data-stepper-phase="exiting"]` | De-branding. Each class becomes one attribute selector of the same specificity (0,1,0), and the rules keep upstream's order, so the cascade is identical (shown by the 0 px frames, including the entering/exiting and vertical overlaps). |
| `--pill-dot-size`, `--pill-active-width`, `--pill-gap`, `--pill-bg`, `--pill-active-bg`, `--pill-fill-bg`, `--pill-container-bg`, `--pill-container-border`, `--pill-container-radius` | `--stepper-dot-size`, `--stepper-active-width`, `--stepper-gap`, `--stepper-bg`, `--stepper-active-bg`, `--stepper-fill-bg`, `--stepper-container-bg`, `--stepper-container-border`, `--stepper-container-radius` | Component-prefixed tokens (contract section 2). Read with `var(--stepper-*, <upstream default>)` instead of declared on the container, so the item's `cssVars` (light and dark), a class or an inline style can set them. Defaults are identical. |
| `--pill-duration`, `--pill-easing`, `--pill-fill-duration` (internal) | `--stepper-duration`, `--stepper-easing`, `--stepper-fill-duration` | Same, set inline by the component as upstream does. |
| `import "../styles/Stepper.css"` | a `<style href="designfrom-stepper" precedence="default">` string in `stepper.tsx` | Works when installed by the shadcn CLI with no global CSS import (decision 0013): React 19 hoists and deduplicates it, and server rendering emits it with the markup, so tiles and stills are styled without hydration. |
| `core/*.ts` (4 modules) | `stepper-core.ts` | Flat item (decision 0016); each module keeps its lines after a `// ---- upstream: <path> ----` marker. |
| `react/Step.tsx`, `react/Stepper.tsx`, `react/hooks/*.ts`, `styles/Stepper.css` | `stepper.tsx` | Same. `useStepWindow` and `useAnimatingSteps` are not exported (upstream's index does not export them either). |

## Deviations

- **Right to left (Labs).** Upstream is left-to-right only: in an rtl page its fill grows from the left and a windowed row translates the wrong way, hiding the active step. The port uses logical properties (`margin-inline-start` for the track and steps, and their transitions; `inset-inline-start`/`-end` for the fill), and the window's translate comes from `--stepper-window` with its sign flipped under `:dir(rtl)` (S-155). For that, `computeStepWindow` also returns `offset` (pixels), and the track's transform moved from an inline style to the stylesheet; an unwindowed track is `translateX(0)` instead of `none` (0 px difference above). Measured: the rtl render equals the mirrored ltr render (P-021 method), and arrow keys follow the direction.
- **Semantics and keyboard (Labs).** Upstream renders `role="tablist"` / `role="tab"` with `aria-selected`, no tab panels, and only the active step in the tab order, with no arrow keys, so keyboard users could not reach the other steps. The port renders native `<button type="button">`s named "Step 2 of 5" (`getStepLabel` for translations) with `aria-current="step"` in a `role="group"` labelled "Progress steps" (`aria-label`); roving focus with Left/Right (mirrored in rtl), Up/Down when vertical, Home and End; selection follows focus; focusing uses `preventScroll` so the clipped container never scrolls under the window. Without `onStepClick` the steps are `<span aria-hidden>` and the container is `role="img"` labelled "Progress steps: Step 2 of 5" (upstream rendered focusable buttons that did nothing); the README autoplay frames show this costs 0 px. A step that is leaving is `aria-hidden`, out of the tab order and ignores clicks (upstream kept its stale click handler).
- **Pixels kept, contrast on request (contract section 5, ports/README).** Measured defaults: inactive dot 1.31:1 against the container (1.43:1 against white), focus ring rgba(0,0,0,0.3) 2.11:1 against white. Kept as the default; under `prefers-contrast: more` inactive dots get a 1 px inset ring in `--stepper-active-bg` (11.9:1 against the container) and the focus ring takes that color; under `forced-colors: active` steps use Canvas with a CanvasText ring, the active pill Highlight, the container border CanvasText. The focus ring color is a new token, `--stepper-focus-ring` (light: upstream's value; dark: rgba(255,255,255,0.5)).
- **Dark tokens.** Upstream has no dark default; the item's dark `cssVars` are the README's dark theme example verbatim. Its fill (white at 30% on a white-at-90% pill) is barely visible; that is upstream's choice, recorded here, and `--stepper-fill-bg` changes it.
- **Autoplay hook (Labs, additive).** `autoStart` (default false, upstream behaviour) starts playback on mount unless `prefers-reduced-motion: reduce` matches, read live in the effect (P-063). `paused` holds playback (no timer, `filling` false) without changing `playing`; when it ends the step restarts its full duration and its fill from zero. The demo passes `paused` while the gallery marks it `data-loop-paused`. `loop` is no longer in the scheduling effect's dependency list (the timer reads it from the controller), and the controller's non-null assertion became an optional call; neither changes behaviour.
- **Not clickable without `onStepClick`.** `cursor: default` for span steps (upstream showed a pointer on dots that did nothing).
- **Unchanged upstream limits.** `computeStepWindow` assumes the default 8 px dots, 24 px pill and 6 px gap, so windowing is wrong if those tokens change (documented in `docs` and props). The 300 ms exit removal and 250 ms enter/exit durations are upstream's.

## Primitive and icons

Primitive `none`. No headless library ships a stepper or a pagination-dots primitive: Radix, Base UI and React Aria have tabs, toggle groups and radio groups, whose roles (`tab`, `radio`) would claim semantics a progress stepper does not have (no panels, no form value) and whose styling hooks would replace the upstream markup. The behaviour a primitive would add is a roving focus over a row of buttons, which the port implements in a dozen lines. Icon set `none`: upstream renders no icons.

## Gallery

- `stage: { device: "phone", slot: "inline", height: 560 }`: the demo is an onboarding card (original inline SVG drawings, five steps, autoplay with a Pause/Play control and Next).
- `tile: { span: 1, rows: 2 }` (a phone fits a tall single column).
- `loop: { hydrate: true, script: "click[0] → wait → wait → wait → wait", duration: 10000 }`: the demo autoplays at 2000 ms per step, and the loop clicks the first dot every 10 s, which realigns the autoplay with the loop, so the tile reads 1, 2, 3, 4, 5, 1 with the fill. Clicking a dot is stateless, so a click lost before the stage's iframe loads cannot invert anything.
- Checked on a `LABS_INCLUDE_BETA=1` build of an isolated copy (P-047): on `/ui` the staged tile's loop advanced through all five steps in 12 s with no navigation (P-050); with "Pause animations" on, `data-loop-paused` reached the iframe's root, the fill cleared and the step held for 4.5 s; under reduced motion the component page did not start autoplay. `/ui/stepper` at 1280, 375 and 320, ltr and rtl: no horizontal overflow, no console or hydration errors, the hoisted style present in the stage document.

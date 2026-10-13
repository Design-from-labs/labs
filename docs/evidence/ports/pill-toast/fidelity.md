# Pill Toast: port fidelity

- Upstream: hiaaryan/sileo @ fea6820dd34fe00aa9d68c956f2080464c6ab3b2 (`packages/sileo/src`), the `gitHead` of the npm package sileo@0.1.6 (published 2026-10-13)
- License basis: the repository has **no LICENSE file** (nor does the published tarball, https://registry.npmjs.org/sileo/-/sileo-0.1.6.tgz); the `license` field of the package's `package.json` says **MIT**. The port rests on that metadata (S-501), as the snapshot-pinning decision (0028) allows for npm packages whose repository lacks a LICENSE. The package has no `author` field either, so the copyright line in `ports/hiaaryan-sileo/LICENSE` ("Copyright (c) 2026 Aaryan (hiaaryan)") is taken from the repository owner and the sole commit author; replace it if upstream states its own.
- Harness: one Vite page renders either upstream's own source (`src/index.ts` of the pinned clone, with Motion 12.34.0, the version upstream declares) or the port's files (Motion 14.1.0); React 19.3.0, Tailwind 4.3.3 preflight, Figtree on both sides; Chromium (Playwright 1.64.0), device scale 1
- Diff: pixelmatch (S-152), threshold 0.1, anti-aliased pixels excluded; percent of all pixels in the frame (a 1280x800 frame is 1,024,000 pixels, a 375x812 frame 304,500)
- Viewports: 1280x800 (desktop) and 375x812 (mobile)
- Target: at most 0.1%. Worst port frame: **0.0026%** (70 frames; 0 differing pixels in 69 of them)

## Scene

Upstream's own docs demo is not used: it is a Next app that depends on a paid icon package. The harness calls upstream's own `sileo` and `Toaster` with the demo's own toast copy ("Changes Saved", "Something Went Wrong", "Storage Almost Full", "File Uploaded" with a "Share Now" action, a "Booking Flight" promise) and the same calls on the port (`pillToast`, `PillToaster`).

States: success, error and warning cards open (the auto-expand); a pill with no description; an info pill that never dismisses; the action card; a pending promise (spinner frozen at its first frame) and the resolved card; a card that collapsed after its autopilot and one re-opened by hover; a custom roundness and fill; two stacked toasts; light, dark and no `theme` (white fill) at top-right, top-left, top-center, bottom-right and bottom-center, on a light and a dark page (`bc-scheme-dark-success`).

## Method

- Settled frames (`tr-`, `tl-`, `br-`, `tc-`, `bc-`): real time, one toast per fresh page, captured once two frames 250 ms apart are identical, best of three; the control column is upstream against a second upstream capture under the same conditions.
- Mid-flight frames (`clock-`): Playwright's clock paused at load and advanced to each time, so timers and requestAnimationFrame (Motion's pill and card, which this library drives on the frame loop) are matched. `Element.animate` is removed on both sides so Motion stays on the frame loop (P-034, P-035), and every CSS transition and keyframe is paused and seeked to the same logical time, because the document timeline is not on the clock. The port frame is the closest of four pairings (two captures per side); the control is upstream against itself.

## Results

| Against | Viewport | State | Differing pixels | Percent | Control (upstream vs itself) |
| --- | --- | --- | ---: | ---: | ---: |
| upstream | desktop | tr-success-expanded | 0 | 0.0000% | 0 px (0.0000%) |
| upstream | mobile | tr-success-expanded | 0 | 0.0000% | 0 px (0.0000%) |
| upstream | desktop | tr-pill | 0 | 0.0000% | 0 px (0.0000%) |
| upstream | mobile | tr-pill | 0 | 0.0000% | 0 px (0.0000%) |
| upstream | desktop | tr-action-expanded | 0 | 0.0000% | 0 px (0.0000%) |
| upstream | mobile | tr-action-expanded | 0 | 0.0000% | 0 px (0.0000%) |
| upstream | desktop | tr-error-expanded | 0 | 0.0000% | 0 px (0.0000%) |
| upstream | mobile | tr-error-expanded | 0 | 0.0000% | 0 px (0.0000%) |
| upstream | desktop | tr-warning-expanded | 0 | 0.0000% | 0 px (0.0000%) |
| upstream | mobile | tr-warning-expanded | 0 | 0.0000% | 0 px (0.0000%) |
| upstream | desktop | tr-info-pill | 0 | 0.0000% | 0 px (0.0000%) |
| upstream | mobile | tr-info-pill | 0 | 0.0000% | 0 px (0.0000%) |
| upstream | desktop | tr-loading | 0 | 0.0000% | 0 px (0.0000%) |
| upstream | mobile | tr-loading | 0 | 0.0000% | 0 px (0.0000%) |
| upstream | desktop | tr-promise-resolved | 0 | 0.0000% | 9 px (0.0009%) |
| upstream | mobile | tr-promise-resolved | 0 | 0.0000% | 9 px (0.0030%) |
| upstream | desktop | tr-collapsed-after-autopilot | 0 | 0.0000% | 0 px (0.0000%) |
| upstream | mobile | tr-collapsed-after-autopilot | 0 | 0.0000% | 0 px (0.0000%) |
| upstream | desktop | tr-hover-reexpand | 0 | 0.0000% | 0 px (0.0000%) |
| upstream | mobile | tr-hover-reexpand | 0 | 0.0000% | 0 px (0.0000%) |
| upstream | desktop | tr-custom-roundness-fill | 0 | 0.0000% | 0 px (0.0000%) |
| upstream | mobile | tr-custom-roundness-fill | 0 | 0.0000% | 0 px (0.0000%) |
| upstream | desktop | tl-dark-success | 0 | 0.0000% | 0 px (0.0000%) |
| upstream | mobile | tl-dark-success | 0 | 0.0000% | 0 px (0.0000%) |
| upstream | desktop | tl-dark-pill | 0 | 0.0000% | 0 px (0.0000%) |
| upstream | mobile | tl-dark-pill | 0 | 0.0000% | 0 px (0.0000%) |
| upstream | desktop | br-light-success | 0 | 0.0000% | 0 px (0.0000%) |
| upstream | mobile | br-light-success | 0 | 0.0000% | 0 px (0.0000%) |
| upstream | desktop | br-light-action | 0 | 0.0000% | 0 px (0.0000%) |
| upstream | mobile | br-light-action | 0 | 0.0000% | 0 px (0.0000%) |
| upstream | desktop | br-light-pill | 0 | 0.0000% | 0 px (0.0000%) |
| upstream | mobile | br-light-pill | 0 | 0.0000% | 0 px (0.0000%) |
| upstream | desktop | tc-dark-warning | 0 | 0.0000% | 0 px (0.0000%) |
| upstream | mobile | tc-dark-warning | 0 | 0.0000% | 0 px (0.0000%) |
| upstream | desktop | bc-scheme-dark-success | 0 | 0.0000% | 0 px (0.0000%) |
| upstream | mobile | bc-scheme-dark-success | 0 | 0.0000% | 0 px (0.0000%) |
| upstream | desktop | tr-stack | 0 | 0.0000% | 0 px (0.0000%) |
| upstream | mobile | tr-stack | 0 | 0.0000% | 0 px (0.0000%) |
| upstream | desktop | clock-success-desc-at-100ms | 0 | 0.0000% | 0 px (0.0000%) |
| upstream | desktop | clock-success-desc-at-200ms | 0 | 0.0000% | 0 px (0.0000%) |
| upstream | desktop | clock-success-desc-at-300ms | 0 | 0.0000% | 0 px (0.0000%) |
| upstream | desktop | clock-success-desc-at-450ms | 0 | 0.0000% | 0 px (0.0000%) |
| upstream | desktop | clock-success-desc-at-700ms | 0 | 0.0000% | 0 px (0.0000%) |
| upstream | desktop | clock-success-desc-at-1100ms | 0 | 0.0000% | 0 px (0.0000%) |
| upstream | mobile | clock-success-desc-at-100ms | 0 | 0.0000% | 0 px (0.0000%) |
| upstream | mobile | clock-success-desc-at-200ms | 0 | 0.0000% | 0 px (0.0000%) |
| upstream | mobile | clock-success-desc-at-300ms | 0 | 0.0000% | 0 px (0.0000%) |
| upstream | mobile | clock-success-desc-at-450ms | 0 | 0.0000% | 0 px (0.0000%) |
| upstream | mobile | clock-success-desc-at-700ms | 0 | 0.0000% | 0 px (0.0000%) |
| upstream | mobile | clock-success-desc-at-1100ms | 0 | 0.0000% | 0 px (0.0000%) |
| upstream | desktop | clock-tl-dark-action-at-100ms | 0 | 0.0000% | 0 px (0.0000%) |
| upstream | desktop | clock-tl-dark-action-at-250ms | 0 | 0.0000% | 0 px (0.0000%) |
| upstream | desktop | clock-tl-dark-action-at-400ms | 0 | 0.0000% | 0 px (0.0000%) |
| upstream | desktop | clock-tl-dark-action-at-600ms | 0 | 0.0000% | 0 px (0.0000%) |
| upstream | desktop | clock-tl-dark-action-at-1000ms | 0 | 0.0000% | 0 px (0.0000%) |
| upstream | mobile | clock-tl-dark-action-at-100ms | 0 | 0.0000% | 0 px (0.0000%) |
| upstream | mobile | clock-tl-dark-action-at-250ms | 0 | 0.0000% | 0 px (0.0000%) |
| upstream | mobile | clock-tl-dark-action-at-400ms | 0 | 0.0000% | 0 px (0.0000%) |
| upstream | mobile | clock-tl-dark-action-at-600ms | 0 | 0.0000% | 0 px (0.0000%) |
| upstream | mobile | clock-tl-dark-action-at-1000ms | 0 | 0.0000% | 0 px (0.0000%) |
| upstream | desktop | clock-br-light-error-at-100ms | 0 | 0.0000% | 0 px (0.0000%) |
| upstream | desktop | clock-br-light-error-at-250ms | 0 | 0.0000% | 0 px (0.0000%) |
| upstream | desktop | clock-br-light-error-at-400ms | 27 | 0.0026% | 361 px (0.0353%) |
| upstream | desktop | clock-br-light-error-at-600ms | 0 | 0.0000% | 0 px (0.0000%) |
| upstream | desktop | clock-br-light-error-at-1000ms | 0 | 0.0000% | 0 px (0.0000%) |
| upstream | mobile | clock-br-light-error-at-100ms | 0 | 0.0000% | 0 px (0.0000%) |
| upstream | mobile | clock-br-light-error-at-250ms | 0 | 0.0000% | 2248 px (0.7383%) |
| upstream | mobile | clock-br-light-error-at-400ms | 0 | 0.0000% | 5855 px (1.9228%) |
| upstream | mobile | clock-br-light-error-at-600ms | 0 | 0.0000% | 0 px (0.0000%) |
| upstream | mobile | clock-br-light-error-at-1000ms | 0 | 0.0000% | 0 px (0.0000%) |
| lucide item | desktop | tr-success-expanded | 0 | 0.0000% | - |
| lucide item | mobile | tr-success-expanded | 0 | 0.0000% | - |
| lucide item | desktop | tr-action-expanded | 0 | 0.0000% | - |
| lucide item | mobile | tr-action-expanded | 0 | 0.0000% | - |
| lucide item | desktop | tr-error-expanded | 0 | 0.0000% | - |
| lucide item | mobile | tr-error-expanded | 0 | 0.0000% | - |
| lucide item | desktop | tr-warning-expanded | 0 | 0.0000% | - |
| lucide item | mobile | tr-warning-expanded | 0 | 0.0000% | - |
| lucide item | desktop | tr-info-pill | 0 | 0.0000% | - |
| lucide item | mobile | tr-info-pill | 0 | 0.0000% | - |
| lucide item | desktop | tr-loading | 0 | 0.0000% | - |
| lucide item | mobile | tr-loading | 0 | 0.0000% | - |

Evidence: `<state>-<viewport>-before.webp` is upstream, `-after.webp` the port, `-diff.webp` the pixelmatch overlay (red: differing pixels), for a selection of the states above (the numbers are for all of them).

Noise floor: settled frames repeat exactly (the only control difference is 9 pixels in `tr-promise-resolved`). The mid-flight frames of `clock-br-light-error` at 375x812 (250 and 400 ms, a toast opening upward at the bottom edge) are not repeatable on upstream itself: its control differs by up to **1.92%** from one capture to the next, from where the seeked CSS transitions land relative to the frame loop. The port's closest pairing there is 0 pixels. Earlier runs, before `Element.animate` was removed, measured the port on those two frames at 0.69% (one pairing) and 1.72% (four pairings), the same size as that noise; a rerun of the scene alone gave 0 pixels at every frame.

The lucide item (`pill-toast-icons-lucide`, rendered from the exported registry file) is identical to the default at 0 pixels on every state with icons it was run on, because upstream's glyphs are Lucide's geometry. The Phosphor item changes the icon shapes by design (`enhance-icons-glyphs-lucide-phosphor.webp`: glyphs, Lucide, Phosphor).

## Deviations

- Merged into five files: `pill-toast.tsx` (the store, the toast API, the Toaster and the announcer), `pill-toast-view.tsx` (upstream's `sileo.tsx`), `pill-toast-core.ts` (`types.ts` and `constants.ts`), `pill-toast-styles.ts` (the stylesheet as a string) and `pill-toast-icons.tsx`. Upstream lines are unchanged apart from the renames and the Labs additions below, which are marked "Labs:".
- Renames (the names are the component's, and `toast` is shadcn's): `sileo` is `pillToast`, `Toaster` is `PillToaster`, `Sileo` is `PillToastCard`, the types are `PillToast*`; `data-sileo-*` is `data-pill-toast-*` (the card's own `data-sileo-toast` is `data-pill-toast-card`); `--sileo-*` and upstream's `--_h`, `--_pw`, `--_px`, `--_ht`, `--_co`, `--_c` are `--pill-toast-*`; the keyframes `sileo-spin`, `sileo-header-enter` and `-exit` are `pill-toast-*`, as the repository's keyframe guard requires; the gooey filter id is `pill-toast-gooey-<id>`.
- Motion is imported as `motion/react` at 14.1.0 (upstream declares `^12.34.0`); the dependency is `motion@>=12.34.0`. The two versions render the same frames (above).
- The stylesheet ships as a string the toaster renders in a React 19 hoisted `<style href precedence>` (upstream: `import "./styles.css"`). The six state colors are read from `--pill-toast-state-<state>` with upstream's values as fallbacks instead of being defined on `:root`, so an app can change them without fighting the cascade; no default changes.
- The SVG's `<title>sileo notification</title>` and the icons' `<title>` elements are gone (the glyphs and the canvas are `aria-hidden`).
- Labs: the root is a `div`, not a `<button>`, and the action is a `<button>`, not an `<a href="#">` (nested interactive controls); the description's `text-align: left` is `start`.
- `"use client"` is at the top of `pill-toast.tsx` (upstream puts it on its entry file).
- Upstream behavior kept: toasts are never removed on a click of the card (only by swipe, timer or `dismiss`); `position` is physical.

## Enhancements

Primitive `none` (decision 0095): the toast is an imperative store with its own timers, geometry and hover rules; Radix, Base UI and React Aria toasts own those and would replace the behavior being ported.

- Icons style: `pill-toast-icons-lucide` and `pill-toast-icons-phosphor` fill the six status slots from an icon library; the default draws upstream's glyphs (decision 0025).
- Live regions: a persistent polite (`role="status"`) and assertive (`role="alert"`, errors and warnings) pair, written on every toast and update with the title, the description (text extracted from a React node) and the action label; the toasts themselves are no longer live regions (upstream marked each viewport `aria-live="polite"`), so nothing is spoken twice. Measured: `Changes Saved. Changes saved successfully to the database. Please refresh the page to see the changes.` polite, the error assertive.
- Keyboard: a toast with a description is a focusable group named by its title; keyboard (`:focus-visible`) focus opens it and holds its timer as hover does, a Tab reaches the action button; Escape dismisses the focused toast, or the newest (`closeOnEscape`, default true). The focus ring follows the gooey silhouette (`enhance-keyboard-focus.webp`).
- Reduced motion: Motion's pill and card jump to their end shapes (`useReducedMotion`; CSS durations were already collapsed upstream). Measured on the card's height every 40 ms: spring 0, 0, 0, 0, 7, 14, 35, 54 against 0, 0, 0, 0, 40, 72, 72, 72 (two frames).
- Right to left: titles, badges and descriptions read right to left (`enhance-rtl.webp`); the pill stays on the physical `position`.
- Forced colors: shapes are Canvas filled and CanvasText stroked, the gooey filter is dropped, the keyboard ring is Highlight (`enhance-forced-colors.webp`).
- Contrast on request, measured on the rendered colors (WCAG ratio of the title or action text to the fill, the action over its 15% tint). Default (upstream's palette) on the white fill: success 2.28, loading 4.74, error 3.81, warning 1.91, info 2.71, action 3.76; on the `theme="dark"` fill #f2f2f2: 2.04, 4.24, 3.40, 1.71, 2.42, 3.36 (the description 3.91); on the `theme="light"` fill #1a1a1a: 7.63, 3.67, 4.57, 9.11, 6.43, 4.63 (the description 5.24). Under `prefers-contrast: more` every title and action is at least 5.14:1 on all three fills and the descriptions at least 12.80:1 (`enhance-contrast-more-*.webp`). A custom `fill` is not known to the stylesheet: set `--pill-toast-contrast-ink` (the color the states mix toward).
- axe (all tags up to WCAG 2.2 AA and best-practice) on the harness page with toasts open, light and dark, in the default, Lucide and Phosphor items, including a loading toast, right to left and a bottom-left error: no violation from the component; the only two (landmark-one-main, page-has-heading-one) are the bare harness page.

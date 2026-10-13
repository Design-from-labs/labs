# Slot Text: port fidelity

- Upstream: danielwh2/slot-text @ daa93fd34d39db981c9ecd9dc48118b6ec5dbb9e (`src`: the vanilla core and the React adapter, plus `style.css`)
- Harness: one Vite page per scene renders either upstream's source or the port's files, chosen by a query parameter, with the same markup, styles, fonts (the upstream demo's system stack, `600 16px ui-sans-serif, system-ui, sans-serif`) and state; React 19.3.0; Chromium (Playwright 1.64.0), device scale 1
- Diff: pixelmatch (S-152), threshold 0.1, anti-aliased pixels excluded; percent of all pixels in the frame
- Viewports: 1280x800 (desktop) and 375x812 (mobile)
- Target: at most 0.1%, or the upstream noise floor. Worst port frame: **0.0000%** (32 frames); noise floor (upstream against a second upstream load): **0.0000%** in every frame

## Scenes

- `basic`: upstream's playground (`examples/basic/index.html`, its styles verbatim): one Copy button whose label is `slotText(label, "Copy")` and `flash("Copied", { enter: { direction: "up", skipUnchanged: false, color: chromatic({ from: 190 }) }, exit: { direction: "down", ... } })` on click. Upstream links `style.css`; the port's `slotTextCss` string is added at the same place.
- `react`: upstream's React example (`examples/react.tsx`, the `CopyButton`: state plus a 1.4 s timeout) on the same page, rendering upstream's `SlotText` or the port's.

## Matched frames

Slot Text runs on `setTimeout` (per-letter stagger) and CSS transitions. A harness init script queues every `setTimeout` on a fake clock while a frame is being prepared, pauses each CSS transition the moment it is created (recording the fake time), and finally seeks every transition to (frame time minus its start). The button is clicked with `element.click()` (no hover state), the clock is stepped to the frame time (the React scene gets a real-time pause at 1,400 ms so React can render the revert), and `-settled` frames finish every animation. Frames: `rest`, `enter-60ms`, `-150ms`, `-300ms`, `enter-settled` (1 s), `revert-1550ms`, `revert-1700ms`, `revert-settled` (3 s).

## Upstream demo

The playground was built with upstream's own `npm run build` and served statically (`python3 -m http.server`, as the README says). Its frames are the `reference` column: the built demo against the harness's upstream-source page, also 0 pixels in every frame, so the harness reproduces the upstream demo exactly.

## Results

| Scene | Viewport | State | Port px | Port % | Noise px | Reference px |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| basic | desktop | rest | 0 | 0.0000% | 0 | 0 |
| basic | desktop | enter-60ms | 0 | 0.0000% | 0 | 0 |
| basic | desktop | enter-150ms | 0 | 0.0000% | 0 | 0 |
| basic | desktop | enter-300ms | 0 | 0.0000% | 0 | 0 |
| basic | desktop | enter-settled | 0 | 0.0000% | 0 | 0 |
| basic | desktop | revert-1550ms | 0 | 0.0000% | 0 | 0 |
| basic | desktop | revert-1700ms | 0 | 0.0000% | 0 | 0 |
| basic | desktop | revert-settled | 0 | 0.0000% | 0 | 0 |
| basic | mobile | rest | 0 | 0.0000% | 0 | 0 |
| basic | mobile | enter-60ms | 0 | 0.0000% | 0 | 0 |
| basic | mobile | enter-150ms | 0 | 0.0000% | 0 | 0 |
| basic | mobile | enter-300ms | 0 | 0.0000% | 0 | 0 |
| basic | mobile | enter-settled | 0 | 0.0000% | 0 | 0 |
| basic | mobile | revert-1550ms | 0 | 0.0000% | 0 | 0 |
| basic | mobile | revert-1700ms | 0 | 0.0000% | 0 | 0 |
| basic | mobile | revert-settled | 0 | 0.0000% | 0 | 0 |
| react | desktop | rest | 0 | 0.0000% | 0 | n/a |
| react | desktop | enter-60ms | 0 | 0.0000% | 0 | n/a |
| react | desktop | enter-150ms | 0 | 0.0000% | 0 | n/a |
| react | desktop | enter-300ms | 0 | 0.0000% | 0 | n/a |
| react | desktop | enter-settled | 0 | 0.0000% | 0 | n/a |
| react | desktop | revert-1550ms | 0 | 0.0000% | 0 | n/a |
| react | desktop | revert-1700ms | 0 | 0.0000% | 0 | n/a |
| react | desktop | revert-settled | 0 | 0.0000% | 0 | n/a |
| react | mobile | rest | 0 | 0.0000% | 0 | n/a |
| react | mobile | enter-60ms | 0 | 0.0000% | 0 | n/a |
| react | mobile | enter-150ms | 0 | 0.0000% | 0 | n/a |
| react | mobile | enter-300ms | 0 | 0.0000% | 0 | n/a |
| react | mobile | enter-settled | 0 | 0.0000% | 0 | n/a |
| react | mobile | revert-1550ms | 0 | 0.0000% | 0 | n/a |
| react | mobile | revert-1700ms | 0 | 0.0000% | 0 | n/a |
| react | mobile | revert-settled | 0 | 0.0000% | 0 | n/a |

## Evidence

`<scene>-<viewport>-<state>-before.webp` is upstream, `-after.webp` the port, `-diff.webp` the pixelmatch overlay (red: differing pixels; there are none).

## Deviations

- The core's modules are merged into two flat files: `slot-text-core` (`constants.ts`, `text.ts`, `timing.ts`, `dom.ts`) and `slot-text-engine` (`slotText.ts`, `index.ts`, and `style.css` as the exported string `slotTextCss`). Upstream lines are unchanged apart from the relative imports, with one exception: `dom.ts` declared `const { layout, width } = TUNING;` and `timing.ts` `const { animation, glyph, variation, width } = TUNING;`, which collide in one module, so the `dom.ts` part reads `const { layout } = TUNING;` and uses the same `TUNING.width` the timing part declares. `index.ts`'s re-export block is dropped (the declarations are in the same file).
- The stylesheet keeps upstream's global class names (`slot-text`, `char-slot`, `char-sizer`, `char-face`) so upstream styling recipes (`#label .char-face { color }`) still work. `SlotText` renders it as `<style href="designfrom-slot-text" precedence="default">` (decision 0013), which React 19 hoists to the start of `<head>`, where upstream's imported stylesheet would be: page styles still follow it.
- Labs additions in `SlotText`, none visible in a left-to-right page (the numbers above):
  - the first text is rendered by React as the settled slot markup (the same markup `renderCharacterSlots` writes), so the server render and a page before hydration show the label; upstream renders an empty span until its effect runs;
  - the span always carries the `slot-text` class (the engine adds it anyway; this keeps it when a changed `className` would drop it);
  - the animated span is `aria-hidden` and the text is kept once in a visually hidden span; upstream puts `aria-label={ariaLabel ?? text}` on a role-less span (ARIA 1.2 prohibits naming the generic role, so assistive technology may ignore it) and leaves both letter faces of a rolling cell readable;
  - `dir="auto"` on the span: the cells are flex items, so upstream lays Latin letters out right to left inside a right-to-left page;
  - `respectReducedMotion` (default true): under `prefers-reduced-motion: reduce` a change is shown at once with `buildSlotText` instead of rolling. The vanilla `slotText()` API is unchanged and does not check the preference (documented).
- Not ported: the Vue, Svelte and Solid adapters, the Remotion promo and its audio files. The library itself plays no sound.

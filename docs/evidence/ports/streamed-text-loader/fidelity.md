# Streamed Text Loader: port fidelity

- Upstream: kasturibuilds/generative-loaders @ 4d34499e850b5f062bc6b88283f211150a15c78d (packages/generative-loaders/src), `TextLoader`
- Harness: one Vite 7.3.1 page renders either upstream's source (with its `styles.css` imported) or the port's file, with the same props, stage, background and font; React 19.3.0, motion and framer-motion 14.1.0 (the same library); Chromium (Playwright 1.64.0), device scale 1
- Diff: pixelmatch (S-152) at threshold 0 (any color difference counts; at the usual 0.1 the low-contrast layers, such as 3 to 13% color mixes, fall under pixelmatch's cutoff), anti-aliased pixels excluded; percent of the cropped stage (the loader plus its padding), not of the whole page, so small loaders are measured strictly
- Viewports: 1280x800 (desktop) and 375x812 (mobile)
- Target: at most 0.1%. Worst port frame: **0.0000%** (desktop-decode-settled; 80 frames against upstream)

## Scene

`<StreamedTextLoader>` (upstream `<TextLoader>`) in a 560 px stage, 20 px, every one of the 16 variants. Motion's animations run on Playwright's clock: the page removes `Element.prototype.animate` so Motion uses its frame loop instead of the Web Animations API (both sides), installs the clock paused, and steps it in 16 ms ticks. `settled` renders the whole text on mount and runs 1.5 s; `mid-64ms` and `mid-160ms` render "The model is", settle, then append the rest of the sentence (`flushSync`) and capture 64 or 160 ms into the reveal. `skeleton-empty` is the CSS skeleton (empty text) with its animation paused at a matched time. Dark: #f5f5f5 on #0b0b0c. `reduced` emulates prefers-reduced-motion; `static` captures the port twice 500 ms apart under reduced motion (0 px = it really holds still). Mid-stream frames are the best of five captures, with 150 ms of real time after each text change (the clock stays paused) so React's effects start Motion on the same frame; upstream against itself still differed now and then by up to 2.3% on single captures at threshold 0. `right to left` renders the port in a `dir="rtl"` page against its left-to-right render (Latin text: expected identical) or, for the skeleton, against the mirrored render; mirrored comparisons are also given at threshold 0.1, because fractional positions round differently when mirrored. `arabic` streams Arabic text: it differs from upstream by design (it now reveals from the right; upstream revealed the end of each chunk first).

## Upstream demo

generative-loaders has no demo app in its repository (its site, generativeloaders.com, is maintained separately and is not in the pinned commit), so there is no upstream demo comparison; every frame comes from the harness.

## Results

| Against | Viewport | State | Crop | Differing pixels | Percent |
| --- | --- | --- | --- | ---: | ---: |
| upstream | desktop | desktop-decode-settled | 560x96 | 0 | 0.0000% |
| upstream | desktop | desktop-decode-mid-64ms | 560x96 | 0 | 0.0000% |
| upstream | desktop | desktop-decode-mid-160ms | 560x96 | 0 | 0.0000% |
| upstream | desktop | reduced-decode-settled | 560x96 | 0 | 0.0000% |
| upstream | desktop | desktop-typewriter-settled | 560x76 | 0 | 0.0000% |
| upstream | desktop | desktop-typewriter-mid-64ms | 560x76 | 0 | 0.0000% |
| upstream | desktop | desktop-typewriter-mid-160ms | 560x76 | 0 | 0.0000% |
| upstream | desktop | reduced-typewriter-settled | 560x76 | 0 | 0.0000% |
| upstream | desktop | desktop-skeleton-settled | 560x76 | 0 | 0.0000% |
| upstream | desktop | desktop-skeleton-mid-64ms | 560x76 | 0 | 0.0000% |
| upstream | desktop | desktop-skeleton-mid-160ms | 560x76 | 0 | 0.0000% |
| upstream | desktop | reduced-skeleton-settled | 560x76 | 0 | 0.0000% |
| upstream | desktop | desktop-cascade-settled | 560x76 | 0 | 0.0000% |
| upstream | desktop | desktop-cascade-mid-64ms | 560x76 | 0 | 0.0000% |
| upstream | desktop | desktop-cascade-mid-160ms | 560x76 | 0 | 0.0000% |
| upstream | desktop | reduced-cascade-settled | 560x76 | 0 | 0.0000% |
| upstream | desktop | desktop-focus-settled | 560x76 | 0 | 0.0000% |
| upstream | desktop | desktop-focus-mid-64ms | 560x76 | 0 | 0.0000% |
| upstream | desktop | desktop-focus-mid-160ms | 560x76 | 0 | 0.0000% |
| upstream | desktop | reduced-focus-settled | 560x76 | 0 | 0.0000% |
| upstream | desktop | desktop-wipe-settled | 560x76 | 0 | 0.0000% |
| upstream | desktop | desktop-wipe-mid-64ms | 560x76 | 0 | 0.0000% |
| upstream | desktop | desktop-wipe-mid-160ms | 560x76 | 0 | 0.0000% |
| upstream | desktop | reduced-wipe-settled | 560x76 | 0 | 0.0000% |
| upstream | desktop | desktop-flip-settled | 560x76 | 0 | 0.0000% |
| upstream | desktop | desktop-flip-mid-64ms | 560x76 | 0 | 0.0000% |
| upstream | desktop | desktop-flip-mid-160ms | 560x76 | 0 | 0.0000% |
| upstream | desktop | reduced-flip-settled | 560x76 | 0 | 0.0000% |
| upstream | desktop | desktop-redact-settled | 560x76 | 0 | 0.0000% |
| upstream | desktop | desktop-redact-mid-64ms | 560x76 | 0 | 0.0000% |
| upstream | desktop | desktop-redact-mid-160ms | 560x76 | 0 | 0.0000% |
| upstream | desktop | reduced-redact-settled | 560x76 | 0 | 0.0000% |
| upstream | desktop | desktop-line-settled | 560x76 | 0 | 0.0000% |
| upstream | desktop | desktop-line-mid-64ms | 560x76 | 0 | 0.0000% |
| upstream | desktop | desktop-line-mid-160ms | 560x76 | 0 | 0.0000% |
| upstream | desktop | reduced-line-settled | 560x76 | 0 | 0.0000% |
| upstream | desktop | desktop-terminal-settled | 560x96 | 0 | 0.0000% |
| upstream | desktop | desktop-terminal-mid-64ms | 560x96 | 0 | 0.0000% |
| upstream | desktop | desktop-terminal-mid-160ms | 560x96 | 0 | 0.0000% |
| upstream | desktop | reduced-terminal-settled | 560x96 | 0 | 0.0000% |
| upstream | desktop | desktop-wave-settled | 560x76 | 0 | 0.0000% |
| upstream | desktop | desktop-wave-mid-64ms | 560x76 | 0 | 0.0000% |
| upstream | desktop | desktop-wave-mid-160ms | 560x76 | 0 | 0.0000% |
| upstream | desktop | reduced-wave-settled | 560x76 | 0 | 0.0000% |
| upstream | desktop | desktop-dissolve-settled | 560x76 | 0 | 0.0000% |
| upstream | desktop | desktop-dissolve-mid-64ms | 560x76 | 0 | 0.0000% |
| upstream | desktop | desktop-dissolve-mid-160ms | 560x76 | 0 | 0.0000% |
| upstream | desktop | reduced-dissolve-settled | 560x76 | 0 | 0.0000% |
| upstream | desktop | desktop-slice-settled | 560x76 | 0 | 0.0000% |
| upstream | desktop | desktop-slice-mid-64ms | 560x76 | 0 | 0.0000% |
| upstream | desktop | desktop-slice-mid-160ms | 560x76 | 0 | 0.0000% |
| upstream | desktop | reduced-slice-settled | 560x76 | 0 | 0.0000% |
| upstream | desktop | desktop-tracking-settled | 560x76 | 0 | 0.0000% |
| upstream | desktop | desktop-tracking-mid-64ms | 560x76 | 0 | 0.0000% |
| upstream | desktop | desktop-tracking-mid-160ms | 560x76 | 0 | 0.0000% |
| upstream | desktop | reduced-tracking-settled | 560x76 | 0 | 0.0000% |
| upstream | desktop | desktop-coalesce-settled | 560x76 | 0 | 0.0000% |
| upstream | desktop | desktop-coalesce-mid-64ms | 560x76 | 0 | 0.0000% |
| upstream | desktop | desktop-coalesce-mid-160ms | 560x76 | 0 | 0.0000% |
| upstream | desktop | reduced-coalesce-settled | 560x76 | 0 | 0.0000% |
| upstream | desktop | desktop-fragments-settled | 560x76 | 0 | 0.0000% |
| upstream | desktop | desktop-fragments-mid-64ms | 560x76 | 0 | 0.0000% |
| upstream | desktop | desktop-fragments-mid-160ms | 560x76 | 0 | 0.0000% |
| upstream | desktop | reduced-fragments-settled | 560x76 | 0 | 0.0000% |
| upstream | desktop | desktop-skeleton-empty-500ms | 560x106 | 0 | 0.0000% |
| upstream | desktop | desktop-skeleton-empty-1100ms | 560x106 | 0 | 0.0000% |
| upstream | mobile | mobile-focus-settled | 343x94 | 0 | 0.0000% |
| upstream | mobile | mobile-decode-settled | 343x120 | 0 | 0.0000% |
| upstream | mobile | mobile-terminal-settled | 343x120 | 0 | 0.0000% |
| upstream | mobile | mobile-typewriter-settled | 343x94 | 0 | 0.0000% |
| upstream | mobile | mobile-wipe-mid-64ms | 343x94 | 0 | 0.0000% |
| upstream | mobile | mobile-dissolve-mid-64ms | 343x94 | 0 | 0.0000% |
| upstream | mobile | mobile-fragments-mid-64ms | 343x94 | 0 | 0.0000% |
| upstream | mobile | mobile-skeleton-empty-500ms | 343x106 | 0 | 0.0000% |
| upstream | desktop | dark-focus-settled | 560x76 | 0 | 0.0000% |
| upstream | desktop | dark-typewriter-settled | 560x76 | 0 | 0.0000% |
| upstream | desktop | dark-redact-settled | 560x76 | 0 | 0.0000% |
| upstream | desktop | dark-cascade-mid-64ms | 560x76 | 0 | 0.0000% |
| upstream | desktop | dark-slice-mid-64ms | 560x76 | 0 | 0.0000% |
| upstream | desktop | paused-typewriter | 560x76 | 0 | 0.0000% |
| static check (port, 500 ms apart) | desktop | reduced-static-typewriter | 560x76 | 0 | 0.0000% |
| static check (port, 500 ms apart) | desktop | reduced-static-skeleton | 560x106 | 0 | 0.0000% |
| static check (port, 500 ms apart) | desktop | reduced-static-dissolve | 560x76 | 0 | 0.0000% |
| right to left (port) | desktop | rtl-focus-settled | 560x76 | 0 | 0.0000% |
| right to left (port) | desktop | rtl-terminal-settled | 560x96 | 0 | 0.0000% |
| right to left (port) | desktop | rtl-typewriter-settled | 560x76 | 0 | 0.0000% |
| right to left (port) | desktop | rtl-wipe-mid-64ms | 560x76 | 0 | 0.0000% |
| right to left (port) | desktop | rtl-focus-settled (threshold 0.1) | 560x76 | 0 | 0.0000% |
| right to left (port) | desktop | rtl-terminal-settled (threshold 0.1) | 560x96 | 0 | 0.0000% |
| right to left (port) | desktop | rtl-typewriter-settled (threshold 0.1) | 560x76 | 0 | 0.0000% |
| right to left (port) | desktop | rtl-wipe-mid-64ms (threshold 0.1) | 560x76 | 0 | 0.0000% |
| right to left (port) | desktop | rtl-skeleton-empty-500ms-mirrored | 512x58 | 228 | 0.7678% |
| right to left (port) | desktop | rtl-wipe-first-chunk-96ms | 560x76 | 5 | 0.0117% |
| right to left (port) | desktop | rtl-skeleton-empty-500ms-mirrored (threshold 0.1) | 512x58 | 0 | 0.0000% |
| right to left (port) | desktop | rtl-wipe-first-chunk-96ms (threshold 0.1) | 560x76 | 5 | 0.0117% |
| upstream (Labs change: Arabic text wipes in from the right) | desktop | arabic-wipe-mid-96ms | 560x76 | 1468 | 3.4492% |
| upstream (Labs change: Arabic text wipes in from the right) | desktop | arabic-wipe-mid-200ms | 560x76 | 1695 | 3.9826% |
| upstream (Labs change: the sweep mirrors the left-to-right one) | desktop | arabic-rtl-page-skeleton-empty-500ms | 560x106 | 2945 | 4.9613% |
| upstream in right to left (control) | desktop | upstream-rtl-text-focus-settled | 560x76 | 2500 | 5.8741% |
| upstream in right to left (control) | desktop | upstream-rtl-text-focus-settled (threshold 0.1) | 560x76 | 2298 | 5.3994% |

Before the Labs enhancements (the plain port: renames and the hoisted style only), the same 80 frames measured a worst of 0.1151% at pixelmatch threshold 0.1 (desktop-fragments-mid-160ms, harness timing noise). The table above is after the enhancements, at threshold 0, so the default look is unchanged.

## Evidence

`<state>-before.webp` is upstream, `-after.webp` the port, `-diff.webp` the pixelmatch overlay (red: differing pixels), for a representative subset of the frames above. `arabic-wipe-mid-96ms` is a deliberate change: upstream (before) reveals the end of the Arabic chunk first, the port (after) wipes it in from the right.

## Deviations

- Split out of upstream's shared `components.tsx`, `types.ts` and `styles.css`: the shared helpers and `TextLoader`, its types, and styles.css lines 1-201 plus the reduced-motion block for its prefix, in one file. Upstream lines are unchanged apart from the items below.
- Renamed for the registry's flat namespace: `TextLoader` to `StreamedTextLoader`, `TextLoaderProps` to `StreamedTextLoaderProps`, `TextLoaderVariant` to `StreamedTextLoaderVariant`.
- `framer-motion` is imported as `motion/react` (the same library under its current name; dependency `motion@>=12.34.0`).
- The stylesheet ships as a string rendered with `<style href="designfrom-streamed-text-loader" precedence="default">` (decision 0013), instead of upstream's `generative-loaders/styles.css` import: React 19 hoists it into `<head>` once, and server rendering emits it with the markup.
- Custom properties and keyframes carry the component name (the repository's keyframe guard): `--tl-color`, `--tl-ink`, `--tl-muted`, `--tl-font` to `--streamed-text-loader-color`, `-ink`, `-muted`, `-font` (in `:root` and in the inline `color`), and `@keyframes tl-shimmer` to `streamed-text-loader-shimmer`. Class names keep upstream's `tl-` prefix.
- Logical properties, identical left to right (measured above): `.tl-cursor` and `.tl-terminal-cursor` `margin-left` to `margin-inline-start`, `.tl-terminal>b` `margin-right` to `margin-inline-end`.
- Labs addition: a `dir` prop, default `"auto"`, on the root. Upstream builds words from per-character inline-block spans, so in a `dir="rtl"` page Latin words came out in reverse order (control row: upstream right to left against itself left to right; P-036). With `dir="auto"` the text's own direction applies; left-to-right pages are unchanged. While there is no letter yet (the empty skeleton) the attribute is left off, so the skeleton follows the page as upstream does (the browser resolves `auto` with nothing to read to left to right).
- Labs addition: right-to-left text reveals in its reading direction. The direction comes from the text's first letter (as `dir="auto"` does), or from the page while there is no letter, read in a layout effect. Then `wipe` runs from `inset(0 0% 0 100%)` to `inset(0 0% 0 0%)` (both values in the same units, which Motion needs to interpolate a clip path: a first attempt that kept upstream's end value `inset(0 0% 0 0)` held the chunk fully clipped until the last frame), `line` starts from `inset(0 0 0 100%)` and x +3, and under `:dir(rtl)` the skeleton sweep is mirrored (`scale: -1 1`) and the redaction bar shrinks toward the left. None of this applies left to right (all left-to-right rows are 0 px).
- Labs addition (screen readers): the root stays `role="status"` with `aria-live="polite"` and upstream's `aria-label`, and now also carries the received text as visually hidden content (the standard clip pattern), because live regions announce content changes, not label changes. The animated layer stays `aria-hidden`.
- Reduced motion: upstream's own handling (no Motion reveals; CSS animations reduced to one 0.01 ms iteration) already lands on a static frame; the `static` rows confirm it. Kept as is.
- Tokens: upstream's palette (`#111111` text) is the default; `color="currentColor"` follows a theme. No shared tokens.

# Split Text: port fidelity

- Upstream: dimicx/griffo @ 79689ab086a4628eb449b54b721e9872b5e98ab1 (`src/core`, the `src/internal` modules they use, `src/motion`)
- Harness: one Vite page renders upstream's source or the port's files through aliases, with the same text, fonts, options and state; React 19.3.0, motion 14.1.0; Chromium (Playwright 1.64.0), device scale 1
- Fonts: Instrument Serif and Figtree (OFL, the site's own `@fontsource` files), the same on both sides
- Diff: pixelmatch (S-152), threshold 0.1, anti-aliased pixels excluded; percent of all pixels in the frame
- Viewports: 1280x800 (desktop) and 375x812 (mobile)
- Target: at most 0.1%, or the upstream noise floor. Worst port frame: **0.0412%** (20 frames); worst noise floor 0.0447%

## Scenes

- **Kerning**: three blocks with kerning-heavy pairs (`WAVE AVATAR Type` in Instrument Serif at 88px, `Yesterday, LT Avenue` in Figtree 600 at 56px, a wrapped Figtree paragraph with `<em>` and `<strong>`), split with `type: "chars,words,lines"`, `mask: "lines"`, by the core `splitText()` and by the Motion `<SplitText>` with no animation.
- **Reveal**: `<SplitText>` with the per-line staggered character reveal from upstream's README (`hidden` / `visible` variants, `stagger(0.02, { startDelay: lineIndex * 0.15 })`, line masks) on a two-line Instrument Serif headline.

Mid-reveal frames are matched on Playwright's fake clock: the page runs with `Element.prototype.animate` removed on both sides (`?waapi=off`), so Motion drives every value from its own frame loop, which the clock controls; the clock is paused until the split is ready and React has settled, then advanced by the same time on both sides. The end frame is also taken in real time with Motion's hardware-accelerated (WAAPI) path.

## Upstream demo

Griffo's own page is its end-to-end fixture, `e2e/test-page.html`, which imports the built `dist/index.js`. The harness serves it unchanged with that import resolved to upstream's `src/index.ts`. Splitting its kerning, lines and nested-element samples (system serif and sans-serif, so not committed) changes 4 pixels (0.0004%) against the unsplit page, the same behaviour the shared harness measures with the site's fonts.

## Results

| Against | Viewport | State | Differing pixels | Percent |
| --- | --- | --- | ---: | ---: |
| upstream | desktop | kerning, core `splitText()` | 0 | 0.0000% |
| upstream | mobile | kerning, core `splitText()` | 0 | 0.0000% |
| upstream | desktop | kerning, Motion `<SplitText>` | 0 | 0.0000% |
| upstream | mobile | kerning, Motion `<SplitText>` | 0 | 0.0000% |
| upstream | desktop | reveal at 0 ms (initial variant) | 0 | 0.0000% |
| upstream | desktop | reveal at 200 ms | 7 | 0.0007% |
| upstream | desktop | reveal at 450 ms | 422 | 0.0412% |
| upstream | desktop | reveal at 800 ms | 13 | 0.0013% |
| upstream | desktop | reveal at 3000 ms (end) | 0 | 0.0000% |
| upstream | mobile | reveal at 0 ms | 0 | 0.0000% |
| upstream | mobile | reveal at 200 ms | 12 | 0.0039% |
| upstream | mobile | reveal at 450 ms | 17 | 0.0056% |
| upstream | mobile | reveal at 800 ms | 55 | 0.0181% |
| upstream | mobile | reveal at 3000 ms (end) | 0 | 0.0000% |
| upstream | desktop | reveal end, real time, WAAPI | 0 | 0.0000% |
| upstream | mobile | reveal end, real time, WAAPI | 0 | 0.0000% |
| upstream end | desktop | port under reduced motion at 50 ms | 0 | 0.0000% |
| upstream end | mobile | port under reduced motion at 50 ms | 0 | 0.0000% |

Noise floor (upstream against a second upstream load): kerning 0.0000% on both viewports; reveal at 200, 450 and 800 ms 0.0024%, 0.0080% and 0.0013% (desktop) and 0.0440%, 0.0000% and 0.0447% (mobile). The mid-reveal differences move from run to run in both directions (an earlier run without the settle step measured the port at 0.009% to 0.066% and the noise at up to 0.037%); every port frame stays below 0.1%.

### Kerning compensation

The point of the component: a character split must look like the unsplit text.

| Compared | Viewport | Differing pixels | Percent |
| --- | --- | ---: | ---: |
| unsplit vs port split (Motion) | desktop | 17 | 0.0017% |
| unsplit vs port split (Motion) | mobile | 24 | 0.0079% |
| unsplit vs upstream split (Motion) | desktop | 17 | 0.0017% |
| unsplit vs upstream split (Motion) | mobile | 24 | 0.0079% |
| unsplit vs upstream split with `disableKerning` | desktop | 19,820 | 1.9355% |
| unsplit vs upstream split with `disableKerning` | mobile | 15,903 | 5.2227% |

The port reproduces upstream's compensation exactly (same pixels, same count); the remaining pixels are isolated anti-aliasing at sub-pixel glyph offsets. Without compensation the same split moves whole words (the `-uncompensated-diff` frame).

## Evidence

`<frame>-before.webp` is upstream (or the unsplit text where named), `-after.webp` the port, `-diff.webp` the pixelmatch overlay (red: differing pixels). Frames are cropped to the text.

- `kerning-motion-1280x800-*`: upstream and port `<SplitText>`, same split
- `kerning-unsplit-vs-port-1280x800-*`, `kerning-unsplit-vs-port-375x812-*`: unsplit text and the port's split
- `kerning-unsplit-vs-uncompensated-1280x800-*`: unsplit text and a split without compensation, for scale
- `reveal-450ms-1280x800-*`, `reveal-450ms-375x812-*`: mid-stagger

## Scope

- Ported: the core splitter (`splitText`, `splitTextData`, `normalizeToPromise`) with the internal modules it and the Motion component use (kerning upkeep, auto-split resize, line fingerprint, initial styles, viewport observer, font wait), and the Motion `SplitText`.
- Left out: upstream's plain React `SplitText` (`src/react`) is a subset of the Motion component (the same callbacks, `options`, `autoSplit`, `viewport`, `initialStyles` and `revertOnComplete`), and the item already depends on `motion`, so it would add a second component with the same name and no capability. `MorphText` (`src/morph`) is a text morph, which this batch and the gallery already cover (Text Morph, Calligraph); it would also need `splitIdentity`. `createSplitClones` (`src/helpers`) is a separate helper entry. All three remain available upstream.
- GSAP: no runtime or demo path imports GSAP. The word appears only in comments, a type comment for thenable animations, upstream's tests and its package keywords; nothing needed rewriting.

## Deviations

- Files are flat in one folder, renamed `split-text*.ts(x)`: `motion/SplitText.tsx` is `split-text.tsx`, `core/splitText.ts` is `split-text-core.ts`, and `internal/<name>.ts` is `split-text-<kebab-name>.ts`. Flat, upstream's `splitText.ts` and `SplitText.tsx` would differ only in case and collide on case-insensitive file systems. Only relative import paths changed; `internal/splitTextShared.ts` (a two-line re-export of the core) is dropped and its import points at the core.
- The core's `SplitTextOptions` interface is `CoreSplitTextOptions`, the name upstream's `griffo/motion` entry already exports it under, so it does not collide with the Motion component's `SplitTextOptions` in the npm library's barrel (pitfall P-040).
- `"use client"` is added to `split-text.tsx`; four React types (`ReactElement`, `ReactNode`, `ForwardedRef`, `RefAttributes`) are imported with `type`, as this repository's `verbatimModuleSyntax` requires (P-065).
- Two `@ts-expect-error` comments in `split-text-kerning-upkeep.ts` move down one line, onto the property access TypeScript 6 reports, so the file typechecks under the site's strict config.
- Labs addition: `reducedMotion` defaults to `"user"`, so a visitor who prefers reduced motion gets the animate variant's end state at once (measured: 0 pixels against upstream's end frame). Upstream leaves it unset and animates.
- Labs addition: the wrapper gets `dir="auto"` (a `dir` prop overrides it). The split parts are inline blocks, which the page direction reorders: upstream reads `yreve :tes sa denrek ,epyT RATAVA EVAW` for Latin text in a right-to-left page; the port keeps the letter and word order. Left-to-right pages are unchanged (the numbers above).
- Not a deviation: while a character is still rising, its line mask clips descenders (upstream behaviour); at rest they show.

## Alternatives considered: kugiri

kugiri by Edoardo Lunardi (S-383, MIT, `src/index.ts` @ 9274367572a5bf2d218e119eb4f92907763643a4) splits text into the lines the browser painted, read with `Range.getClientRects()`, and the words and graphemes inside them. Measured in the same harness:

| | Griffo | kugiri |
| --- | --- | --- |
| Character kerning (unsplit vs split, desktop / mobile) | margin compensation: 0.0017% / 0.0079% (1.94% / 5.22% without it) | each grapheme box keeps its painted extent: 0.0001% / 0.0003% |
| Lines | words are wrapped at spaces and dashes, then grouped by their tops | read off the paint before anything is wrapped |
| `hyphens: auto` paragraph, 260px, 4 painted lines | 5 lines, 25% taller (0.20% / 0.66%) | 4 lines (0.0004% / 0.0013%) |
| Japanese paragraph, 5 painted lines | 1 line, 1 word | 5 lines |
| Long URL with `overflow-wrap: anywhere`, 5 painted lines | 4 lines (0.31% / 1.03%) | 5 lines (0.024% / 0.081%) |
| `text-wrap: balance`, 2 lines | 2 lines | 2 lines |
| Latin text in a right-to-left page | letters reversed (the port fixes it with `dir="auto"`) | letters reversed and spaces lost |
| Nested inline elements | kept, with attributes | cloned per line, with attributes |
| Screen readers | `aria-label` or a hidden copy; units `aria-hidden` | left to the caller |
| Resize | `autoSplit`, debounced | left to the caller (a README recipe) |
| Animation | Motion component: variants, viewport, scroll, hover, tap, focus, presence | none; the caller animates |
| Size (esbuild, minified + gzip, React and Motion external) | core 7.9 kB, with the Motion component 15.3 kB | 7.4 kB |
| Dependencies | none (core); `motion` for the component | none |
| Tests | 15 Vitest files (5,915 lines) and 3 Playwright specs | 1 Playwright spec over 55 demo cases in Chromium, WebKit and Firefox |
| Pinned commit | 2026-06-28 (v1.1.1) | 2026-09-16 (v0.5.3) |

Griffo is the better animation component (kerning-compensated character staggers, Motion variants, accessibility and resize built in), so it is this item. kugiri does what Griffo cannot: lines exactly as painted for hyphenated text, scripts without spaces and long unbroken strings, which Griffo re-wraps (a visible layout shift). That is real value beyond Griffo, so it is ported separately as Split Lines (`split-lines`), with a Labs wrapper that adds what it leaves to the caller (screen reader text, resize re-split, `dir="auto"`); see `docs/evidence/ports/split-lines/fidelity.md`.

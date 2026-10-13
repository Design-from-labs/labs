# Calligraph: port fidelity

- Upstream: raphaelsalaja/calligraph @ c99497a440e280e8471f084db1173197ba0e255c (`packages/calligraph/src`)
- Harness: one Vite page renders the upstream site's demo (`apps/web/components/demo` and `components/features`, with their own CSS modules and `styles/index.css`) using either upstream's source or the port's files, chosen by a query parameter; React 19.3.0, motion 14.1.0 on both sides (upstream is tested against ^12); Figtree (OFL, the site's font) as `--font-sans` on both sides instead of upstream's site font; Chromium (Playwright 1.64.0), device scale 1
- Diff: pixelmatch (S-152), threshold 0.1, anti-aliased pixels excluded; percent of all pixels in the frame
- Viewports: 1280x800 (desktop) and 375x812 (mobile)
- Target: at most 0.1%, or the upstream noise floor. Worst port frame: **0.0207%** (16 frames); worst noise floor (upstream against a second upstream load): **0.0184%**

## Scene

The hero (`variant="text"`, 48px/700) and the three feature cards (text; `variant="number"` with a USD price; `variant="slots"` with a USD count), all driven by one index: "Calligraph" / $35.99 / $1,204.00, then "Craft" / $24.89 / $387.00, "Creative" / $17.38 / $52.00 and "Create" / $3.15 / $9,631.00. The upstream cycling timers are replaced by `window.__next()`.

## Matched frames

Motion animates on `requestAnimationFrame` and `performance.now`, Calligraph's `AutoSizeWrapper` reacts to a `ResizeObserver`, and React renders in real-time tasks, so a fake clock alone was not reproducible (up to 0.19% between two upstream loads). The harness's init script, on both sides:

- runs timers, `requestAnimationFrame`, `performance.now` and `Date.now` on a fake clock that moves only in 16 ms animation frames;
- gives the page a fixed number of real task turns after each frame, so React's renders land between the same two frames on every load;
- checks the `ResizeObserver` once per fake frame;
- removes `Element.prototype.animate`, so Motion takes its JavaScript path for every value (its WAAPI path would run on the real document timeline).

What remains is sub-pixel text anti-aliasing at a few glyph edges, which also differs between two upstream loads (the noise column). Frames: `rest-0`; the first change at 64, 144 and 256 ms and settled (2 s); the third change (after two settled changes) at 96 and 224 ms and settled.

## Upstream demo

The upstream site (`apps/web`, Next.js 16, `next dev`) was run from the same commit for the reference screenshot. Its layout (header, install and usage sections) and its bundled site font differ from the harness, so it is a visual reference only; the numbers come from the shared harness above.

## Results

| Viewport | State | Port px | Port % | Noise px | Noise % |
| --- | --- | ---: | ---: | ---: | ---: |
| desktop | rest-0 | 0 | 0.0000% | 0 | 0.0000% |
| desktop | to-1-64ms | 0 | 0.0000% | 0 | 0.0000% |
| desktop | to-1-144ms | 0 | 0.0000% | 0 | 0.0000% |
| desktop | to-1-256ms | 0 | 0.0000% | 6 | 0.0006% |
| desktop | to-1-settled | 0 | 0.0000% | 0 | 0.0000% |
| desktop | to-3-96ms | 21 | 0.0021% | 11 | 0.0011% |
| desktop | to-3-224ms | 15 | 0.0015% | 0 | 0.0000% |
| desktop | to-3-settled | 0 | 0.0000% | 0 | 0.0000% |
| mobile | rest-0 | 0 | 0.0000% | 0 | 0.0000% |
| mobile | to-1-64ms | 3 | 0.0010% | 0 | 0.0000% |
| mobile | to-1-144ms | 17 | 0.0056% | 14 | 0.0046% |
| mobile | to-1-256ms | 0 | 0.0000% | 0 | 0.0000% |
| mobile | to-1-settled | 0 | 0.0000% | 0 | 0.0000% |
| mobile | to-3-96ms | 63 | 0.0207% | 56 | 0.0184% |
| mobile | to-3-224ms | 61 | 0.0200% | 0 | 0.0000% |
| mobile | to-3-settled | 0 | 0.0000% | 0 | 0.0000% |

Every rest and settled frame is 0 pixels. Earlier runs of the same harness put the upstream noise at up to 0.0051% (desktop `to-3-224ms`) and the port at 0.0000% there, so the remaining mid-animation differences are run-to-run anti-aliasing, not the port.

## Evidence

`page-<viewport>-<state>-before.webp` is upstream, `-after.webp` the port, `-diff.webp` the pixelmatch overlay (red: differing pixels).

## Deviations

- The six modules are merged into three flat files: `calligraph` (`index.tsx`), `calligraph-renderers` (`text.tsx`, `number.tsx`, `slots.tsx`) and `calligraph-core` (`shared.ts`, `reconcile.ts`). Upstream lines are unchanged apart from the imports.
- Labs additions, none visible in a left-to-right page with motion allowed (the numbers above):
  - the value is kept once in a visually hidden span (`sr-only`) inside the wrapper, and the glyphs upstream left exposed (the number variant's prefix, the slots variant's prefix and separators) are `aria-hidden` like the rest; upstream hides every letter of the text variant, so it had no accessible text at all;
  - `dir="auto"` on the wrapper for the text variant and `dir="ltr"` for number and slots: the glyphs are flex items, so upstream reverses Latin letters and digits inside a right-to-left page;
  - `respectReducedMotion` (default true): under `prefers-reduced-motion: reduce` every transition is `{ duration: 0 }`, the per-digit stagger is 0, the tree is wrapped in `MotionConfig reducedMotion="always"`, and `NumberRenderer` takes an `instant` prop because its digits' own `transition: { delay }` replaces the MotionConfig transition (measured: without it the old digits jumped and faded over about 0.2 s). Under reduced motion each change is shown at once.
- `motion` is listed as `motion@>=11`, upstream's peer range.

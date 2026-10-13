# Split Lines: port fidelity

- Upstream: edoardolunardi/kugiri @ 9274367572a5bf2d218e119eb4f92907763643a4 (`src/index.ts`, the whole library)
- Harness: the Split Text harness page (one Vite page, upstream source or the port's files through aliases, same text, fonts, options and state); React 19.3.0; Chromium (Playwright 1.64.0), device scale 1
- Fonts: Figtree and Instrument Serif (OFL, the site's own `@fontsource` files); the Japanese sample uses the system sans-serif, the same on both sides. Upstream's demo fonts (Geist, OFL) are not shipped.
- Diff: pixelmatch (S-152), threshold 0.1, anti-aliased pixels excluded; percent of all pixels in the frame
- Viewports: 1280x800 (desktop) and 375x812 (mobile)
- Target: at most 0.1%. Worst port frame against upstream: **0.0000%** (18 frames, plus upstream's own demo)

## The splitter

`split-lines-core.ts` is upstream's `src/index.ts` byte for byte (`cmp`); it is not linted or reformatted. `split-lines.tsx` is a Labs wrapper, written for this port.

## Upstream demo

kugiri's demo page is its test suite: 55 cases, each split as it scrolls into view, and **Check lines** compares every split with the lines the browser painted before it, text and geometry. The harness served that page from the pinned commit twice, once importing upstream's `src/index.ts` and once the port's `split-lines-core.ts` (Lenis, the page's smooth scrolling, replaced by native scrolling on both). Upstream: 55 of 55 cases as painted. Port: 55 of 55. The top of the page, upstream against port: 0 pixels.

## Scenes

- **Kerning**: the Split Text kerning scene (three blocks of kerning-heavy pairs), split into lines, words and characters with line masks.
- **Lines**: a 260px Figtree paragraph with `hyphens: auto`; a Japanese paragraph (no spaces); a long URL under `overflow-wrap: anywhere`; a 420px paragraph under `text-wrap: balance`; and a Latin paragraph in a right-to-left page. Each is split into lines, words and characters directly with `splitText()` (upstream and port) and through the Labs `<SplitLines>`.

## Results

| Against | Viewport | Scene | Percent |
| --- | --- | --- | ---: |
| upstream `splitText()` | desktop, mobile | kerning | 0.0000%, 0.0000% |
| upstream `splitText()` | desktop, mobile | hyphens, Japanese, URL, balance | 0.0000% each |
| upstream `splitText()` vs Labs `<SplitLines>` | desktop, mobile | hyphens, Japanese, URL, balance | 0.0000% each |

Noise floor (upstream against a second upstream load): 0.0000% on both viewports.

### Against the unsplit text

What the component is for: the split must look like the text before it.

| Scene | Painted lines | Port lines | Desktop | Mobile |
| --- | ---: | ---: | ---: | ---: |
| kerning (character split) | 1 / 3 | 1 / 3 | 0.0001% | 0.0003% |
| `hyphens: auto` | 4 | 4 | 0.0004% | 0.0013% |
| Japanese | 5 | 5 | 0.0039% | 0.0131% |
| URL, `overflow-wrap: anywhere` | 5 | 5 | 0.0239% | 0.0805% |
| `text-wrap: balance` | 2 | 2 | 0.0000% | 0.0000% |
| Latin, left-to-right page | 2 | 2 | 0.0000% | 0.0000% |

The URL's pixels are sub-pixel glyph shifts inside the fragments the browser broke (upstream's own result, 0.0000% against the port); every line break is where it was painted. For comparison, Griffo's splitter (Split Text) on the same scenes: 5 lines for the 4 hyphenated ones (0.66% on mobile), 1 line for the 5 Japanese ones, 4 for the 5 URL lines (1.03%).

## Evidence

`<frame>-before.webp` is the reference (unsplit text, or upstream where named), `-after.webp` the port through `<SplitLines>`, `-diff.webp` the pixelmatch overlay (red: differing pixels). Mobile frames, cropped to the text.

- `hyphens-unsplit-vs-port-375x812-*`: the hyphenated paragraph, four lines before and after
- `hyphens-unsplit-vs-griffo-375x812-*`: the same paragraph split by Griffo, for contrast (five lines)
- `cjk-upstream-vs-port-375x812-*`: the Japanese paragraph, upstream against the port
- `url-unsplit-vs-port-375x812-*`: the broken URL

## Deviations

None in the splitter. The Labs wrapper adds what kugiri's README leaves to the caller:

- `<SplitLines>` renders the element, waits for `document.fonts.ready`, splits it, hands the units to `onSplit`, and reverts on unmount.
- Resize: it splits again when the element's width changes (a `ResizeObserver` and one split per frame, the README's recipe), with `info.resplit` so a reveal does not replay; `resplit={false}` turns it off.
- Screen readers: with word or character units and nothing focusable inside, the lines are `aria-hidden` and the text is kept once in a visually hidden copy, so it is read as words, not unit by unit (upstream leaves this to the caller and says so). A line-only split, or text with links, is left as it reads. The wrapper's frames above are 0.0000% against upstream, so this changes nothing visible.
- `dir="auto"` by default. In a right-to-left page, upstream (like every splitter that boxes words and characters) reverses Latin letters and loses the spaces between words; with `dir="auto"` the Latin paragraph keeps its order and right-to-left text keeps its own direction. A `dir` prop overrides it.
- Reduced motion: the splitter never animates; the demo's reveal and its replay are skipped when the visitor prefers reduced motion, and the docs ask the same of `onSplit`.

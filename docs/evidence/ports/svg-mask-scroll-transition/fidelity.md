# svg-mask-scroll-transition: fidelity

- Upstream: [Hiro-kiii/Scroll-Transition](https://github.com/Hiro-kiii/Scroll-Transition/tree/6bb67c598f767a014ac595c904d85b86119670ee) `js/script.js` (horizontal blinds), `script2.js` (random grid), `script3.js` (vertical blinds), `script4.js` (column grid) and `css/style.css` at `6bb67c598f767a014ac595c904d85b86119670ee` (MIT, copyright 2009 - 2025 Codrops; S-262), with the GSAP 3.12.7, ScrollTrigger 3.12.7 and Lenis builds it vendors
- Port: `ports/hiro-kiii-scroll-transition/svg-mask-scroll-transition`, exported to `content/components/hiro-kiii-scroll-transition/svg-mask-scroll-transition` (item `svg-mask-scroll-transition`, primitive none, no icons; one item, the four patterns as the `pattern` prop)
- Renderer: Chromium (Playwright S-014), device scale 1, 1280x800 and 375x812.
- Method: the four upstream pages are served as files from a copy with their ten photos replaced by generated images (the same files on both sides; the photos are not redistributable) and the Codrops frame hidden. The port renders in a page with the upstream's own stylesheet (for the page around it: spacers, body), the same images and copy, and the port of Lenis (`smooth-scroll`, `lerp: 0.15`). Google Fonts are blocked on both sides, so both fall back to the same local fonts. `Math.random` is replaced on the upstream side by the port's seeded generator (mulberry32, seed 1), so `gsap.utils.shuffle` orders the grid cells as the port does. Pinned frames: the stage is scrolled to 0, 5, 12, 20, 30, 40, 55, 70, 85 and 100% of its range in turn, each captured after 3.4 s (the 2.5 s scrub has settled). In-flight frames: the clock is frozen on its 16 ms frame grid (S-240), the page is scrolled from 0 to 10% and from 10 to 32% of the range with time stopped, and frames are captured 96, 400 and 1008 ms into the catch-up. Noise floor: a second upstream load. The upstream timelines were also read from the page (`master.getChildren()`): every start and duration equals the port's.
- Target: at most 0.1% differing pixels per matched frame (owner brief, S-157, S-260).

## Result: pixels that differ

Pinned scroll positions (share of the stage's scroll range), every pattern:

| Pattern | Viewport | 0 | 5 | 12 | 20 | 30 | 40 | 55 | 70 | 85 | 100 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| horizontal-blinds | 1280x800 | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% |
| horizontal-blinds | 375x812 | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% |
| random-grid | 1280x800 | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% |
| random-grid | 375x812 | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% |
| vertical-blinds | 1280x800 | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% |
| vertical-blinds | 375x812 | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% |
| column-grid | 1280x800 | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% |
| column-grid | 375x812 | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% |

Noise floor: 0.000% in every pinned frame.

In flight (the scrub catching up; 96 / 400 / 1008 ms after the scroll):

| Pattern | Viewport | 0 to 10% | 10 to 32% |
| --- | --- | --- | --- |
| horizontal-blinds | 1280x800 | 0.419% / 0.000% / 0.003% | 0.000% / 0.000% / 0.000% |
| horizontal-blinds | 375x812 | 0.224% / 0.114% / 0.000% | 0.000% / 0.000% / 0.000% |
| random-grid | 1280x800 | 0.000% / 0.000% / 0.000% | 0.000% / 0.000% / 0.000% |
| random-grid | 375x812 | 0.000% / 0.000% / 0.000% | 0.000% / 0.000% / 0.000% |
| vertical-blinds | 1280x800 | 0.000% / 0.000% / 0.000% | 0.126% / 0.000% / 0.000% |
| vertical-blinds | 375x812 | 0.000% / 0.000% / 0.000% | 0.243% / 0.000% / 0.000% |
| column-grid | 1280x800 | 0.000% / 0.000% / 0.000% | 0.000% / 0.000% / 0.000% |
| column-grid | 375x812 | 0.000% / 0.000% / 0.000% | 0.000% / 0.000% / 0.000% |

Noise floor: 0.000% in every in-flight frame. Worst pinned frame: 0.000%.
Worst in-flight frame: 0.419%, in the first 96 ms of a catch-up, where the
blinds are moving fastest: the port's catch-up restarts on Motion's frame loop,
which assumes 16.7 ms after an idle frame, while the test clock steps 16 ms; in
four of 48 in-flight frames this lands a blind's edge on a different pixel.
Every settled frame is exact.

Strips (5, 12, 30, 55 and 85% of the range; 1280x800): horizontal blinds [before.webp](before.webp), [after.webp](after.webp), [diff.webp](diff.webp); the other patterns `before-<pattern>.webp`, `after-<pattern>.webp` and `diff-<pattern>.webp` (pixelmatch S-152; red marks a differing pixel).

## Deviations

Every change from upstream. The numbers above are measured on the shipped code, with these changes in place.

- One React component for the four pages, with the pattern as a prop; slides (image, title, label, description) are props. The Codrops frame, the spacer sections and the links between pages are not part of it.
- GSAP, ScrollTrigger and the vendored scripts are gone. Each pattern's timeline is data evaluated at the scrubbed time with the same positions, durations, staggers and eases (GSAP's `power` and `expo` eases written out; GSAP 3.12's expo is `2^(10(t - 1))·t + t^6·(1 - t)` for ease-in, not the textbook curve). The scrub is a Motion animation of the progress: ScrollTrigger's `expo` catch-up over `scrub` seconds, restarted from the current progress on every update. The progress bar follows the raw progress (ScrollTrigger applies no catch-up to a trigger without an animation).
- The random orders use a seeded generator (`seed`, default 1) through GSAP's own shuffle (`sort(() => 0.5 - random())`), so the server and client render the same grid; the upstream used `Math.random`.
- The upstream CSS is kept in a hoisted `<style>` scoped with `data-slot` selectors. Its rem (11 px from `html { font-size: 11px }`) is `--svg-mask-scroll-transition-rem`; vw and vh are `cqw` and `cqh`, so it also works in a scroll container. Media queries for the text width are container queries on the component.
- The text uses real headings and paragraphs (`title`, `label`, `description`) instead of `h1`, `h2` and `span`, with the same sizes. Mask ids are unique per instance (`useId`).
- Images with alt text are `role="img"` with that name; others are decorative.
- Colours and fonts are prefixed tokens with the upstream values as defaults (`--svg-mask-scroll-transition-surface`, `-foreground`, `-track`, `-font`).
- Reduced motion: no scroll-driven motion; the slides are shown one after another, each image in full with its text.
- Under `prefers-contrast: more` the images are darker (55% brightness instead of 80%) and the progress track stronger.

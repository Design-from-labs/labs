# sticky-grid-scroll: fidelity

- Upstream: [theoplawinski/codrops-sticky-grid-scroll `src/scripts/index.js`](https://github.com/theoplawinski/codrops-sticky-grid-scroll/blob/6015d6c7e66d371618c82b5fb0126d278f88e42d/src/scripts/index.js) and `src/styles/index.css` at `6015d6c7e66d371618c82b5fb0126d278f88e42d` (MIT; copyright 2025 Theo Plawinski, 2009 - 2025 Codrops; S-261)
- Port: `ports/theoplawinski-sticky-grid/sticky-grid-scroll`, exported to `content/components/theoplawinski-sticky-grid/sticky-grid-scroll` (item `sticky-grid-scroll`, primitive none, no icons)
- Renderer: Chromium (Playwright S-014), device scale 1, 1280x800 and 375x812.
- Method: the upstream runs from its own Vite dev server (GSAP 3, ScrollTrigger, Lenis and imagesloaded from its lockfile), with its twelve photos replaced by twelve generated images (the same files on both sides; the photos are not redistributable) and its fixed Codrops frame hidden. The port renders in a page with the upstream's own `base.css` and intro block, the same images and copy, inside the port of Lenis (`smooth-scroll`, same options: `lerp: 0.08`, `wheelMultiplier: 1.4`). Pinned frames: the page is scrolled to 0, 0.5, 0.875, 1.125, 1.5, 2.125, 3, 3.5 and 4.25 viewport heights in turn (parallax, title fade, reveal, zoom, before and after the content toggle, the end), each captured after 2.6 s, once every tween has settled. In-flight frames: the clock is frozen (S-240, `install` then `pauseAt`), the page scrolled across a trigger with time stopped, and frames captured 96 to 912 ms into the title fade, the content showing and the content hiding. Noise floor: a second upstream load.
- Target: at most 0.1% differing pixels per matched frame (owner brief, S-157, S-260).

## Result: pixels that differ

Pinned scroll positions (in viewport heights):

| Viewport | 0 | 0.5 | 0.875 | 1.125 | 1.5 | 2.125 | 3 | 3.5 | 4.25 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1280x800 (port) | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% |
| 1280x800 (noise floor) | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% |
| 375x812 (port) | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% |
| 375x812 (noise floor) | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% | 0.000% |

In flight (time after crossing the trigger):

| Viewport | title fade 96 / 288 / 496 ms | content in 160 / 352 / 608 / 912 ms | content out 160 / 352 ms |
| --- | --- | --- | --- |
| 1280x800 (port) | 0.000% / 0.000% / 0.000% | 0.000% / 0.000% / 0.000% / 0.000% | 0.000% / 0.041% |
| 1280x800 (noise floor) | 0.000% / 0.000% / 0.000% | 0.000% / 0.000% / 0.000% / 0.000% | 0.000% / 0.000% |
| 375x812 (port) | 0.000% / 0.000% / 0.000% | 0.000% / 0.000% / 0.000% / 0.000% | 0.000% / 0.000% |
| 375x812 (noise floor) | 0.000% / 0.000% / 0.000% | 0.000% / 0.000% / 0.000% / 0.000% | 0.000% / 0.000% |

Worst port frame: 0.041% (the title's antialiased edge 352 ms into hiding:
GSAP's fake 16 ms frames against Motion's 16.7 ms assumption after an idle
frame loop, a fraction of a pixel of travel); every pinned frame is 0.000%.

Strips (0.5, 1.125, 1.5, 2.125, 3.5 and 4.25 viewport heights; 1280x800): [before.webp](before.webp) (upstream), [after.webp](after.webp) (port), [diff.webp](diff.webp) (pixelmatch S-152; red marks a differing pixel).

## Deviations

Every change from upstream. The numbers above are measured on the shipped code, with these changes in place.

- GSAP, ScrollTrigger and imagesloaded are gone: the timeline is evaluated from the scroll position with Motion (`useScroll`, `useMotionValueEvent`), at the same positions (reveal at 0, zoom at 0.08, middle column at 0.58, toggle at 0.76 of a 1.08 timeline), durations, staggers and eases (GSAP's power eases written out as functions). The two time-based tweens (title fade, content toggle) are Motion `animate` calls; they start one frame early when fired inside a frame, as GSAP's do from its last tick (measured: without it the port ran one frame behind, 0.274% at 160 ms).
- The section is a React component with props (`images`, `title`, `description`, `action`, `columns`, `container`, `parallax`, `headingLevel`); the Codrops frame, links, intro block and preloader are not part of it (the intro is the demo's). Lenis is the separate `smooth-scroll` item.
- The upstream CSS is kept line for line in a hoisted `<style>` (decision 0013), scoped with `data-slot` selectors. Its rem sizes were relative to `html { font-size: calc(100vw / 1440) }`; here the unit is the section's width / 1440 (`--sticky-grid-scroll-u`, equal for a full-width section) and viewport heights are `cqh` (a size-contained scroll container, else the viewport), so it also works in a scroll container.
- Colours and fonts are prefixed tokens with the upstream values as defaults: `--sticky-grid-scroll-surface` and `-foreground` (white and black, with a dark pair), `--sticky-grid-scroll-font` (Arial) and `--sticky-grid-scroll-title-font` (Times).
- The description and action are `inert` and hidden from assistive technology until shown (upstream only set `pointer-events: none`); the action gets a visible focus outline.
- Right to left: the side columns' zoom mirrors.
- Reduced motion: no scroll-driven motion; the section is one screen tall and shows the opened grid with the title, description and action.

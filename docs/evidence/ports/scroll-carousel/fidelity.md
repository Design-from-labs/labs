# scroll-carousel: fidelity

- Upstream: Jhey's CodePen pen [CSS Scroll-Driven Image Carousel](https://codepen.io/jh3y/pen/PovoorJ) (MIT, copyright 2026 by Jhey; S-471), pinned by the verbatim snapshot of its debug view, `ports/jh3y-scroll-carousel/scroll-carousel/upstream/debug.html` (15,895 bytes, captured 2026-10-13 and checked byte for byte against a second fetch the same day). `sources.yaml` `ref` is the git tree hash of that directory, `dc78fa4a50582f958606e3a9fe342bd9c7f2d373` (decision 0030, S-451). The pen loads tweakpane, GSAP 3.11 with ScrollTrigger (proprietary, S-345) and photographs from a photo service; none of them is in the port (see Deviations)
- Port: `ports/jh3y-scroll-carousel/scroll-carousel`, exported to `content/components/jh3y-scroll-carousel/scroll-carousel` (item `scroll-carousel`, primitive none, no icons)
- Method: The upstream side is the snapshot served as is, with four substitutions made by the harness server on the way out and nothing edited in the repository: the `normalize.css` link and `@import` point at a local copy of CodePen's stylesheet; the three `esm.sh` imports (tweakpane, GSAP, ScrollTrigger) are inert stubs (Chromium has scroll timelines, so the pen never calls GSAP; the panel only wrote the defaults the pen pins in its `CONFIG`); the picsum photo URL is a generated placeholder (`/ph/<n>.svg`, the same SVG the port's demo generates, so the two sides decode the same pixels); and, for the tuned states, `CONFIG` values are rewritten (as the panel would). The port side is a harness page with the pen's page layer (`html`, `body`, the backdrop and `main`) around the component with the same props. Both run in Chromium 156.0.8078.4 (Playwright, S-014) at device scale 1, 1280x800 and 375x812, dark (the pen's default, `dark: true`) except one light state, one fresh browser context per screenshot. A hook scrolls the pen's `.controller` and the port's scroller by the same fraction of their scroll range with the same call (`scrollTo`, instant), twice waits for a frame, and screenshots the viewport; the free offsets turn scroll snapping off on both sides, so the ring is caught between two pictures. The pen's bear link is hidden on its side. Diffs with pixelmatch (threshold 0.1, S-152; S-153). The time-driven states pause every animation on both sides at the same time (`getAnimations`, `pause`, `currentTime`). Noise floor: not measured separately (static CSS, no WebGL); every state renders to the same pixels on both sides, so there is no noise to separate from the differences.
- Target: at most 0.1% differing pixels.

## Result: pixels that differ

| Configuration | Scroll position | 1280x800 | 375x812 |
| --- | --- | --- | --- |
| the default | 0% | 0.000% | 0.000% |
| the default | 25% | 0.000% | 0.000% |
| the default | 50% | 0.000% | 0.000% |
| the default | 100% | 0.000% | 0.000% |
| the default | 13.7% (no snap) | 0.000% | 0.000% |
| the default | 68.3% (no snap) | 0.000% | 0.000% |
| vertical | 0% | 0.000% | n/a |
| vertical | 50% | 0.000% | n/a |
| vertical | 13.7% (no snap) | 0.000% | 0.000% |
| tuned (24 pictures, gap 0.5, ratio 4, perspective 600, tilt 30, roll 15, mask 1.4 to 2.6) | 0% | 0.000% | n/a |
| tuned (24 pictures, gap 0.5, ratio 4, perspective 600, tilt 30, roll 15, mask 1.4 to 2.6) | 50% | 0.000% | n/a |
| tuned (24 pictures, gap 0.5, ratio 4, perspective 600, tilt 30, roll 15, mask 1.4 to 2.6) | 13.7% (no snap) | 0.000% | 0.000% |
| light scheme with backfaces | 0% | 0.000% | n/a |
| light scheme with backfaces | 50% | 0.000% | n/a |
| light scheme with backfaces | 13.7% (no snap) | 0.000% | 0.000% |
| infinite | 50% | 0.000% | n/a |
| infinite | 100% | 0.000% | n/a |
| infinite | 13.7% (no snap) | 0.000% | 0.000% |
| scroll drive off (turns by itself) | paused at 0 ms | 0.000% | 0.000% |
| scroll drive off (turns by itself) | paused at 3000 ms | 0.000% | 0.000% |
| scroll drive off (turns by itself) | paused at 7000 ms | 0.000% | 0.000% |

Strips (the default configuration at 0%, 25%, 50%, 100% of the scroll range and the two free offsets, then the other configurations, then the time-driven frames; 1280x800, half size): [before.webp](before.webp) (upstream), [after.webp](after.webp) (port), [diff.webp](diff.webp). 375x812, side by side: [before-375.webp](before-375.webp), [after-375.webp](after-375.webp), [diff-375.webp](diff-375.webp).

### The scroll-listener fallback

The fallback is what the pen's GSAP path did in browsers without scroll-driven animations. GSAP cannot be run here (it is proprietary and the pen never reaches it in Chromium), so its output is not the reference; the port's script path is compared to the pen's CSS path instead, which is what the rotation should equal. The same states, with the port forced onto the listener (`scrollDriver="script"`):

| Configuration | Scroll position | 1280x800 | 375x812 |
| --- | --- | --- | --- |
| the default | 0% | 0.000% | 0.000% |
| the default | 25% | 0.000% | 0.000% |
| the default | 50% | 0.000% | 0.000% |
| the default | 100% | 0.000% | 0.000% |
| the default | 13.7% (no snap) | 0.000% | 0.000% |
| the default | 68.3% (no snap) | 0.000% | 0.000% |
| vertical | 0% | 0.000% | n/a |
| vertical | 50% | 0.000% | n/a |
| vertical | 13.7% (no snap) | 0.000% | 0.000% |
| tuned (24 pictures, gap 0.5, ratio 4, perspective 600, tilt 30, roll 15, mask 1.4 to 2.6) | 0% | 0.000% | n/a |
| tuned (24 pictures, gap 0.5, ratio 4, perspective 600, tilt 30, roll 15, mask 1.4 to 2.6) | 50% | 0.000% | n/a |
| tuned (24 pictures, gap 0.5, ratio 4, perspective 600, tilt 30, roll 15, mask 1.4 to 2.6) | 13.7% (no snap) | 0.000% | 0.000% |
| light scheme with backfaces | 0% | 0.000% | n/a |
| light scheme with backfaces | 50% | 0.000% | n/a |
| light scheme with backfaces | 13.7% (no snap) | 0.000% | 0.000% |
| infinite | 50% | 0.000% | n/a |
| infinite | 100% | 0.000% | n/a |
| infinite | 13.7% (no snap) | 0.000% | 0.000% |
| scroll drive off (turns by itself) | paused at 0 ms | 0.000% | 0.000% |
| scroll drive off (turns by itself) | paused at 3000 ms | 0.000% | 0.000% |
| scroll drive off (turns by itself) | paused at 7000 ms | 0.000% | 0.000% |

## Support boundary

Measured on this machine (S-473 is the reference for the feature itself): Playwright's Chromium 156.0.8078.4 reports `CSS.supports("animation-timeline: scroll()")`, `timeline-scope`, `scroll-timeline`, `container-type` and the `cqmin` unit as supported, so the ring is turned by the stylesheet alone (`data-script-driver` is absent) and a scroll to half the range turns it (its transform changes). The component asks `CSS.supports("animation-timeline: scroll()")` once after mount; where the answer is no it sets `data-script-driver`, which switches the stylesheet from the scroll timeline to `--scroll-carousel--progress`, written by a scroll listener.

No engine without scroll timelines is installed here (the WebKit builds in Playwright's cache start but do not answer the driver; there is no Firefox), so the fallback is not shown on a real older browser. `scrollDriver="script"` runs the same listener path in Chromium; the table above shows it matches the pen's CSS path at every state. Container query units (`cqmin`, `cqw`, `cqh`) are needed in both paths; a browser without them is not handled (the picture size would be invalid), which is a smaller boundary than scroll timelines'.

## Deviations

Every change from upstream. The numbers above are measured on the shipped code, with these changes in place.

- **Only the carousel is the component.** The page layer (the grid backdrop, the author link, `main`'s size and `body`'s layout) belongs to the host; the gallery demo draws the backdrop. `main`'s `height: 100svh` is the parent's height: the root is `width: 100%; height: 100%`.
- **Sized by its own box.** The pen sized everything from the viewport (`20vmin`, `50vw`, `50svh`). The root is a size container (`container-type: size`) and the same expressions read `20cqmin`, `50cqw` and `50cqh`, which are the pen's values when the component fills the page (the table above) and follow the component when it does not. `--scroll-carousel-item-size` overrides the picture size.
- **Scoped and renamed.** The pen's global `ul`, `li` and `img` rules are part selectors under `.scroll-carousel`; its `html`-level variables and the ones computed on `.container` are `--scroll-carousel--*`; `--controller` is `--scroll-carousel-timeline` (scoped by `timeline-scope` on the root, so two carousels never share a timeline); the keyframes are `scroll-carousel-turn`. The pen's `html` data switches (`data-animate`, `-scroll`, `-vertical`, `-infinite`, `-backface`, `-dark`) sit on the root.
- **The tweakpane panel is left out; its defaults are props.** `items` (the panel's 10 to 50) is the length of `images`, `scroll` is `scrollDriven`, `animate`, `vertical`, `infinite`, `buff` is `ratio`, `gap`, `perspective`, `masklower` and `maskupper` are `maskLower` and `maskUpper`, `rotatex` and `rotatez` are `rotateX` and `rotateZ`, `backface`, and `dark` is `scheme` (`"dark"` by default, as the pen). `debug` (dashed outlines) is not ported, nor are the pen's commented-out `spread`, `zoom` and `rotate`. The panel's view transition on theme and backface changes is not ported.
- **GSAP is not used; the fallback is a scroll listener.** In browsers without scroll timelines the pen tweened the ring with a ScrollTrigger scrubbing `rotateY` and a `--rotate` variable. The port writes the scroller's progress (offset over range, from the inline start) to `--scroll-carousel--progress` from a passive scroll listener, and the stylesheet turns the ring by `progress * -360deg` in the same transform list the keyframes use. `scrollDriver="script"` forces it. No GSAP code or dependency ships (S-345); Motion is not needed either.
- **The photographs are replaced.** The pen loaded `picsum.photos/300/300?random=<n>` (unlicensed photographs). The demo generates original gradient art (a hue that steps round the wheel, a soft disc) as SVG data URLs, and the upstream side of every diff uses the same art. `images` is `{ src, alt }[]`; the pen's `alt=""` becomes required alt text (an empty string still marks a decorative picture).
- **The shine layer is not drawn.** The pen's `.carousel::after` (a masked, `z-index: 200` square animated in step with the ring) has no background and its `backdrop-filter` is commented out, so it paints nothing. It is omitted; the table shows the pixels are the same.
- **Hint.** The pen's fixed `h1` ("scroll.") is a `p` with `aria-hidden`, absolute in the component at the inline end (the pen: fixed at the right), shown only while the ring is scroll-driven, and `hint` changes or hides it. Its `transition: opacity` on first render is not ported.
- **The scroller is a named region.** The pen's `ul.controller` of empty `li`s is a `section` with an `aria-label` (`label`) and `tabindex="0"`, holding `aria-hidden` spacer elements (one more than there are pictures, as the pen). It has a visible focus ring on keyboard focus only (the pen relied on the browser's). The rest of the time the pixels are the same. The ring is a list of the pictures with their alt text, in order.
- **Scroll drive off, or animation off.** The pen kept the (useless) controller in the DOM; the port renders it only while the ring is scroll-driven, so there is no empty tab stop. With `scrollDriven={false}` the ring turns by itself (the pen's `[data-animate="true"]` rule, `0.5s` per picture for a turn) and the list takes the name instead.
- **Infinite scrolling measures the component.** The pen's wrap-around used `window.innerWidth` and `innerHeight` and the physical `scrollLeft`; the port uses the scroller's own `clientWidth` and `clientHeight`, measured from the inline start (so right to left works), and only on scroll events (it does not jump at mount).
- **Reduced motion.** Under `prefers-reduced-motion: reduce` nothing is tied to the scroll position and nothing turns on its own: the component renders a flat strip of the same pictures in the same named region, which scrolls natively with snap (the pen has no reduced-motion path). Before the preference is read (server rendering) a media query stops the ring's animation.
- **Fonts come from the host.** The pen's body font stack is the page's; the hint inherits. The fidelity pages put the pen's stack on both sides.
- **Names.** `ScrollCarousel`, `ScrollCarouselImage`; parts carry `data-slot`s (`scroll-carousel`, `-stage`, `-ring`, `-scroller`, `-step`, `-strip`, `-hint`).

## Enhancements (after fidelity)

- **Props.** Every value of the pen's tweakpane panel is a prop with the pen's default (see Deviations); `images` carries the pictures with alt text, `label` names the scroll region, `hint`, `scheme` and `scrollDriver` are new. `--scroll-carousel-item-size` overrides the picture size.
- **Keyboard and screen readers.** The scroller is a `section` named by `label` with `tabindex="0"`: ArrowRight, ArrowLeft, Page Up and Page Down and the Home and End keys scroll it a picture at a time (scroll-snap), and a visible focus ring shows for keyboard focus only (the e2e spec presses ArrowRight and checks that the scroll position and the ring's transform change). The pictures are a list with their alt text in order; the corner hint and the spacer steps are `aria-hidden`.
- **Reduced motion.** `prefers-reduced-motion: reduce` swaps the ring for a flat strip of the same pictures in the same named region: it scrolls natively with snap, nothing is linked to the scroll position and nothing turns on its own (the e2e spec checks that the ring is gone, the 16 pictures keep their alt text, and axe is clean). Server rendering draws the ring (the preference is read after hydration), with a media query that stops its animation meanwhile.
- **Right to left.** The scroller starts at the inline start, the rotation follows the distance scrolled, the infinite wrap-around measures from the inline start, and the hint sits at the inline end. axe is clean on the harness pages in right to left and on `/ui/scroll-carousel` (e2e).
- **Wall tile.** `tile` is 2x2 on the dark surface. On the wall nobody can scroll, so the hydrated demo turns the ring by itself (`scrollDriven` off, 8 s a turn); the wall pauses it offscreen, in a hidden tab and under reduced motion (`loop`: `wait`, 8000 ms, hydrated).
- **Sized by its box.** The picture size is `clamp(120px, 20cqmin, 12rem)` of the component, so it follows the demo's box in the tile, the page and the preview (the table above is the case where it is the viewport). The demo has a definite width (`40rem`, capped), because a box with only absolutely positioned children has none of its own (P-160).
- **Accessibility.** axe (WCAG 2.2 AA and best-practice tags, page-level rules off because the harness pages are bare) is clean on the harness pages, the CSS-driven and the script-driven ring, at 1280x800 and 375x812, in light, dark and right to left: 16 pages. The built component page runs every rule in `e2e/scroll-carousel.spec.ts`: light, dark, right to left and under reduced motion.
- **Phone widths.** 320 and 375 px: no horizontal overflow, and the ring fits its box (e2e).
- **e2e.** `e2e/scroll-carousel.spec.ts` (beta builds): axe in both schemes, right to left and under reduced motion, the ring turning with the keyboard-scrolled region, the scroll-listener fallback (with `CSS.supports` answering no for scroll timelines), the flat strip under reduced motion, no overflow at 320 and 375, and the wall tile (the hydrated demo turns the ring by itself). 9 tests, all passing on a beta build; the production build skips them.

# map: fidelity

- Upstream: the CodePen pen [Scroll Map, Split-Screen & Expandable](https://codepen.io/creativeocean/pen/myOVZYO) by Tom Miller (MIT, copyright 2026 by Tom Miller; S-520), explained in his Codrops article ([S-521](https://tympanus.net/codrops/2026/05/21/creating-scroll-driven-svg-map-animations-with-gsap), a reference only). Pinned, as the snapshot-pinning decision (0028) says, by the verbatim snapshot of the pen's debug view (`https://cdpn.io/pen/debug/myOVZYO`, accessed 2026-10-13, 8,422 bytes, SHA-1 `84fabd2b4ffc7dfb1174f9d4ffad42ce6741d71f`) in `ports/creativeocean-scroll-map/scroll-map/upstream/debug.html`; `sources.yaml` `ref` is the git tree hash of that directory, `2f6c844a3a428256741dfdd4b55939bfdb0a4df5`: `git rev-parse <commit>:ports/creativeocean-scroll-map/scroll-map/upstream` must print it. The pen's Details view shows the MIT notice (checked by the coordinator; text and copyright line in `ports/creativeocean-scroll-map/LICENSE`). The pen's two companion pens answered 404 and are not ported. The pen loads GSAP, DrawSVGPlugin, MotionPathPlugin and ScrollTrigger (proprietary, S-345): GSAP 3.15.0 and its three plugins (the files the pen's script tags name, fetched into the harness directory outside the repository) ran locally for the upstream side of the diff only; nothing from them is in the port, vendored or depended on.
- Port: `ports/creativeocean-scroll-map/scroll-map`, exported to `content/components/creativeocean-scroll-map/scroll-map` (item `scroll-map`, primitive none, no icons). Motion (S-104) rewrites the GSAP; DrawSVG and MotionPath are plain SVG (S-522).
- Renderer: Chromium (Playwright S-014, 1.64), device scale 1, `prefers-reduced-motion: no-preference`, light scheme, headless (overlay scrollbars, so the page width is the viewport's).
- Method: both pages are served by one Vite server. The upstream page is the pinned snapshot with five substitutions made by the server (see Deviations): the map photograph, the face, the event copy, the four glyphs, and GSAP loaded from local files. The port page renders `<ScrollMap>` over the same copy in a Tailwind page (so the utility reset is in play), with the window as the scroller. Before any pixel was compared, the boxes and key computed styles of every element of the content column were dumped on both sides and diffed (that is how the heading sizes, the button's face and case, the icon boxes and the half-pixel pin width were found). Both pages run under Playwright's fake clock (S-240), paused while they load and then stepped in 16 ms frames (`clock.runFor(16)`), with `performance.now()` and `Date.now()` snapped to the 16 ms grid on both sides (P-104). A real mouse click opens and closes the map. Every frame, the animated state is read from the DOM the same way on both sides (the transforms of the zoomed group, the camera group and the dot, the route's dash, the pane's width, the close button's opacity and visibility, the page's overflow) and the two traces are compared before any pixel is. Screenshots are the whole viewport through the DevTools protocol (`Page.captureScreenshot`), diffed with pixelmatch at threshold 0.1 (S-152; S-153 reads the PNGs). Noise floor: a second load of the upstream page, diffed against the first.
- Scenario, per viewport (1,142 recorded frames each: 2 + 150 + 150 + 150 + 10 + 150 + 150 + 80 + 20 + 80 for the first ten scenarios, 100 + 100 for the in-flight pair): warm-up (a 5 px scroll and back, so the loop's frame interval is measured), at rest, a scroll to 30% settling, to 80%, back up to 10%, a ten-step drag (90 px per frame), rest, a scroll to the end, **expand** (a click), rest, **collapse** (a click), then a scroll to 55%, an expand by keyboard 10 frames later (the scrub still running) and its collapse. Screenshots at 14 named states.
- Target: at most 0.1% differing pixels at 1280x800 and 375x812, and recorded state equal to upstream's, frame by frame.

## Result: recorded state, frame by frame

The largest absolute difference between the upstream and port traces over the 942 frames of the ten scenarios that do not differ by design, at each viewport (SVG values are single-precision in the DOM, which accounts for the last digits). The remaining 200 frames are the in-flight pair (see Deviations):

| Value | 1280x800 | 375x812 |
| --- | --- | --- |
| zoom scale | 0.0001 | 0.0001 |
| camera x, y (px of the 1500 space) | 0.0003, 0.0006 | 0.0002, 0.0003 |
| dot x, y | 0.0006, 0.0007 | 0.0004, 0.0006 |
| route dash and gap | 0.001 | 0.001 |
| pane width (px) | 0 | 0.016 (the layout's 1/64 px) |
| close button opacity | 0 | 0 |
| page overflow while open | see Deviations | see Deviations |

So the scrub (ScrollTrigger's smoothing), the camera's glide, the zoom, the drawn route, the dot and the open and close tweens agree with GSAP's to a few ten-thousandths of a unit on every frame, in flight as well as settled, at both viewports. The in-flight pair differs by design: the port's opening stops the scrub, upstream's does not. On the pen the scrub pulled the map back while it opened (a dash up to 7.4 px shorter than the port's in the first frames) and, at frame 33 when the opening tween ended, snapped the progress from the end of the route to 55%; the port stays at the end. Its camera and dot then differ by up to 80 units for the rest of that scenario and the one after it.

## Result: pixels that differ

Full viewport, the states above, the port against the pinned snapshot's page. The noise floor (the upstream page diffed against a second load of itself over the same 14 states) is at most 5 pixels at 1280x800 and 0 at 375x812.

| State | 1280x800 | 375x812 |
| --- | --- | --- |
| at rest (scroll 0) | 0.0006% (6 px) | 0.0000% |
| settled at 10% | 0.0001% (1 px) | 0.0000% |
| settled at 30% | 0.0000% | 0.0000% |
| settled at 50% (zoom held at 4) | 0.0000% | 0.0000% |
| settled at 70% | 0.0001% (1 px) | 0.0000% |
| settled at the end | 0.0003% (3 px) | 0.0000% |
| in flight, 8 frames after a scroll to 50% | 0.0000% | 0.0000% |
| in flight, 18 frames after | 0.0000% | 0.0000% |
| settled back at 20% | 0.0000% | 0.0000% |
| expanding, 10 frames in | 0.0000% | 0.0000% |
| expanding, 22 frames in (close button fading in) | 0.0133% (136 px) | 0.0447% (136 px) |
| expanded | 0.0000% | 0.0000% |
| collapsing, 10 frames in | 0.0000% | 0.0000% |
| collapsed | 0.0000% | 0.0000% |

Worst port frame: 136 pixels, 0.0447% at 375x812, with the close button's glyph fading in; every settled state is at most 6 pixels. Strips (upstream, port, pixelmatch; red marks a differing pixel, eight of the states): 1280x800 [before.webp](before.webp), [after.webp](after.webp), [diff.webp](diff.webp); 375x812 [before-375.webp](before-375.webp), [after-375.webp](after-375.webp), [diff-375.webp](diff-375.webp).

Reduced motion has no upstream counterpart; it draws the pen's end state, and the map pane under it is 1 pixel from the upstream page scrolled to the end at 1280x800 (0 of 152,656 at 375x812).

## Deviations

Every change from upstream. The numbers above are measured with these in place on both sides where they touch the diff, and on the port alone otherwise.

- **GSAP is rewritten with Motion.** `map-motion.ts` has the scrubbed timeline's three tweens (the zoom, the route and the dot) as plain functions of the timeline's progress; the drawn route is a stroke dash of the drawn length (6 significant digits, a 0.1 px gap, as DrawSVG wrote it), the dot is `getPointAtLength` of the same distance (the pen's MotionPath without `align`), and the zoom is `sine.inOut` in, a hold and `sine.inOut` back (the yoyo with a repeat delay). Every tween is a Motion `animateValue` driven by a clock of the component's own that ticks in Motion's update step. The eases are written out (`expo` as GSAP blends it, `power1.out`, `power2.inOut`, `power3.inOut`, `sine.inOut`, `expo.inOut`). ScrollTrigger's `scrub: 1` is an expo-out tween of the timeline's progress from where it is, restarted on every change of the scroll progress, which is how the library behaves (measured, not as its documentation describes it: P-WEB2-MAP-2); `quickTo` is the same restart for the camera, from the value the old tween has at that instant. Values are written rounded as GSAP wrote them (4 decimals for transforms and widths, 5 for the dot). The pin is `position: sticky`; the scroll progress is Motion's `useScroll` with offsets "start start" and "end end" on the component (upstream's start "0 0", end "100% 100%").
- **The map photograph is replaced on both sides** by a generated street map (`map-art.tsx`: a rotated grid of blocks and streets, parks, a river and a harbour, the pen's route running along streets), because the photograph the pen uploaded has no license. It is a bare SVG fragment, 1500 x 1500, so its box (and the transform origin the pen's plugin derives from it) is the photograph's. `art` replaces it.
- **The face is Figtree on both sides** (the pen asked for Open Sans); the content inherits the host's face, the two buttons keep the browser's own (Arial here), as the pen's did.
- **The event copy is original on both sides.** The pen's text promotes a real organisation and names real people; the demo's copy (and the harness's, identical) is fictional, of similar length and structure. The two detail lines are `h2` in the demo (the pen has `h4` after an `h1`, which skips heading levels); both are styled the same.
- **The four glyphs are redrawn** (calendar, marker, expand, close; simple original geometry, on both sides), since the pen's are third-party icon artwork of unstated license. `expandIcon` and `closeIcon` replace the two buttons'.
- **The pin's rounded width is reproduced with CSS `round()`** (GSAP wrote the map's width as a whole number of pixels, 188 px at 375 px wide, and its closing tween then wrote the plain 50%, 187.5 px). The stylesheet rounds the pane's width where the browser has `round()`; the closing tween ends at the plain percentage, as upstream's did.
- **Layout is in the box, not the window.** `100vh` is the component's `--scroll-map-viewport` (100vh in the window, the container's own height for a `container`), and the close button sits in the pane's corner instead of fixed to the window; `left: 50%` is `inset-inline-start`, the pane is on the inline start side, `right` and `padding-right` are logical. The pen's `html` and `body` rules (overscroll, margin, font) belong to the page.
- **The browser defaults the pen relied on are written out** (headings, paragraphs, lists, the icons' inline box and content-box width, the buttons' face, size and case, the focus ring) because a utility reset removes them; the values come from the dump of the upstream page.
- **Opening the map stops the scrub.** Upstream's keeps running, so a click within a second of a scroll made it fight the opening tween (the map jumped back to the scroll position the moment the opening ended: recorded on the pen: the progress jumps from the end of the route to 55%); the port's opening tween owns the progress. Everything else about opening and closing is upstream's: the width tween (`power3.inOut` out, `expo.inOut` back), the progress tween to 1 (`power2.inOut`), the close button's fade (from 0.3 s for 0.5 s) and back (0.2 s).
- **Scroll locking restores what was there.** Upstream wrote `overflow: hidden` on the body and `scroll` after closing (an always-visible scrollbar); the port locks the window's body, or the `container`, and restores the previous value after the closing tween. The lock starts with the click, not on the next frame.
- **The close button is focusable but invisible only while closed** (`visibility: hidden`, upstream's was a transparent button over the page that took clicks and focus); it becomes visible (at opacity 0) when the map starts to open, so focus can move to it.
- **Resizing closes the map.** Upstream reset the close button and the scroll lock on a window resize and left the pane to ScrollTrigger's refresh; the port closes the map, at once, when the component's width or its scroller's height changes.
- **The dot and the drawn route start from the scroll progress at mount**, not from zero, so a page restored mid-scroll shows the route as far as it is.
- **The loop sleeps when nothing moves** (GSAP's ticker idled after 120 frames; the clock stops at once) and a gap of more than 500 ms counts as 33 ms, as GSAP's lag smoothing does.
- **Not ported:** `overscroll-behavior` on `html`; the Google Fonts import; the loaded GSAP scripts; the pen's `.pov g` selectors (the port holds the camera group by reference).

## Enhancements

None of these changes the default look; the diff above is with all of them on.

- **Reduced motion:** nothing is tied to the scroll position. The whole route is drawn at once with the dot at its end (the pen's last frame, scale 2), the map opens and closes at once, and nothing is scrubbed.
- **Keyboard and screen readers:** the map is an image named by `label` and described by `description` (an SVG `title` and `desc`); the expand button is a native button with `aria-expanded`; opening moves focus to the close button and makes the text inert, Escape or the close button closes the map and focus returns to the expand button. Axe is clean on the demo (light, dark, right to left, a phone width, reduced motion, and with the map open).
- **Right to left:** the pane takes the inline start side, the text the other; verified with `dir="rtl"`.
- **A scroll container:** `container` makes the map follow an element's scrolling (sticky pane, `100cqh` or the measured height, the lock on that element); the demo scrolls its own container down and back up on the gallery wall only (a cosine ease, skipped while the wall marks it paused) and leaves it to the visitor on the component page.
- **Variables:** `--scroll-map-surface`, `--scroll-map-ink`, `--scroll-map-callout`, `--scroll-map-callout-ink`, `--scroll-map-route`, `--scroll-map-dot` and `--scroll-map-close`, each with light and dark values; the callout gets an outline under forced colors.
- **Props:** the route, the art, the zoom, the scrub time, the closed width, the labels and the icons, controlled or uncontrolled open state.

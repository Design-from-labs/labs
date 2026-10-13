# Balloons: port fidelity

- Upstream: arturbien/balloons-js @ b27dbf3e80340549854a348ff2d94118f53bdd38 (`src`: `index.ts`, `balloonSvg.ts`, `textBalloons.ts`; package version 0.0.3)
- Upstream demo: the repository's own demo page (`docs/index.html` with its compiled `docs/script.js`, which releases balloons on load and has the "Release Balloons" and "Release Text Balloons" buttons), served as static files from the clone at the pinned commit (outside this repository)
- Port page: the same `docs/index.html`, with the demo script (`docs/script.ts`, line for line) loaded as a module that imports `balloons` and `textBalloons` from the port
- Harness: Vite 7.3.1, Chromium 156 (Playwright 1.64.0), device scale 1, light scheme, no reduced motion; the shared tool `fidelity.mjs` with a seeded `Math.random` (seed 42), Playwright's fake clock (epoch 1767225600000, advanced 100 ms) and a hook that pauses every Web Animation at the same `currentTime`
- Diff: pixelmatch 7.2.0 (S-152), threshold 0.1; percent of all pixels in the frame
- Viewports: 1280x800 and 375x812
- Target: at most 0.1%. Worst frame: **0.0000%** (14 port captures against upstream, 6 upstream-against-upstream controls)

## Method

Upstream's effect is random (positions, sizes, depth) and runs for about
30 s, so the frames are made reproducible rather than waited for. Both pages
get the same seeded `Math.random`, so the same balloons are placed; the
clock is faked and frozen, so nothing advances in real time; and, once the
SVG images have decoded (1.5 s of real time), the hook pauses every Web
Animation on the page and sets its `currentTime` to the frame's time (the
same for every balloon: each has its own delay inside its keyframes). The
port draws the same elements from the same random sequence (its SVG ids come
from a counter, so it takes no extra `Math.random` calls).

- `balloons-<ms>`: the page's own release on load, frozen at 600, 1200, 2000
  and 3000 ms.
- `text-<ms>`: after pressing upstream's "Release Text Balloons" button
  (random colors, `HAPPY`, `BDAY` and three emoji, sized from the window
  width) on top of the load release, frozen at 1500, 3000 and 4500 ms.

The Sniglet typeface that upstream embeds as a base64 `@font-face` is not
shipped with the port (see Deviations). To compare the letter shapes, the
harness passed upstream's own embedded copy to the port as its `fontFace`
option and set `--balloons-font-family` to it, so both sides drew the same
font. This happened in the harness only; nothing of it is in the repository.
The controls capture upstream against upstream under the same conditions
(balloons at 1200 and 3000 ms, text at 3000 ms): the noise floor.

## Results

| Frame | Time | 1280x800 | 375x812 |
| --- | ---: | ---: | ---: |
| balloons | 600 ms | 0 px (0.0000%) | 0 px (0.0000%) |
| balloons | 1200 ms | 0 px (0.0000%) | 0 px (0.0000%) |
| balloons | 2000 ms | 0 px (0.0000%) | 0 px (0.0000%) |
| balloons | 3000 ms | 0 px (0.0000%) | 0 px (0.0000%) |
| text balloons | 1500 ms | 0 px (0.0000%) | 0 px (0.0000%) |
| text balloons | 3000 ms | 0 px (0.0000%) | 0 px (0.0000%) |
| text balloons | 4500 ms | 0 px (0.0000%) | 0 px (0.0000%) |
| control | balloons 1200 ms, upstream against upstream | 0 px (0.0000%) | 0 px (0.0000%) |
| control | balloons 3000 ms, upstream against upstream | 0 px (0.0000%) | 0 px (0.0000%) |
| control | text 3000 ms, upstream against upstream | 0 px (0.0000%) | 0 px (0.0000%) |

The noise floor is zero at these frames, so no tolerance was needed. This
checks the page-wide default (no container, no signal, motion on) against
upstream; the options added below are not part of the comparison.

## Evidence

`<frame>-<viewport>-before.webp` is upstream, `-after.webp` the port,
`-diff.webp` the pixelmatch overlay (the frame faded, with differing pixels in
red; none). Balloons at 1200 and 3000 ms and text at 3000 ms keep the before
image and the diff (their after images are byte-identical to before, so they
are dropped); the other frames keep the diff only (size budget: each frame is
a full page).

## Deviations from upstream

The port is upstream's drawing and animation code with the changes below. With
none of the new options, `balloons()` and `textBalloons()` behave as
upstream's (the numbers above).

- **No font ships.** Upstream embeds the Sniglet typeface (SIL Open Font
  License 1.1; `src/balloonFont.ts`, base64) for the text balloons. OFL-1.1 is
  not on this registry's license allowlist (decision 0007), so the font and
  its embedded copy are left out. Text balloons read the family from
  `--balloons-font-family` (default `ui-rounded, system-ui, sans-serif`). To
  use Sniglet, a user downloads it (Google Fonts or `@fontsource/sniglet`),
  serves the file, builds the rule with `balloonFontFace("Sniglet", url)` and
  passes it as `fontFace`; the item's docs show the three lines and ask to
  keep the font's license with it. Because each letter is an SVG image, which
  cannot see the page's fonts, the rule must be embedded as a data URL in the
  letter (upstream does the same); `balloonFontFace` does that. Without it,
  the letters are drawn in the fallback family and look different from
  upstream (their shapes and widths), which is a visible difference, not a
  pixel one. S-430 records the font.
- **Renames.** The private custom properties of the balloon drawing
  `--balloon-color`, `--light-color`, `--balloon-width`, `--balloon-height`
  are `--balloons-color`, `--balloons-light-color`, `--balloons-width` and
  `--balloons-height` (component-prefixed). The SVG ids carry a per-release
  suffix (`filter0_f_102_49-<id>`) so two releases at once never share a
  filter. The element names (`balloons`, `balloon`, `text-balloons`,
  `text-balloon`) and the exports `balloons` and `textBalloons` are
  upstream's.
- **Types.** Upstream's `balloonSvg.ts` is `// @ts-nocheck`; the port is typed.
  Unused locals (`totalLines`, `maxDepth`, `verticalProgress`) are dropped.
  Letters are escaped before they go into the SVG markup.
- **Options added to both functions** (all optional; without them, upstream's
  behaviour): `container` (the effect is absolutely positioned inside that
  element and sized from its box instead of the viewport; a static element is
  made `position: relative` while it runs), `signal` (an `AbortSignal` that
  cancels the animations and removes the layer at once) and `reducedMotion`
  (`"fade"` default, `"skip"`). Both functions return a promise that resolves
  when the effect ends; upstream returns nothing and leaves the empty text
  layer in `<body>`, the port removes the layer.
- **Reduced motion (upstream: ignored).** Under `prefers-reduced-motion:
  reduce` nothing flies: one still frame (each balloon held a little way
  into its flight) fades in and out over 2.4 s, opacity only; `"skip"` does
  nothing.
- **React API added:** `useBalloons({ containerRef, reducedMotion, fontFace })`
  returns `{ release, releaseText, stop }`. Releases are contained in
  `containerRef`, each call can pass its own `signal`, and releases still
  running are stopped when the component unmounts (StrictMode safe).
  `balloonFontFace(family, url)` is a helper for the font rule above.
- **Not ported.** The demo page, the Open Graph image and the rollup build.

## Enhancement checks (not part of the pixel comparison)

- axe (WCAG 2.0 to 2.2 A/AA, best practices) on the built component page,
  light and dark: 0 violations on the whole page (end-to-end suite) and on the
  demo at 1280 and 375; the same page right to left.
- Keyboard: both buttons are reachable and operable with Enter and Space; the
  layers are `aria-hidden` with `pointer-events: none`, so the page stays
  usable while balloons fly and no focus lands in a layer.
- Reduced motion: under `prefers-reduced-motion: reduce` every balloon is
  held (paused) and only the layer's opacity fade runs; the layer removes
  itself after 2.4 s (end-to-end test).
- Containment: a release made with `container` (the demo's card) stays inside
  the card's box, adds nothing to `<body>` and removes its layer at the end
  (end-to-end test, and on the wall below). An abort signal ends the release
  at once and removes the layer; a static container is made
  `position: relative` only while a layer is in it (checked in the harness,
  with two overlapping releases).
- Overflow: the document does not scroll sideways at 320, 375 and 1280 on the
  built component page (balloons never leave the card).
- Contrast: the card text is the site's foreground and muted-foreground
  tokens (axe clean, light and dark); the balloons are decorative.

## Primitive and icons

Primitive `none`: the effect is imperative DOM and Web Animations (a layer of
`<balloons>` elements), with no interactive widget a Radix, Base UI or React
Aria primitive could replace; the demo's two buttons are plain buttons. Icon
set `none`: the balloons are drawn SVG, with no icon library involved.

## Stage, tile and loop

No stage: the demo is a small card (a title, a line of copy and two buttons)
whose balloons are contained in the card. The tile is 2 by 2 so the balloons
have room to rise. The loop hydrates the specimen and clicks control 0
("Release balloons"), waits, then clicks control 1 ("Text balloons"), waits,
over 16 s. Checked on a `LABS_INCLUDE_BETA=1` build: the loop plays only in view; a
release stays inside the tile (no layer outside it, at 1280 and 375), at most
two layers exist at once (balloons, then text), the URL stays put and no
focus moves into the tile. Under reduced motion the tile is its static frame
(the card with its two buttons, no layer, no animation running). With
"Pause animations" on, or when the tile scrolls out of view mid-release, the
specimen carries `data-loop-paused`: the loop's own pause halts the balloons'
animations (0 running measured 1.5 s later), no new release starts, and the
demo's buttons ignore a scripted press while paused. The preview is a release
held 3.2 s in, in the demo card.

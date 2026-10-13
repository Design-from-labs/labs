# Virtual List: port fidelity

- Upstream: petyosi/react-virtuoso @ 6650ec4a4397cc2670d3e1f77ddba1ddcfc0d731 (tag `react-virtuoso@4.18.16`), as published in npm `react-virtuoso` 4.18.16
- Upstream demo: the repository's own hello example (`packages/react-virtuoso/examples/hello.tsx`): `<Virtuoso computeItemKey={(key) => `item-${key}`} initialItemCount={30} itemContent={(index) => <div style={{ height: 30 }}>Item {index}</div>} style={{ height: 300 }} totalCount={100} />`
- Port page: the same props on `<VirtualList>` (`ports/react-virtuoso/virtual-list/virtual-list.tsx`), unnamed (no `aria-label`), so it renders no region role
- Harness: a small Vite 7.3.1 page per side (React 19.3.0, `react-virtuoso` 4.18.16, npm build), installed outside this repository; the upstream page imports the example file verbatim; Chromium (Playwright 1.64.0), device scale 1, light scheme, no reduced motion
- Diff: pixelmatch 7.2 (S-152) with PNGs read by pngjs 7 (S-153), threshold 0.1; percent of all pixels in the frame. A raw count (any channel differing) and the largest channel delta are recorded too
- Viewports: 1280x800 and 375x812
- Target: at most 0.1%. Worst frame: **0.0000%** (6 frames, 3 scroll positions at both sizes; every one is byte-identical to upstream's)

## Method

Each frame loads the upstream page, then the port page, then the upstream page a
second time (the noise floor), each in a fresh browser context. The pages carry
no stylesheet of their own, so both sides are the browser's default page (8 px
body margin) with Virtuoso's inline styles.

Frames are scroll positions of the list's scroller (`[data-virtuoso-scroller]`,
Virtuoso's own element on both sides), set directly with `scrollTop` and left
to settle for 600 ms so Virtuoso has measured and rendered the rows for that
position (settled frames, not mid-scroll):

| Frame | scrollTop | Visible rows |
| --- | ---: | --- |
| `top` | 0 (400 ms after load; the first 30 rows come from `initialItemCount`) | Item 0 to Item 9 |
| `scrolled-1234` | 1234 | Item 41 (cut at the top) to Item 50, a sliver of Item 51 |
| `bottom` | 2700 (the end of 100 rows of 30 px in a 300 px list) | Item 90 to Item 99 |

The pointer is parked at (0, 0) before each screenshot.

## Results

| Frame | 1280x800 | 375x812 |
| --- | ---: | ---: |
| `top` | 0 px (0.0000%) | 0 px (0.0000%) |
| `scrolled-1234` | 0 px (0.0000%) | 0 px (0.0000%) |
| `bottom` | 0 px (0.0000%) | 0 px (0.0000%) |
| noise floor (upstream against itself), every frame | 0 px | 0 px |

Raw counts match: 0 differing pixels in every channel, largest channel delta 0.
All six port captures are byte-identical to upstream's, and the noise floor is
zero, so no tolerance was needed. `fidelity.json` holds the numbers.

## Evidence

`<frame>-<viewport>-before.webp` is upstream, `-after.webp` the port,
`-diff.webp` the pixelmatch overlay (red: differing pixels; none). The
`scrolled-1234` frame at both sizes keeps all three images; the other frames
keep the diff only, since their before and after images are byte-identical
(size budget).

## Deviations from upstream

The item depends on npm `react-virtuoso` and wraps it; Virtuoso's code is not
copied or changed, and every prop and handle method passes through. What the
port adds or changes:

- **List semantics.** Upstream renders the list and its rows as plain `div`s.
  The wrapper passes Virtuoso's `components` slots a `ul` and an `li`, reset to
  the same box (`margin: 0; padding: 0; list-style: none`), and each row gets
  `aria-posinset` (its position) and `aria-setsize` (the whole list's size), so
  a screen reader reports "item 5,001 of 10,000" although only a window of rows
  is in the page. The look is identical (the frames above). Passing your own
  `components.List` or `components.Item` replaces these, and the docs say to add
  `role="list"` and `role="listitem"` then.
- **A named list is a region.** `aria-label` or `aria-labelledby` also sets
  `role="region"` on Virtuoso's scroller, which is focusable (`tabindex` 0, set
  by Virtuoso): axe's `scrollable-region-focusable` and `region` rules both
  hold, and the labelled region gives the list a landmark name. Unnamed, it
  renders as upstream does (the fidelity configuration).
- **Focus ring.** Virtuoso's scroller has no focus outline of its own; the
  wrapper adds `focus-visible:ring-2 ring-ring ring-inset` to its class, so
  keyboard users see where focus is. Nothing shows without keyboard focus.
- **Reduced motion.** A `behavior: "smooth"` scroll through the handle
  (`scrollTo`, `scrollBy`, `scrollToIndex`, `scrollIntoView`) and a `"smooth"`
  `followOutput` become jumps under `prefers-reduced-motion: reduce`. The handle
  is otherwise Virtuoso's own.
- **Wall demo.** The gallery demo is Labs': 10,000 made-up tasks derived from
  the row index, a labelled region, and (on the wall only) a timer that scrolls
  the list.

## Enhancement checks (not part of the pixel comparison)

All measured on a `LABS_INCLUDE_BETA=1` build of this branch (the component
page, its preview route and the `/ui` wall).

- axe (WCAG 2.0 to 2.2 A/AA, best practices): 0 violations on the demo at 320,
  375 and 1280 px, light and dark, left to right and right to left; on the
  preview route, light and dark; on the whole page (e2e), light, dark and right
  to left; on the `/ui` wall at the same widths and modes.
- Semantics: the demo is a `region` named "Tasks" (by `aria-labelledby`); its
  first rendered row has `aria-posinset` 1 and `aria-setsize` 10000.
- Keyboard: the region takes focus (Virtuoso's `tabindex` 0); End scrolls to the last row, which
  then reports `aria-posinset` 10000 of 10000 (e2e).
- Reduced motion: the wall loop's smooth scrolls stop with the loop. The handle's
  smooth-to-jump conversion is code, covered by reading, and was not separately
  measured in a browser.
- Overflow: the document does not scroll sideways at 320, 375 and 1280 px, left
  to right and right to left, light and dark, on the component page and on the
  wall.

## Primitive and icons

Primitive `none`: Virtuoso measures, positions and recycles the rows itself;
no Radix, Base UI or React Aria component is a variant of that. Icon set
`none`: the component draws no icons (the demo's rows are text).

## Stage, tile and loop

A list is a small specimen: no stage, and the tile spans 1 by 2. The loop
hydrates the specimen (`client:visible`) and waits: the demo's own timer
(every 1.4 s, four rows further down the list with a smooth scroll, back to
the top after 60) is the movement. The timer runs only inside the wall (the
specimen carries `data-specimen`) and skips its step while
`element.closest("[data-loop-paused]")` is set, which the wall sets offscreen,
in a hidden tab, under reduced motion and when the visitor pauses animations.
Paused, the tile shows the list at the top, static. The preview is the
component page's demo at the top of the list.

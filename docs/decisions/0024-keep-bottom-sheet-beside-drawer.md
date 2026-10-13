# 0024: Keep the ported Bottom Sheet next to the stock shadcn Drawer

- Status: Accepted
- Date: 2026-10-13
- Deciders: Port pod I (BottomSheet sub-agent), under the owner's batch I brief
- Sources: S-401, S-402, S-408, S-407, S-004, S-014, S-184

## Context

The owner keeps the Bottom Sheet port (S-401, on dialog-panel S-402 and
physics-engine S-408) only if its gestures beat the stock shadcn Drawer
(S-004), which is vaul 1.1.2 on Radix Dialog with shadcn's `drawer.tsx` as
published in the registry on 2026-10-13 (`styles/new-york-v4/drawer.json`).

## Decision

Keep it. Ship the port as `bottom-sheet` (beta), default variant on the
native `<dialog>`, plus Radix, Base UI and React Aria variants on one shared
gesture and snap core.

## Alternatives

| Option | Why not |
| --- | --- |
| Drop the port; point users at the shadcn Drawer | Measured worse on the points a sheet exists for: content below the fold is unreachable at a partial snap (last of 30 rows at 1299 px on an 812 px screen), an upward drag on the content scrolls the list instead of growing the sheet, a hard flick (2.3 px/ms) from the middle snap dismisses instead of stepping one snap, no give when pulled past the top, focus stays on the trigger behind the scrim when it opens, and it animates under reduced motion. |
| Port only the native-dialog variant | The brief asks for the headless primitives where a dialog primitive applies; the shared core makes the three extra variants about 150 lines each, and every one measured identical to upstream. |
| Wrap vaul with snap fixes | It would be a fork of a library we do not own, with the transform-based snap model (the cause of the unreachable content) left in place. |

## Evidence

375x812 phone, touch emulation, real touch input through Chromium's
DevTools protocol (pointer events and native scrolling as on a device),
Playwright (S-014); upstream web component, the port (four variants) and
the shadcn Drawer on the same page content (30-row list; snap sheets at
40/70/100). Velocities are what the page received, per gesture; the suite
ran three times for the snap rows. The port's results equal upstream's on
every row.

| Measure | Bottom Sheet (port, all variants) | shadcn Drawer (vaul 1.1.2) |
| --- | --- | --- |
| Snap points, slow drag 40 to about 65% / 70 to about 52% | rests at 70 / 40 | rests at 70 / 40 |
| Flick 180 px up from 40 (1.5 to 2 px/ms) | one step, 70 | one step, 70 |
| Hard flick 240 px down from 70 (2.1 to 2.7 px/ms) | one step, 40 (every run and variant) | dismissed when the average speed passed 2 px/ms (2 of 3 runs) |
| Throw 400 px up from 40 (2.6 to 3.2 px/ms) | 100 | 100 |
| Swipe 80 px down from the lowest snap (0.54 to 0.65 px/ms) | returns to 40 | dismissed (4 of 4) |
| Swipe 60 px (0.4 to 0.5 px/ms) | stays; threshold 0.5 px/ms over the last 100 ms | steps once at 0.43, stays at 0.38; threshold 0.4 px/ms averaged over the gesture |
| Drag up 200 px on the content at the 40 snap | sheet grows to 70 | list scrolls 185 px, sheet stays at 40 |
| Content reachable at the 40 snap | yes (the sheet's height is the snap; the list scrolls to its last row) | no (the sheet is translated; last row at 1299 px of 812) |
| Drag from the handle vs the content at scroll top | both move the sheet | both move the sheet |
| Scroll hand-off: list at 150 px, one 450 px drag down | list scrolls to 0, sheet stays (Chromium takes the pan and cancels the pointer) | same |
| Rubber band: pull 200 px up past the top | 14 px of give (square-root resistance), springs back | 0 px (hard stop) |
| Slow-drag dismissal (binary sheet) | at more than 100 px (fixed) | at 25% of the sheet's height (stays at 160, dismissed at 200 px for a 650 px sheet) |
| Flick 90 px down (binary, about 1 px/ms) | dismissed | dismissed |
| Tap the close button inside the drag surface / the backdrop | closes / closes | closes / closes |
| Keyboard | focus moves into the sheet on open; Escape closes; focus returns to the trigger; Tab: the native dialog cycles the sheet and the browser's own controls, never the page; the Radix, Base UI and React Aria variants trap it | focus stays on the trigger, behind the scrim, until Tab; Tab trapped; Escape closes; focus returns |
| Modal semantics | native `<dialog>` `:modal`, page inert (default) | `role="dialog"`, page aria-hidden |
| Reduced motion | no slide, no settle travel (port addition; upstream animates 400 ms) | animates 500 ms |
| Frames during a 90-move drag, CPU throttled 4x | p95 16.7 ms, 0 frames over 33 ms, 0 long tasks | p95 16.7 ms, 0 frames over 33 ms, 0 long tasks |
| Size, min + gzip, React, clsx and tailwind-merge excluded | 9.4 kB (native variant, stylesheet included); Radix variant 22.2 kB with Radix Dialog, 8.9 kB of its own | 22.6 kB with Radix Dialog; vaul alone 9.0 kB |

Full table, method and repeats: `docs/evidence/ports/bottom-sheet/gesture.md`
(with `gesture-results.json`); fidelity: `docs/evidence/ports/bottom-sheet/fidelity.md`.

## Consequences

- Two sheet-like components exist; the Bottom Sheet is the one for snap
  points and scrollable content, the shadcn Drawer (not shipped by us)
  remains the choice for side drawers, nested drawers and background
  scaling, which this sheet does not do.
- We maintain a gesture core (`sheet-controller.ts`, about 600 lines
  with comments) and four thin dialog layers.
- Mid-gesture hand-off from a scrolled list does not happen under touch in
  either component (the browser cancels the pointer when it starts a pan);
  the docs promise only the hand-off at the top of the scroll.

## Re-test when

- vaul (or the shadcn Drawer) changes its snap model to resize instead of
  translate, adds overdrag resistance, or moves focus into the drawer on
  open: rerun `gesture.mjs` against the new version.
- Chromium or WebKit stop cancelling the pointer when a native pan starts on
  a `touch-action: pan-y` scroller (the hand-off row would change).
- The native variant's size passes 12 kB min + gzip, or a frame over 33 ms appears
  during a drag at 4x throttling.

# bottom-sheet: gesture comparison with the shadcn Drawer

- Sides: upstream's web component (`dist/bottom-sheet.esm.js` and the demo's dialog-panel build), the port in all four variants, and the stock shadcn Drawer: `drawer.tsx` from the shadcn registry on 2026-10-13 (`styles/new-york-v4/drawer.json`) on vaul 1.1.2 and Radix Dialog. Same page on every side: a trigger row, 30 filler blocks, and two sheets with a header (title, close button) and a 30-row list (48 px rows); the snap sheet uses 40/70/100 (the Drawer's content made full height so its snap offsets mean the same).
- Device: 375x812, touch emulation, device scale 1, Chromium (Playwright, S-014). Input is real touch through the DevTools protocol (`Input.dispatchTouchEvent`, wall-clock paced), so pointer events, touch events and native scrolling run as on a phone. A slow drag moves 4 px per 16 ms and holds 180 ms before release; a flick is the distance in two or three frame-paced moves released while moving. The velocity in each cell is the one the page received (distance over pointer down to up); a loaded machine delivers a touch event every 30 to 40 ms, so flick speeds vary by run and are reported, not assumed.
- Repeats: the snap rows ran three times on upstream, the port and the Drawer (identical outcomes except where a speed crossed a threshold, noted below); the Radix variant's two low readings (0.77 and 1.38 px/ms) were rerun twice at 0.9 to 1.6 px/ms and matched upstream (dismissed; rests at 40).
- Keyboard: Tab pressed 12 times, 120 ms apart; trace per press: 1 = focus in the sheet, b = the document body (the browser's own controls), [id] = an element of the page behind.

| Test | upstream | port (native dialog) | port, Radix | port, Base UI | port, React Aria | shadcn Drawer |
| --- | --- | --- | --- | --- | --- | --- |
| snap: slow drag 40 -> ~65% lands on | rests at 70 | rests at 70 | rests at 70 | rests at 70 | rests at 70 | rests at 70 |
| snap: slow drag 70 -> ~52% lands on | rests at 40 | rests at 40 | rests at 40 | rests at 40 | rests at 40 | rests at 40 |
| snap: small fast flick up from 40 (60px) | rests at 40 (0.44 px/ms) | rests at 40 (0.44 px/ms) | rests at 40 (0.41 px/ms) | rests at 40 (0.46 px/ms) | rests at 40 (0.39 px/ms) | rests at 40 (0.38 px/ms) |
| snap: long fast flick up from 40 (400px) | rests at 100 (2.86 px/ms) | rests at 100 (2.94 px/ms) | rests at 100 (2.86 px/ms) | rests at 100 (2.96 px/ms) | rests at 100 (2.92 px/ms) | rests at 100 (2.6 px/ms) |
| snap: hard short flick up from 40 (180px, 2 moves) | rests at 70 (1.59 px/ms) | rests at 70 (1.8 px/ms) | rests at 70 (1.55 px/ms) | rests at 70 (1.82 px/ms) | rests at 70 (1.51 px/ms) | rests at 70 (1.31 px/ms) |
| snap: hard short flick down from 70 (180px, 2 moves) | rests at 40 (1.37 px/ms) | rests at 40 (1.89 px/ms) | rests at 70 (1.38 px/ms) | rests at 40 (1.82 px/ms) | rests at 40 (2.09 px/ms) | rests at 40 (1.5 px/ms) |
| snap: very hard flick down from 70 (240px, 2 moves) | rests at 40 (2.73 px/ms) | rests at 40 (2.48 px/ms) | rests at 40 (2.07 px/ms) | rests at 40 (2.4 px/ms) | rests at 40 (2.33 px/ms) | dismissed (2.29 px/ms) |
| snap: small fast flick down from 70 (60px) | rests at 70 (0.44 px/ms) | rests at 70 (0.46 px/ms) | rests at 70 (0.39 px/ms) | rests at 70 (0.36 px/ms) | rests at 70 (0.43 px/ms) | rests at 70 (0.39 px/ms) |
| snap: fast flick down from 40 (80px) | rests at 40 (0.55 px/ms) | rests at 40 (0.6 px/ms) | rests at 40 (0.41 px/ms) | rests at 40 (0.58 px/ms) | rests at 40 (0.63 px/ms) | dismissed (0.54 px/ms) |
| snap: drag up on content at 40 (200px) | rests at 70 | rests at 70 | rests at 70 | rests at 70 | rests at 70 | rests at 40, list scrolled 185 px |
| snap: rows reachable by scrolling at 40 (last row visible after scroll) | yes | yes | yes | yes | yes | no (last row at 1299 px of 812) |
| binary: slow-drag dismissal threshold (px) | stays <= 100 px, dismisses >= 130 px | stays <= 100 px, dismisses >= 130 px | stays <= 100 px, dismisses >= 130 px | stays <= 100 px, dismisses >= 130 px | stays <= 100 px, dismisses >= 130 px | stays <= 160 px, dismisses >= 200 px |
| binary: fast flick down 50px | open (0.41 px/ms) | open (0.41 px/ms) | open (0.23 px/ms) | open (0.43 px/ms) | open (0.34 px/ms) | open (0.38 px/ms) |
| binary: flick down 90px (2 moves) | dismissed (1.07 px/ms) | dismissed (1.11 px/ms) | open (0.77 px/ms) | dismissed (1.17 px/ms) | dismissed (0.86 px/ms) | dismissed (0.66 px/ms) |
| binary: overdrag up 200px from handle, mid-drag rise | 14 px give | 14 px give | 14 px give | 14 px give | 14 px give | 0 px give |
| binary: drag down on content at scrollTop 0 (200px) | dismissed | dismissed | dismissed | dismissed | dismissed | dismissed |
| binary: hand-off, list at 150px, one drag down 450px | list 150->0, sheet moved 0 px, open | list 150->0, sheet moved 0 px, open | list 150->0, sheet moved 0 px, open | list 150->0, sheet moved 0 px, open | list 150->0, sheet moved 0 px, open | list 150->0, sheet moved 0 px, open |
| binary: tap close button in drag surface | dismissed | dismissed | dismissed | dismissed | dismissed | dismissed |
| binary: tap backdrop | dismissed | dismissed | dismissed | dismissed | dismissed | dismissed |
| keyboard: Enter opens, focus inside, Tab x12 stays inside, Escape closes, focus returns | focus in: yes; Tab: 1b11b11b11b1 (sheet + browser UI); Esc: closes; returns to open-binary | focus in: yes; Tab: 1b11b11b11b1 (sheet + browser UI); Esc: closes; returns to open-binary | focus in: yes; Tab: 111111111111 (trapped); Esc: closes; returns to open-binary | focus in: yes; Tab: 111111111111 (trapped); Esc: closes; returns to open-binary | focus in: yes; Tab: 111111111111 (trapped); Esc: closes; returns to open-binary | focus in: no (stays on trigger); Tab: 111111111111 (trapped); Esc: closes; returns to open-binary |
| a11y: dialog role, modal, name | dialog, modal=True, name 'Binary sheet', page blocked=True, body overflow hidden | dialog, modal=True, name 'Binary sheet', page blocked=True, body overflow hidden | dialog, modal=None, name 'Binary sheet', page blocked=True, body overflow hidden | dialog, modal=None, name 'Binary sheet', page blocked=True, body overflow hidden | dialog, modal=None, name 'Binary sheet', page blocked=True, body overflow hidden | dialog, modal=None, name 'Binary sheet', page blocked=True, body overflow hidden |
| reduced motion: open animation | moves (transform, height 0.4s, 0.4s; CSSTransition:400) | no motion (in place) | no motion (in place) | no motion (in place) | no motion (in place) | moves (transform 0.5s; CSSAnimation:500) |
| frames: 4x CPU throttle, 90-move drag on handle | p95 16.7 ms, max 17 ms, 0 frames >33 ms, 0 long tasks | p95 16.7 ms, max 17 ms, 0 frames >33 ms, 0 long tasks | p95 16.8 ms, max 17 ms, 0 frames >33 ms, 0 long tasks | p95 16.7 ms, max 17 ms, 0 frames >33 ms, 0 long tasks | p95 16.7 ms, max 17 ms, 0 frames >33 ms, 0 long tasks | p95 16.7 ms, max 17 ms, 0 frames >33 ms, 0 long tasks |


Notes:

- Hard flick from the middle snap: the Drawer dismisses when the gesture's average speed passes 2 px/ms (2 of 3 runs: 2.29 and 2.45 px/ms dismissed, 1.73 stepped to 40); the sheet steps exactly one snap at every speed measured (2.07 to 2.73 px/ms).
- Swipe 80 px down from the lowest snap at 0.54 to 0.63 px/ms: the Drawer dismissed in 4 of 4 runs, the sheet returned to 40 in all runs (its dismissal needs 0.5 px/ms over the last 100 ms, or more than 100 px below the snap).
- A 60 px swipe at 0.43 px/ms stepped the Drawer once (one run); at 0.37 to 0.39 it stayed: its threshold is 0.4 px/ms averaged over the whole gesture.
- Hand-off: with the list scrolled, Chromium starts a native pan and cancels the pointer, so neither component moves for the rest of that gesture; both move from the top of the scroll.
- Sizes, min + gzip, React, clsx and tailwind-merge excluded: port native 9.4 kB (stylesheet included), Radix 22.2 kB (8.9 kB of its own), Base UI 32.3 kB, React Aria 28.4 kB; upstream 7.2 kB (two bundles and two stylesheets); shadcn Drawer 22.6 kB (vaul alone 9.0 kB).

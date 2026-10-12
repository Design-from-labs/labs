# 0015: Show layout parts in a device frame and app shell (stages)

- Status: Accepted
- Date: 2026-10-12
- Deciders: Owner (brief), Pod GRID
- Sources: S-047, S-048, S-045, S-002

## Context

A sidebar, a side panel, a header or a command palette means little on its
own in a demo box: it is part of a layout. The owner asked for such
components to be shown in context, inside a device frame and an app shell, so
the layout reads as the sum of its parts:

- an optional, additive `stage` in `meta.json` (contract revision 3);
- a `<Stage>` primitive on the site: a neutral, tokenized device frame (our
  own drawing, no vendor imagery) and a skeleton shell, with the component
  live in its slot;
- phone and tablet frames that follow the breakpoints, and right-to-left that
  mirrors the slots;
- light and dark; static-first, hydrating only the component;
- the gallery tile shows the device, the component page shows it with a
  device switcher, and the tile-to-page morph (decision
  [0012](0012-gallery-view-transitions.md)) carries the device frame.

## Decision

- **Contract:** `stage: { device, slot, shell?, height? }` with the values in
  [contract section 4.1](../contract.md), validated by
  `schemas/meta.schema.json` (components only), checked by
  `scripts/meta-stage.test.mjs`. `schemaVersion` stays 1.
- **An iframe per stage, at the device's real viewport.** The demo renders in
  `/stage/live/<item>` (hydrated; component page) or `/stage/still/<item>`
  (no islands; gallery tile and preview still), inside `StageShell`. The
  iframe's CSS size is the device viewport (phone 390x844, tablet 768x1024,
  laptop and browser 1280x800, desktop 1440x900), so the component's own
  `md:`/`lg:` breakpoints apply exactly as in an app.
- **Scaled with CSS only.** The screen keeps the viewport's aspect ratio
  (`aspect-ratio`) and is a size container; the iframe is scaled by
  `tan(atan2(100cqw, <viewport width>))`, which is the unitless ratio of two
  lengths. No script measures anything, and the frame's box is final before
  the iframe loads (no layout shift).
- **Frames:** drawn with borders and gradients from site tokens
  (`--stage-bezel`, `--stage-base`, `--stage-chrome`, light and dark): a plain
  rounded slab for phone and tablet (no notch, no buttons), a lid and deck
  for the laptop, a monitor and stand for the desktop, a window with an empty
  address field for the browser.
- **Shell:** skeleton regions (`aria-hidden` placeholders) laid out with
  logical properties in a flex row that becomes a column below `md`; the demo
  replaces the region its slot names. The direction switch sets the framed
  document's `dir` through the same-origin iframe; the frame itself never
  mirrors.
- **Framing:** `/stage/*` is the only path the site lets itself frame
  (`X-Frame-Options: SAMEORIGIN`, `frame-ancestors 'self'` in `vercel.json`);
  everything else stays `DENY` (docs/pitfalls.md, P-032).
- **Device switcher:** the default device, then desktop, tablet and phone.
  Switching resizes the iframe; the framed document stays loaded, so state
  and direction persist. `?device=` keeps the choice in the URL, like
  `?variant=`.
- **Morph:** the device frame (`[data-stage]`) carries `tile-preview-<name>`
  with its own view-transition class, `tile-stage`. It scales as a rigid
  object (`object-fit: contain`), unlike a demo box, whose content keeps its
  size.

## Alternatives

| Option | Why not |
| --- | --- |
| Render the demo inline and scale it with `transform` | Media queries still answer to the page's viewport, so a sidebar inside a phone frame on a desktop page shows its desktop layout: the frame would lie. |
| Container queries in the components | Changes how components are written (and installed) for the sake of the gallery; exported components use viewport breakpoints. |
| Scale with a script (ResizeObserver) | Works, but adds client JavaScript and a frame of wrong scale before it runs; `tan(atan2())` does the division in CSS (Chrome 111, Safari 15.4, Firefox 108). |
| Screenshots of the device | Not live or interactive, and they drift from the code. |
| A `devices` list in `stage` to limit the switcher | Not asked for; every stage is a full viewport, so every device renders. Revisit if a part is only meant for some sizes. |

## Evidence

- `e2e/stage.spec.ts`: each device in the switcher sets the iframe's inner
  viewport to the device's size, scales it to fill the screen within 1 px at
  the device's aspect ratio, and switches the sidebar between its rail
  (768px and up) and its top bar; the phone's menu disclosure works in the
  live island; right-to-left moves the sidebar to the right and survives a
  device switch; the frame's box does not move when the iframe loads, CLS
  stays at most 0.1 on `/ui`, `/ui/sidebar` and inside the stage; no
  horizontal scroll at 320 and 375 px; the tile's still has no islands.
- `e2e/gallery.spec.ts`: the staged tile morphs its device frame into the
  hero's (`::view-transition-group(tile-preview-sidebar)`), and reduced
  motion navigates without a transition.
- `e2e/a11y.spec.ts`: axe clean on `/ui/sidebar` and
  `/ui/sidebar?device=phone`, light and dark, including the framed document.
- `scripts/vercel-headers.test.mjs`: stage documents are framable by the
  site only; every other page refuses framing.
- `scripts/meta-stage.test.mjs`: the schema accepts revision-2 sidecars and
  rejects unknown devices, slots, shells, heights and staged foundations.

## Consequences

- Each staged variant adds two static pages (`/stage/live`, `/stage/still`);
  each staged tile and hero loads one iframe document (cached CSS and fonts).
- The framed document is a separate page for axe and for screen readers: it
  has a title, no `<main>` and no landmark names that clash with the site's
  (docs/pitfalls.md, P-030).
- A layout part must fill its slot's height on its own (`md:h-full`).

## Re-test when

- More than 6 staged entries appear on `/ui` at once, or the gallery's
  largest contentful paint grows by more than 200 ms because of stage
  iframes: switch tiles to stills (`preview.webp`) and keep iframes for the
  component page.
- A component needs a device the five do not cover (a watch, a TV, a
  landscape tablet).
- Browsers drop or change `tan(atan2())` on mixed lengths, or CSS typed
  arithmetic (`100cqw / 1280px`) ships everywhere: use the simpler form.

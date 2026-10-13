# GuideframeGrid fidelity

- Upstream: `Dinil-Thilakarathne/guide-frame` at
  `aee6735f2b931b2c092f4fd908cb895713d787fb` (MIT, Copyright (c) 2026
  GuideFrame): `packages/react/src` (GuideframeGrid, useGuideframe) and
  `packages/core/src` (the engine, vendored under `core/`).
- Port: `ports/guide-frame/guideframe-grid/src/upstream`, exported as the
  `guideframe-grid` registry item (one variant, no primitive, no icons).
- Tool: the port pods' Playwright + pixelmatch diff (`threshold` 0.1, pass at
  <= 0.1% differing pixels), deviceScaleFactor 1, a fresh browser context per
  shot, so `localStorage` starts empty on both sides.

## How each side was rendered

- **Upstream**: a copy of the pinned clone, `npm ci`, then
  `npm run build --workspace @guideframe/core` and
  `npm run build --workspace @guideframe/react` (as its README says), then the
  `examples/vite` demo on its Vite dev server (`http://127.0.0.1:5350/`). Its
  page overlay is the page-level (fixed) mode with
  `rulers`, `columns {12, 8, 4}`, `gutter {24, 20, 16}`, `margin {32, 24, 16}`,
  `maxWidth 1280`, `color "rgb(236 72 153)"`, `opacity 0.14`, all snap modes,
  `storageKey "guideframe:demo-visible"`.
- **Port**: a local harness (Vite + React 19 + Tailwind v4, `@/*` alias) into
  which the exported item is installed exactly as the shadcn CLI would (every
  `files[].content` written to its `target` under `src/`, `cssVars` written to
  an imported stylesheet). The harness page repeats the upstream example's
  markup, CSS (`examples/vite/src/styles.css`, no Tailwind on that page) and
  props verbatim, importing `@/components/guideframe-grid/GuideframeGrid`
  (`http://127.0.0.1:5351/`).
- **States** (hooks run after a 600 ms settle; finite animations are finished
  by the screenshot, so the column reveal is compared at its end state):
  - `default`: overlay visible with columns and rulers, panel closed.
  - `panel`: `Cmd/Ctrl+Shift+G` pressed; the hook waits until the panel is
    visible on both sides and fails otherwise.
  - `guides-panel`: a guide dragged off the left ruler (to 42% of the width)
    and one off the top ruler (to y 420, snapping applies on both sides), then
    the panel opened.
  - `reduced-guides-panel`: the same with `prefers-reduced-motion: reduce`.
  - `dark-guides-panel`: the same with `prefers-color-scheme: dark` (the
    overlay is a dark instrument UI in both schemes, as upstream).

## Results

Before enhancements (contract-required changes only: relative imports, and at
that time an `enabled` option in place of the `NODE_ENV` check; that
deviation is gone, see below):

| State | Viewport | Scheme | Differing px | % | Pass |
| --- | --- | --- | --- | --- | --- |
| default | 1280x800 | light | 0 | 0.0000 | yes |
| default | 375x812 | light | 0 | 0.0000 | yes |
| panel | 1280x800 | light | 0 | 0.0000 | yes |
| panel | 375x812 | light | 0 | 0.0000 | yes |
| guides-panel | 1280x800 | light | 0 | 0.0000 | yes |
| guides-panel | 375x812 | light | 0 | 0.0000 | yes |

After enhancements (tokens installed with upstream values, RTL, keyboard and
screen reader work, scoped-mode fixes, contrast fix):

| State | Viewport | Scheme | Differing px | % | Pass |
| --- | --- | --- | --- | --- | --- |
| default | 1280x800 | light | 0 | 0.0000 | yes |
| default | 375x812 | light | 0 | 0.0000 | yes |
| panel | 1280x800 | light | 68 | 0.0066 | yes |
| panel | 375x812 | light | 70 | 0.0230 | yes |
| guides-panel | 1280x800 | light | 79 | 0.0077 | yes |
| guides-panel | 375x812 | light | 84 | 0.0276 | yes |
| guides-panel, reduced motion | 1280x800 | light | 79 | 0.0077 | yes |
| guides-panel, reduced motion | 375x812 | light | 84 | 0.0276 | yes |
| guides-panel | 1280x800 | dark | 79 | 0.0077 | yes |
| guides-panel | 375x812 | dark | 84 | 0.0276 | yes |

Images kept: `default-*` and `guides-panel-*` (`before` = upstream, `after` =
port, `diff`), two stills of the gallery demo in the harness
(`demo-ltr-1280x800`, `demo-rtl-375x812`) and one of the demo in its Labs
stage, right-to-left (`site-stage-laptop-rtl`). The other runs are recorded in
`fidelity.json` only.

## In the Labs site

A local build with beta items included (`LABS_INCLUDE_BETA=1`, only this
component and the components already on staging) renders the demo in its
stage (`{ device: "laptop", slot: "inline", shell: "app" }`) at
`/stage/live/guideframe-grid` and on `/ui/guideframe-grid`: one overlay,
mounted inside the demo frame (none on the framed document's body and none on
the component page itself), panel open, two guides, 12 columns in the laptop
frame and 4 in the phone frame, no page errors, in LTR and RTL. That build is
a production build, so this also shows the demo's explicit `enabled` keeps it
visible on a deployed preview.

## Production gate

Upstream's production behaviour is restored (decision 0018 allows
`process.env.NODE_ENV` in item files): by default the overlay mounts in
development and mounts nothing in a production build, and
`forceVisibleInProduction` works as upstream. `enabled` remains as an explicit
override (`true` always mounts, `false` never). The only change to upstream's
check is dropping its `typeof process` guard in favour of a plain
`process.env.NODE_ENV` read inside its existing `try`, because the guard runs
in the browser, where Vite defines no `process`, and would report development
in a Vite production build. Checked in the local harness: a production build
(`vite build`, `NODE_ENV` replaced) mounts no overlay for
`<GuideframeGrid rulers />` and mounts the demo's overlay, which passes
`enabled` explicitly; the dev server mounts both. The fidelity comparison
runs on both dev servers, where both sides mount.

## Residual difference, explained

The only pixels that differ after the enhancements are the panel's small
secondary text: the shortcut hints (`⌘G`, `⇧R`, `⇧M`, `⇧L`) and the
breakpoint summary in the header. Upstream draws them in 38% and 46% white,
which axe measures at 3.52:1 and 4.47:1 on the panel surface (WCAG AA needs
4.5:1 for 9px text). The port draws both in 55% white
(`--guideframe-grid-panel-muted-foreground`), which passes. Everything else,
including the column colors, rulers, guides, selection shadow (now derived
with `color-mix` from the guide tokens) and the panel surface, is pixel
identical, and the default (panel closed) state is still 0 px.

The upstream demo page itself has three color-contrast findings (its eyebrow
text and the pink card numbers); they belong to the example page, not to the
component, and are not shipped. The axe runs that gate the port use harness
pages with neutral content (`demo.html`, the gallery demo, and `panel.html`,
a page-level overlay with the panel open, shortcuts on and two guides) in
light, dark, right-to-left and 375px: 0 violations.

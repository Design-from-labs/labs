# Table of Contents: fidelity evidence

- Upstream: https://github.com/batuhankarasakal/tableofcontent at
  `db0bcee81b34792e03b6b5584d67f1cf23758680` (MIT, Copyright (c) 2026
  Batuhan Karasakal): `src/project-toc.js`, `src/project-toc.css`,
  `demo/index.html`
- Port: `ports/tableofcontent/table-of-contents/` (item `table-of-contents`,
  primitive none, icon-free). A rewrite from vanilla JS and CSS to one React
  component styled with Tailwind utilities and `--table-of-contents-*`
  variables.
- Measured: 2026-10-12, Chromium (Playwright), device scale factor 1, light

## How each side was rendered

**Upstream.** `demo/index.html` from a copy of the pinned clone, served by a
static server on `http://localhost:5332/demo/` (the same as its
`npm start`, on another port). It loads `project-toc.css` and calls
`initProjectToc()` with the defaults.

**Port.** A local harness (Vite 7, React 19.3, Tailwind v4 with preflight,
`@/*` alias) on `http://localhost:5333`, into which the exported item is
installed the way the shadcn CLI does it (`components/table-of-contents.tsx`,
`lib/utils.ts`, the item's `cssVars` written to `:root`, `.dark` and
`@theme inline`). The page is the upstream demo rebuilt in React: the demo's
own `<style>` block verbatim, the same intro, the same four sections with the
same headings, text, ids and inline SVG images (extracted from
`demo/index.html`), and
`<TableOfContents aria-label="Project table of contents" items={...} />`
with the same titles and descriptions and default options.

**Preview box.** Upstream sizes each tooltip preview from the first image's
`.project-shot` box as laid out in its section. In a two-column gallery
with mixed ratios that box is a stretched grid cell (for "Dolor Sit" it is
taller than the image, which is then letterboxed). The port's default is the
first image's own ratio; it exposes `previewRatio` per item for this case,
and the harness passes the same measured box (`"<width> / <height>"` of the
first figure after the images decode). Without it, the "hover" state
differed by 4.99% (the tooltip was shorter).

**Timing.** No fake clock: CSS transitions run in real time either way. The
hook waits 700 ms after the interaction (all transitions are at most
620 ms) and the tool's full-page shot finishes any running transition.
`hover-slide` holds the hover for 2300 ms: the preview has advanced once
(interval 1500 ms) and its 620 ms crossfade has ended, so both sides show
image 2 of 2.

| State | Hook |
| --- | --- |
| idle | page loaded, first section active |
| hover-first | pointer on entry 1 (Lorem Ipsum): line widened, tooltip with preview 1 |
| hover | pointer on entry 2 (Dolor Sit): magnetic widths on neighbours, tooltip |
| hover-slide | as hover, held 2300 ms: preview slid to image 2, dot 2 active |
| focus | Tab three times: entry 3 focused, tooltip open from focus |
| scrolled | `scrollTo` the third section: entry 3 active (aria-current) |
| reduced-hover | `prefers-reduced-motion: reduce`, hover entry 2 |

## Results

Before = upstream, after = port. At 375x812 the bar is hidden on both sides
(`max-width: 767px` upstream, `max-md:hidden` here), so those rows compare the
page itself; their images are kept for idle and scrolled only.

| State | Viewport | Scheme | Differing px | % | Pass |
| --- | --- | --- | --- | --- | --- |
| idle | 1280x800 | light | 0 | 0.0000 | yes |
| idle | 375x812 | light | 0 | 0.0000 | yes |
| hover-first | 1280x800 | light | 0 | 0.0000 | yes |
| hover-first | 375x812 | light | 0 | 0.0000 | yes |
| hover | 1280x800 | light | 0 | 0.0000 | yes |
| hover | 375x812 | light | 0 | 0.0000 | yes |
| hover-slide | 1280x800 | light | 0 | 0.0000 | yes |
| hover-slide | 375x812 | light | 0 | 0.0000 | yes |
| focus | 1280x800 | light | 0 | 0.0000 | yes |
| focus | 375x812 | light | 0 | 0.0000 | yes |
| scrolled | 1280x800 | light | 0 | 0.0000 | yes |
| scrolled | 375x812 | light | 0 | 0.0000 | yes |
| reduced-hover | 1280x800 | light | 0 | 0.0000 | yes |
| reduced-hover | 375x812 | light | 0 | 0.0000 | yes |

The idle, hover and focus rows were measured again after the contrast
styles below were added (still 0 px). The port was measured once it carried its enhancements (a rewrite has no
"copied" stage); none of them changes the default look, which the table is
the evidence for.

## Known deviations (accessibility, kept at upstream's default)

Per the ports contrast policy (fidelity default, contrast on request):

| Item | Default (upstream) | Measured | WCAG | On request |
| --- | --- | --- | --- | --- |
| Tooltip description, light | `#a1a1aa` on `#424346` | 3.86:1 | fails 1.4.3 AA (14px text) | `prefers-contrast: more`: `#c4c4cc`, 5.71:1 (dark tokens: `#d4d4d8`) |
| Inactive line, light | `#d8d8dc` on white | 1.42:1 | below 3:1 for non-text marks | `prefers-contrast: more`: `#8a8a93`, 3.42:1 (dark tokens: `#71717a` on near-black, 4.10:1) |
| Tooltip surface, dark tokens | `#424346` on near-black | 2.00:1 | boundary only | `prefers-contrast: more`: 1px outline in the line-contrast color |
| Row pitch | `rowHeight` 20 (64x20 targets) | 20px | fails WCAG 2.2 SC 2.5.8 (24px targets, or the spacing exception, which 20px rows do not meet) | pass `rowHeight={24}` (the gallery demo does) or set `--table-of-contents-item-height: 24px` |

Under `forced-colors: active` the lines and dots opt out of forced
backgrounds (`forced-color-adjust: none`) and use `GrayText`, with
`Highlight` for the active or hovered entry and the current dot; the
tooltip gets a border. Active entries also differ by line length (32px
against 12px) and the current dot by width (12px against 4px), so no state
is carried by color alone.

Measured on the harness demo with a tooltip open (Tab twice): computed
colors as in the table; axe reports 1 `color-contrast` violation by default
(the description, as expected), 0 under emulated `prefers-contrast: more`
in light and with dark tokens. With emulated `forced-colors: active`,
Chromium paints with its own test palette (inactive line `GrayText`, active
line, focused line and current dot `Highlight`, tooltip border 1px); axe
reports 2 contrast findings against that test palette, which is not a real
system theme, so they were not acted on. Real Windows high-contrast themes
were not tested.

## Not compared visually

- **Sound.** Upstream plays Web Audio hover and press sounds by default and
  creates its AudioContext on the first hover. The port's sounds are opt-in
  (`enableSound`, default `false`) and the context is created only inside a
  press or after the page has had a user gesture. Sound is not visual; it was
  checked with an instrumented `AudioContext` (see below).
- **Dark and right-to-left.** Upstream has neither. Dark mode uses the
  item's own dark variables (lines inverted, tooltip unchanged except a
  lighter description, `#c4c4cc`, for contrast); RTL places the bar on the
  right edge with tooltips opening leftward.

## Behavior checks (port only)

A local Playwright script against the harness page:

- The nav is named "Project table of contents"; each link is described by
  its description (aria-describedby) and contains a `role="tooltip"`.
- `aria-current` starts on entry 1 and moves to entry 3 after scrolling to
  its section.
- Tab opens entry 1's tooltip (opacity 1); Escape closes it (opacity 0)
  with focus kept.
- Enter on entry 2 scrolls smoothly (mid-scroll sample taken), lands with
  the section at the top, pushes `#applied-compute` and marks it active.
- Hover: preview dots go from image 1 to image 2 after 1.5 s; with reduced
  motion they stay on image 1, the line has `transition-property: none`,
  and a click jumps instantly.
- Sound: with the default options no AudioContext is created; with
  `enableSound` it is created only on the press, when the page has a user
  activation.
- RTL: the links sit at x 1182 to 1246 of 1280 (inline-start edge on the
  right) and the tooltip opens to their left (x 888 to 1174).

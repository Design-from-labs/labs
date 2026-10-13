# Segmented Pill: port fidelity

- Upstream: danielwh2/segmented-pill @ 489bdf7374868d40bc2aa4adc3e03ebfe8a90e99 (npm `segmented-pill` 0.1.3): `src/index.js` (core), `src/react.js` (React adapter), `src/react.d.ts` and `src/style.css`
- Upstream demo: the repository has no demo page, so the harness renders upstream's own React adapter and stylesheet, imported from the clone at the pinned commit (outside this repository), on a blank page with the README's markup: `<SegmentedPill aria-label="Section" items={...} value onValueChange animated />`
- Port page: the same page with the same props and the same stage, rendering each port variant (`none`, `radix`, `base`, `aria`) in place of upstream's component; the upstream stylesheet is removed from the port side (the port ships its own)
- Harness: React 19.3.0, Radix UI 1.6.7, Base UI 1.9.0, React Aria Components 1.22.1, Chromium 156 (Playwright 1.64.0), device scale 1, light scheme
- Diff: pixelmatch 7.2.0 (S-152), threshold 0.1, on the whole frame and on the 320 x 140 stage; percent of all pixels in the frame
- Viewports: 1280x800 and 375x812
- Target: at most 0.1%. Worst frame: **0.0000%** (0 differing pixels in 76 port captures, plus 12 upstream-against-itself controls)

## Method

The stage holds two controls, both rendered by the component under test:
"Section" (Overview, Activity, Settings; controlled; `animated`) and "Range"
(Day, Week, Month, Year with Year disabled; uncontrolled, default Week; not
animated). Each state is captured on both sides in a fresh browser context,
after fonts are ready and two animation frames. The pointer is parked at (0, 0)
before every capture except `hover`, so no side shows a stray hover.

In-flight frames are not timed by wall clock. After the click, the harness
pauses every Web Animation and CSS transition on the page and sets its
`currentTime` to the same value (60 ms or 130 ms), so both sides freeze on
the same keyframe of the pill's slide and squash. Settled frames wait 700 ms
after the click. The `rtl` states put `dir="rtl"` on the document element;
the `reduced-click` state emulates `prefers-reduced-motion: reduce`. The
keyboard states (Tab, ArrowRight, End) are compared against upstream for the
default variant only: the Radix, Base UI and React Aria variants keep the
same look but have their primitive's own keyboard model (see below), so a
keyboard frame would compare two different behaviours.

The control row captures upstream against upstream (same page, same states,
two fresh contexts): the noise floor of this harness.

## Results

Worst of the two comparisons per frame (whole frame, 320 x 140 stage), in
differing pixels. "=" marks a capture whose two screenshots are
byte-identical; "~" marks one that differs in bytes only below
pixelmatch's threshold (no pixel is flagged; see the note after the table).

### 1280x800

| State | Default | Radix | Base UI | React Aria |
| --- | ---: | ---: | ---: | ---: |
| rest | 0 px = | 0 px = | 0 px = | 0 px = |
| hover on the third item | 0 px = | 0 px = | 0 px = | 0 px = |
| second item clicked, settled | 0 px = | 0 px = | 0 px = | 0 px = |
| third item clicked, paused at 60 ms | 0 px = | 0 px = | 0 px = | 0 px = |
| third item clicked, paused at 130 ms | 0 px = | 0 px = | 0 px = | 0 px = |
| second control: third item clicked, settled | 0 px = | 0 px = | 0 px = | 0 px = |
| Tab, ArrowRight (default variant only) | 0 px = | n/a | n/a | n/a |
| Tab, Tab, End (default variant only) | 0 px = | n/a | n/a | n/a |
| reduced motion, third item clicked | 0 px = | 0 px = | 0 px = | 0 px = |
| right to left, rest | 0 px ~ | 0 px ~ | 0 px ~ | 0 px = |
| right to left, third item clicked, settled | 0 px = | 0 px = | 0 px = | 0 px = |

### 375x812

| State | Default | Radix | Base UI | React Aria |
| --- | ---: | ---: | ---: | ---: |
| rest | 0 px = | 0 px = | 0 px = | 0 px = |
| hover on the third item | 0 px = | 0 px = | 0 px = | 0 px = |
| second item clicked, settled | 0 px = | 0 px = | 0 px = | 0 px = |
| third item clicked, paused at 60 ms | 0 px = | 0 px = | 0 px = | 0 px = |
| third item clicked, paused at 130 ms | 0 px = | 0 px = | 0 px = | 0 px = |
| second control: third item clicked, settled | 0 px = | 0 px = | 0 px = | 0 px = |
| Tab, ArrowRight (default variant only) | 0 px = | n/a | n/a | n/a |
| Tab, Tab, End (default variant only) | 0 px = | n/a | n/a | n/a |
| reduced motion, third item clicked | 0 px = | 0 px = | 0 px = | 0 px ~ |
| right to left, rest | 0 px ~ | 0 px ~ | 0 px ~ | 0 px = |
| right to left, third item clicked, settled | 0 px = | 0 px = | 0 px = | 0 px = |

| Control | 1280x800 | 375x812 |
| --- | ---: | ---: |
| upstream against upstream: rest | 0 px (=) | 0 px (=) |
| upstream against upstream: click, settled | 0 px (=) | 0 px (=) |
| upstream against upstream: click, 130 ms | 0 px (=) | 0 px (=) |
| upstream against upstream: right to left, rest | 0 px (=) | 0 px (~) |
| upstream against upstream: reduced motion, click | 0 px (=) | 0 px (=) |
| upstream against upstream: right to left, click | 0 px (=) | 0 px (=) |

The noise floor is zero for settled, mid-flight, right to left and reduced
motion frames alike, so no tolerance was needed. 69 of the 76 port captures
are byte-identical to upstream's. The seven marked "~" (the default, Radix and
Base UI variants right to left at rest, at both sizes; React Aria with reduced
motion at 375) differ in bytes only: no pixel is
flagged at pixelmatch's 0.1 threshold. The control shows the same thing
upstream against itself (right to left at rest, 375), so it is the browser's
text anti-aliasing, not the port (the largest channel difference in the lossy
WebP crops is 26 of 255; the screenshots were compared as PNG).

## Evidence

`<variant>-<state>-<viewport>-before.webp` is upstream (cropped to the
320 x 140 stage), `-after.webp` the port, `-diff.webp` the pixelmatch overlay
(red: differing pixels; none). Where before and after are byte-identical the
`-after` image is dropped (size budget). Kept: every state of the default
variant at both sizes as diffs, with before images for rest, the 130 ms
mid-slide frame and right to left after a click; for Radix, Base UI and
React Aria the rest, 130 ms and right to left frames at 1280 as diffs (the
130 ms before image too) and the rest frame at 375.

## Deviations from upstream

The default variant is upstream's code (core, adapter, stylesheet) with
these changes; the primitive variants share its stylesheet and add their own
behaviour.

- **Renames.** The classes `segmented-control` and
  `segmented-control__indicator` are `segmented-pill` and
  `segmented-pill__indicator` (the item is named for the component, not for
  upstream's generic class); the exports are `SegmentedPill` (as upstream's
  React adapter) and the core is `segmentedControl` (as upstream).
- **Tokens.** Upstream's `--segmented-*` custom properties are read as
  `--segmented-pill-*` (component-prefixed), with upstream's values as the
  fallbacks, so the default frame is unchanged: `track` rgb(0 0 0 / 5%),
  `pill` #fff, `text` #52525b, `text-active` #18181b, `focus` #2563eb,
  `shadow` `0 0 0 1px rgb(0 0 0 / 6%), 0 1px 2px rgb(0 0 0 / 7%)`. Dark values
  are a Labs addition. Per-instance variables (`radius`, `gap`, `padding`,
  `duration`, `easing`, `font-family`) are read the same way.
- **Stylesheet in the component.** `style.css` is a string in
  `segmented-pill-styles.ts`, rendered as a hoisted `<style>` (React 19 adds
  it to `<head>` once, however many controls render), instead of a CSS
  import; the rules and their order are upstream's. An item is
  `:is(button, label)` (same specificity as upstream's `button`) so the React
  Aria variant's radio labels share every rule.
- **Font.** Upstream's stack starts with Geist and falls back to the system
  sans; no font ships. `--segmented-pill-font-family` sets another (the docs
  suggest `var(--font-sans)`).
- **Right to left.** In the default variant the arrow keys follow the
  reading direction (upstream: ArrowRight is always next), and the pill is
  re-measured when a `dir` attribute changes, since a direction switch moves
  the items without resizing the row. In left to right nothing changes.
- **Scaled ancestors.** Upstream sizes and places the pill from
  `getBoundingClientRect()`, which is in screen pixels: under a scaled
  ancestor (the gallery's stills, the wall's tiles on a phone, an app that
  zooms a panel) the pill came out the wrong size. The port divides by the
  control's scale (its rect against its layout size, read from its computed
  style) so the pill is placed in the control's own pixels. Without a
  transform the scale is exactly 1 and the values are upstream's (the numbers
  above). Found when the first gallery still showed an oversized pill; guarded
  by an end-to-end test on the scaled preview pages (P-223).
- **Additions that do not change the default frame:** `prefers-contrast: more`
  (every label at the active color, the pill outlined) and `forced-colors:
  active` (pill in Highlight, selected label in HighlightText).
- **React API.** Unchanged from upstream's `react.d.ts` (`items`, `value`,
  `defaultValue`, `animated`, `onValueChange`, root attributes). The
  primitive variants take the same props. Radix and Base UI use the
  toggle group (`dir` comes from the surrounding document; passing `dir` to
  the root is not supported), React Aria uses a radio group; the indicator is
  positioned by the shared `segmented-pill-indicator` hook with the same
  transition and squash as upstream's core.
- **Keyboard (variants).** Default: tablist; selection follows the arrow keys
  (upstream). Radix and Base UI: the arrows move focus (wrapping) and Space
  or Enter selects; pressing the selected item again keeps it selected.
  React Aria: radio group, the arrows select. These are the primitives' own
  models, listed in the item's docs.
- **Not ported.** The Vue adapter and the shadcn registry wrapper
  (`registry/`); the Labs registry replaces the wrapper.

## Enhancement checks (not part of the pixel comparison)

- axe (WCAG 2.0 to 2.2 A/AA, best practices) on the built component page,
  light and dark: 0 violations on the whole page (end-to-end suite) and on the
  demo at 1280 and 375; the same page right to left. The Radix, Base UI and
  React Aria demos are covered by the same switcher (the suite runs the
  default demo; each primitive variant is exercised by the keyboard tests
  below).
- Keyboard: default variant, Tab reaches the selected tab, ArrowRight moves
  and selects, Home and End jump, and in right to left ArrowLeft is next; the
  pill follows (its center within 1.5 px of the selected item's). Radix and
  Base UI: ArrowRight moves focus (wrapping), Space selects, the group is
  named by `aria-label`; React Aria: the radio group's arrows select.
- Reduced motion: the pill moves without sliding or squashing (the
  reduced-motion frames above, 0 px against upstream); on the wall the tile
  stays on its first item with no animation running.
- Right to left: arrows swapped in the default variant, the pill lands on the
  selected item in every variant (frames above).
- Overflow: the document does not scroll sideways at 320, 375 and 1280 on the
  built component page.
- Scaled ancestors: on the scaled preview pages every variant's pill sits on
  the first item (position and size within 2 px), at the 1.6 scale of the
  gallery stills.
- Contrast: the white pill on the 5% track is 1.1:1 (upstream's palette, kept
  as the default for fidelity); the selected label darkens, and under
  `prefers-contrast: more` every label takes the active color and the pill is
  outlined. Inactive labels are #52525b on the track, 6.8:1 (axe clean).

## Primitive and icons

Primitives `none` (default), `radix` (`radix-ui` Toggle Group, single),
`base` (`@base-ui/react` Toggle Group, single) and `aria`
(`react-aria-components` Radio Group), all with one API and one look
(shared stylesheet and indicator). The item installs **beside** shadcn's
`toggle-group`, not over it: its files are `segmented-pill*.ts(x)` and none
imports or writes `components/ui/toggle-group` (the Radix and Base UI
variants import their primitive packages directly). Icon set `none`: upstream
draws no glyphs; labels are any React node, so an app's icon can sit beside
the text.

## Stage, tile and loop

No stage: a segmented control is a small inline part, shown on the page and
on the wall as the demo itself (a control and a line of placeholder copy that
follows the selection). The tile is 1 by 1. The loop hydrates the specimen
and clicks control 1, 2 and 0 (Activity, Settings, Overview) with a pause
after each, over 5.4 s, so the pill slides and squashes along the control;
the click drives the component's own handlers. Checked on a `LABS_INCLUDE_BETA=1` build: on the wall the selection runs
Overview, Activity, Settings and back, the URL and page scroll stay put, no
focus moves into the tile, and with reduced motion or "Pause animations" on
the tile stays on its first item with nothing running.

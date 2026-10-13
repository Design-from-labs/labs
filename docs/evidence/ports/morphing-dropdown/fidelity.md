# Morphing Dropdown: port fidelity

- Upstream: arknow91/liquid-taffy @ 4bcf4005f857c371bf53d60b2cee14abcecedf6a (MIT), `src/components/LiquidMorph` with the shared `src/components/liquid` modules, run from its own Vite demo (installed with its own lockfile outside this repository), the stage's `Morphing dropdown` tab
- Port page: the same upstream stage (tabs, theme switch, tokens and global stylesheet), with the Morphing Dropdown component swapped for the port (`<MorphingDropdown theme={theme} />`); the port's own palette tokens are set to upstream's values
- Harness: React 19.3.0, Motion 14.1.0, Chromium (Playwright 1.64.0), device scale 1, no reduced motion; the upstream demo keeps its own GSAP (fidelity run only, never shipped)
- Diff: pixelmatch (S-152), threshold 0.1; percent of all pixels in the frame
- Viewports: 1280x800 and 375x812, light and dark frames
- Target: at most 0.1% of the frame, or the measured upstream-against-itself noise floor
- Worst frame: **0.0801%** (sel2, dark, 375x812); upstream against itself reaches 0.1363% over the same frames
- Frames: closed, open, hover, 1, 2 and 4 rows ticked, in both frames and both sizes (24 frames)

## Method

Both pages load, the hook picks the tab and the frame (light or dark), then
plays the same steps on both sides: click the button to open, click a row to
tick it, hover a row, click the button to close. Pointer clicks use the real
mouse at the element's center and park the pointer at (2, 2) after each step,
so no hover state leaks into a frame. Each frame is taken 1.5 s after the
last step, so every spring has settled (settled frames, not mid-animation).
The text of every frame is rendered by the same font file on both sides.

The **noise floor** is the same capture of upstream against upstream: Chromium
re-rasterizes text differently between two loads of the same page, so a
frame can differ by a few hundred pixels with nothing changed. It is listed
beside each port result (one sample per frame).

## Results

| State | Theme | 1280x800 | noise | 375x812 | noise |
| --- | --- | ---: | ---: | ---: | ---: |
| closed | light | 0 px (0.0000%) | 0 px (0.0000%) | 0 px (0.0000%) | 0 px (0.0000%) |
| closed | dark | 0 px (0.0000%) | 0 px (0.0000%) | 0 px (0.0000%) | 0 px (0.0000%) |
| open | light | 181 px (0.0177%) | 151 px (0.0147%) | 155 px (0.0509%) | 57 px (0.0187%) |
| open | dark | 52 px (0.0051%) | 163 px (0.0159%) | 109 px (0.0358%) | 160 px (0.0525%) |
| hover | light | 29 px (0.0028%) | 164 px (0.0160%) | 183 px (0.0601%) | 173 px (0.0568%) |
| hover | dark | 39 px (0.0038%) | 136 px (0.0133%) | 57 px (0.0187%) | 87 px (0.0286%) |
| sel1 | light | 169 px (0.0165%) | 202 px (0.0197%) | 121 px (0.0397%) | 11 px (0.0036%) |
| sel1 | dark | 287 px (0.0280%) | 243 px (0.0237%) | 199 px (0.0654%) | 235 px (0.0772%) |
| sel2 | light | 35 px (0.0034%) | 195 px (0.0190%) | 17 px (0.0056%) | 143 px (0.0470%) |
| sel2 | dark | 182 px (0.0178%) | 239 px (0.0233%) | 244 px (0.0801%) | 271 px (0.0890%) |
| sel4 | light | 7 px (0.0007%) | 192 px (0.0187%) | 11 px (0.0036%) | 4 px (0.0013%) |
| sel4 | dark | 0 px (0.0000%) | 208 px (0.0203%) | 0 px (0.0000%) | 415 px (0.1363%) |



## Evidence

`<state>-<frame>-<viewport>-before.webp` is upstream, `-after.webp` the port,
`-diff.webp` the pixelmatch overlay (red: differing pixels). `fidelity.json` has the
numbers of every frame. Only a representative set is kept (size budget); every frame
passed or is listed above. The kept stills are cropped by 80 px at the top and the
bottom to leave out the upstream demo page's own chrome (its theme switch and
component tabs, not ported); the measured numbers are of the full viewport.

## Icon library style (enhancement)

The default item keeps upstream's own glyphs (decision 0025), so everything above is
measured on it. The `icons` style (`morphing-dropdown-icons-lucide` and `-icons-phosphor`) fills the trigger plus, the row shapes and the tick from an icon library
instead: Lucide's or Phosphor's nearest circle, cross, triangle, square, plus and
tick, drawn at the same 12px and 16px boxes. Nothing else changes: the frame, the
goo, the springs and the tick morph are the same files (the glyph layer is the only
file that differs, `taffy-glyphs.tsx`). The morph turns each library glyph as a
group, so the spin-away and the tick growing from it work as in the default style.
These are not upstream-fidelity frames; the stills show both frames with the icons
style (`enhance-icons-lucide-1280x800.webp`, `enhance-icons-phosphor-1280x800.webp`).
Install either style on its own: both write `taffy-glyphs.tsx`, so a project uses one
style for all three surfaces.

## Primitive variants (enhancement)

The default item writes the WAI-ARIA menu button pattern itself (`taffy-menu.tsx`).
The `-radix`, `-base` and `-aria` items replace that one file with the same exports
built on Radix's DropdownMenu, Base UI's Menu or React Aria's Menu; the surface, its
stylesheet and the choreography are the same files, so the props and the look are the
same (decision 0022). They are measured against upstream like the default item, on
the frames that exercise the menu (open, ticked rows, reclosed, hovered satellite;
light and dark; both sizes; 8 frames each):

| Primitive | Frames | Worst frame | Frames above 0.1% | Upstream against itself on the same frames |
| --- | ---: | --- | --- | --- |
| Radix | 8 | 0.0952% (sel2, dark, 375x812) | none | 0.0105 to 0.0470% |
| Base UI | 8 | 0.0913% (sel2, dark, 375x812) | none | 0.0105 to 0.0470% |
| React Aria | 8 | 0.0897% (sel2, dark, 375x812) | none | 0.0105 to 0.0470% |

No primitive frame is above 0.1%.

How each is made to keep the liquid in one layer with its button (the goo filter
draws both as one mass, so a portalled or floating panel cannot be used):

- **Radix.** `DropdownMenu` with `forceMount`, `modal={false}` and no `Portal`; the
  content stays mounted, the surface runs its own open and close, and Radix's
  positioner box is turned into a plain layer over the anchor by a stylesheet rule
  (`[data-radix-popper-content-wrapper]:has(> [data-taffy-menu])`), so the panel keeps
  the surface's geometry. Radix owns the roles, ids, roving focus, typeahead, Home
  and End, Escape and outside dismissal. The trigger opens on click, not Radix's
  pointer down, so a press-and-drag on the button pulls the liquid finger without
  toggling the menu. Radix keeps Tab inside an open menu; here Tab closes it and
  returns focus to the button.
- **Base UI.** `Menu.Root` (`modal={false}`), `Menu.Portal` into the surface's own
  root (`container`, `keepMounted`) and `Menu.Positioner` made a plain layer by a
  stylesheet rule with `!important` (Base UI writes its position inline); the popup's
  initial and final focus are off because the surface hands focus over. Same click
  trigger. The portal target exists after the first commit, so the panel is not in the
  server markup (it is hidden when closed).
- **React Aria.** `Menu` and `MenuItem` for the rows (roles, `aria-checked`, roving
  focus, typeahead, selection), inside the panel box the surface animates, with the
  travelling hover pill beside the Menu. React Aria's `Popover` is not used: it
  portals the panel to the body and hides the rest of the page from assistive
  technology, and the goo needs the panel beside its button. The trigger and the Escape
  and outside dismissal are the default wiring. The speed dial's arrow keys are
  handled by the surface (an arc has no vertical order).

Measured facts that shaped the React Aria variant (a probe page, not shipped):

- A `Menu` with any child that is not an item (a plain `span` here) renders no
  items at all, so the hover pill cannot be a child of the Menu.
- Selection happens on press, before the click: the order is `pressStart`,
  `onSelectionChange`, `press`, `click`. A click handler that cancels the toggle
  (the surfaces do this for the click that ends a press-and-drag) cannot cancel a
  tick. A press on a row is a selection gesture and never starts a drag (only the
  button, the panel's padding and the satellites do), so the cancel has nothing to
  cancel on a row; it is kept for the other variants.
- The rows are `div` elements with the menu roles (the Radix and Base UI rows, and the
  default ones, are buttons).

`enhance-<primitive>-open-dark-1280x800-diff.webp` is the pixelmatch overlay of each primitive's open frame against upstream.

## Deviations from upstream

- **Neutral hue set (owner decision).** The four shapes carry a per-shape hue on the
  dark frame (hover, tick, seam and burst). Upstream's four hues are replaced by a
  neutral set so the shape set does not carry a known controller's colour identity:
  circle teal (#0d9488 light, #2dd4bf dark), cross violet (#7c3aed, #a78bfa), square
  sky (#0284c7, #38bdf8), triangle amber (#d97706, #fbbf24). The dark value is the one
  worn; the light value is held but not worn, as upstream's monochrome light frame
  rule has it. Shapes, layout and labels are unchanged. The same table is applied to
  the upstream demo used for the comparison (fidelity run only), so both sides get
  identical inputs and every number above is a like-for-like comparison.
- **Tween engine.** Upstream choreographs with GSAP, which is proprietary and is not
  shipped or listed as a dependency (S-421). `liquid-taffy-engine` (item
  `taffy-tween.ts`) is a small timeline on Motion's frame loop (`frame.update`,
  `cancelFrame`, `cubicBezier`) with the semantics the choreography uses:
  positions in seconds, `set` and `call`, `overwrite: "auto"`, `autoAlpha`,
  `keyframes`, `stagger`, `fromTo`, play, reverse and `timeScale`, transforms
  composed around an origin (a `transform` matrix attribute on SVG parts, with the
  origin baked in, so `getCTM()` reads the real place), the named power and back
  eases, cubic beziers, and the two spring curves as sampled polylines (upstream's
  custom ease tables). Every timing and value in the components is upstream's.
- **Shared engine as its own item.** The modules the three surfaces share
  (`liquid/*`) ship once as `liquid-taffy-engine` (kind `lib`, internal), which
  each component lists in `registryDependencies` and imports through
  `@/lib/taffy-*`. Upstream's `liquid/goo.ts`, `hues.ts`, `motion.ts`, `seam.ts`,
  `select.ts`, `sfx.ts`, `springs.ts`, `squircle.ts`, `stretch.ts` and
  `theme.ts` keep their names with a `taffy-` prefix (so an install cannot collide
  with a generic `motion.ts`); the dropdowns' `IconMorph`, `RowHover` and
  `SelectionBurst`, their shared stylesheet and the glyph and menu layers
  are item files (`taffy-icon-morph.tsx`, `taffy-row-hover.tsx`,
  `taffy-selection-burst.tsx`, `taffy-dropdown-styles.ts`, `taffy-glyphs.tsx`,
  `taffy-menu.tsx`).
- **Renames.** `LiquidAdd` is `AnchoredDropdown`, `LiquidMorph` is `MorphingDropdown`,
  `LiquidMenu` is `SpeedDial`; CSS Modules class names become
  `<component>-<name>` in a hoisted `<style>` (decision 0013); private custom
  properties become `--<component>--*`.
- **Tokens.** The palette is component-prefixed variables with upstream's values as
  the light and dark `cssVars` (and as fallbacks): `fill` #ffffff / #212326, `rim`
  #dadada / #2f3235, `icon` #252731 / #ffffff, `icon-hover` #000000 / #ffffff,
  `text` #1f2029 / #ffffff, `trigger-tint` and `item-tint` black or white at 4.5%
  (2% for the dark trigger), `seam` #785dd6 / #8a68ff, `shadow` a soft drop-shadow /
  none, `focus-ring` #1172fa; the speed dial adds `hover-tint`, `tooltip` and
  `tooltip-foreground`. The type inherits the page font at upstream's 13px.
- **Frame.** Upstream's stage passes the frame by context and a `data-theme`
  attribute. The port takes a `theme` prop, else a `LiquidThemeProvider`, else the
  page: dark inside a `.dark` ancestor, followed live (a layout effect, so a surface
  mounting on a dark page is dark before the first paint). The stage chrome (tabs,
  the light and dark switch) is demo-only and not ported; the console logo on the
  stage's switch is not ported either.
- **Sound.** Upstream's synthesized voice always plays. The port keeps the voice
  (`gooSfx`, unchanged synthesis) behind a `sound` prop that defaults to off, and it
  plays only while the page has transient user activation, so a scripted click or
  the wall tile never makes a sound.
- **Keyboard and screen reader.** Upstream has the ARIA menu markup; the port adds
  the full interaction: Enter, Space and ArrowDown open on the first row, ArrowUp on
  the last; arrows move and wrap, Home and End jump, a letter jumps to the next row
  that starts with it, Escape closes and returns focus to the trigger, Tab closes
  and moves on; the panel is `inert` while closed; a keyboard-focused row lights
  like a hovered one. The press-and-drag gesture is pointer-only.
- **Props.** Upstream fixes the rows; the port takes `items` (the geometry follows
  the count), controlled and uncontrolled `value` and `open`, `label`, `menuLabel`,
  `theme`, `sound` and `className`.
- **Server markup.** The resting picture is in the server render (upstream placed it
  after mount), so the first paint is right and a surface can mount open.
- **Logical properties.** Row text alignment and the panel's inline offset use
  logical properties; the goo canvas and the burst layer are centered on the button,
  so they are direction-independent.
- **Accessibility additions that do not change the default frame.** `forced-colors`
  (system-colour borders and a Highlight selection, the liquid picture steps aside)
  and `prefers-contrast: more` (rim and selection wash darken) are added; the
  default palette keeps upstream's pale rim.
- **Contrast.** Measured default ratios (WCAG 2): label text on the fill 16.19:1
  (light) and 15.75:1 (dark), icon 14.86:1 (light); the focus ring 4.36:1 (light) and
  3.61:1 (dark); the rim against the fill is 1.40:1 (light) and 1.22:1 (dark), below the
  3:1 a control boundary needs, as upstream draws it. It is lifted only on request
  (`prefers-contrast: more`, `forced-colors`) or by overriding `--<component>-rim`
  (ports/README.md, "fidelity default, contrast on request").
- **Touch.** `touch-action: none` on the button and panel, so a touch drag pulls the
  liquid finger instead of scrolling the page and cancelling the gesture.
- **Inline transform properties.** Like upstream's tween library, the engine writes
  `translate`, `rotate` and `scale` as `none` beside the composed `transform` on HTML
  elements, so the inline style matches upstream's.

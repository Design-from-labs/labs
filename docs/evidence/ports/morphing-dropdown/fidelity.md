# Morphing Dropdown: port fidelity

- Upstream: arknow91/liquid-taffy @ 4bcf4005f857c371bf53d60b2cee14abcecedf6a (MIT), `src/components/LiquidMorph` with the shared `src/components/liquid` modules, run from its own Vite demo (installed with its own lockfile outside this repository), the stage's `Morphing dropdown` tab
- Port page: the same upstream stage (tabs, theme switch, tokens and global stylesheet), with the Morphing Dropdown component swapped for the port (`<MorphingDropdown theme={theme} />`); the port's own palette tokens are set to upstream's values
- Harness: React 19.3.0, Motion 14.1.0, Chromium (Playwright 1.64.0), device scale 1, no reduced motion; the upstream demo keeps its own GSAP (fidelity run only, never shipped)
- Diff: pixelmatch (S-152), threshold 0.1; percent of all pixels in the frame
- Viewports: 1280x800 and 375x812, light and dark frames
- Target: at most 0.1% of the frame, or the measured upstream-against-itself noise floor
- Worst frame: **0.0989%**
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
beside each port result (one sample per frame; the one frame that needed
more samples has its own section).

## Results

| State | Theme | 1280x800 | noise | 375x812 | noise |
| --- | --- | ---: | ---: | ---: | ---: |
| closed | light | 0 px (0.0000%) | 0 px (0.0000%) | 0 px (0.0000%) | 0 px (0.0000%) |
| closed | dark | 0 px (0.0000%) | 0 px (0.0000%) | 0 px (0.0000%) | 0 px (0.0000%) |
| open | light | 202 px (0.0197%) | 139 px (0.0136%) | 157 px (0.0516%) | 9 px (0.0030%) |
| open | dark | 15 px (0.0015%) | 180 px (0.0176%) | 153 px (0.0502%) | 44 px (0.0144%) |
| hover | light | 40 px (0.0039%) | 21 px (0.0021%) | 43 px (0.0141%) | 9 px (0.0030%) |
| hover | dark | 141 px (0.0138%) | 129 px (0.0126%) | 150 px (0.0493%) | 31 px (0.0102%) |
| sel1 | light | 32 px (0.0031%) | 191 px (0.0187%) | 196 px (0.0644%) | 44 px (0.0144%) |
| sel1 | dark | 189 px (0.0185%) | 244 px (0.0238%) | 104 px (0.0342%) | 226 px (0.0742%) |
| sel2 | light | 20 px (0.0020%) | 29 px (0.0028%) | 61 px (0.0200%) | 56 px (0.0184%) |
| sel2 | dark | 182 px (0.0178%) | 396 px (0.0387%) | 301 px (0.0989%) | 113 px (0.0371%) |
| sel4 | light | 110 px (0.0107%) | 150 px (0.0146%) | 77 px (0.0253%) | 89 px (0.0292%) |
| sel4 | dark | 299 px (0.0292%) | 0 px (0.0000%) | 0 px (0.0000%) | 0 px (0.0000%) |



## Evidence

`<state>-<frame>-<viewport>-before.webp` is upstream, `-after.webp` the port,
`-diff.webp` the pixelmatch overlay (red: differing pixels). `fidelity.json` has the
numbers of every frame. Only a representative set is kept (size budget); every frame
passed or is listed above.

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

## Deviations from upstream

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

# 0025: Keep upstream's own glyphs as the default variant and offer icon libraries as a style

- Status: Accepted
- Date: 2026-10-13
- Deciders: Port pod I (VideoPlayer), under the owner's batch I brief
- Sources: S-404, S-407, S-184, S-005, S-006, S-004

## Context

The owner's standard (S-184) asks for Lucide and Phosphor variants wherever a
component renders icons, and for the fidelity variant to stay the default.
The video player (S-404) draws seven control glyphs (play, pause, volume,
muted, picture-in-picture, enter and leave fullscreen) as its own inline SVG,
tuned to its stroke widths and sizes; no icon library reproduces them, so a
`-lucide` default would change the default look. The contract's item names
(`<component>[-<style>][-<primitive>][-<iconset>]`) allow an icon-free item
(`video-player`) beside icon-set items only when they differ by style, and
before this change the ports exporter gave every variant the component's
icon sets and no style, and the `designfrom` CLI decided whether `--icons`
applied by looking at all of a component's items at once.

## Decision

- The default item, `video-player`, keeps upstream's glyphs: icon set
  `none`, no style. A second style, `icons` (switcher label "Icon library"),
  fills the same seven slots from an icon library and ships as
  `video-player-icons-lucide` and `video-player-icons-phosphor`.
- `scripts/export-ports.mjs`: a variants-shape `variants[]` entry may set
  `style`, `label` and its own `iconSets`; the item name, title and the
  `meta.json` variant carry them.
- `designfrom add`: an item whose name equals its component no longer
  bypasses resolution, and the primitive and icon axes are decided within the
  requested style, so `designfrom add video-player` gives the upstream glyphs
  and `--style icons [--icons phosphor]` the library icons.

## Alternatives

| Option | Why not |
| --- | --- |
| `video-player-lucide` as the default, upstream glyphs dropped | Changes the default look (the glyphs differ in shape and weight); against fidelity first. |
| Ship only the upstream glyphs (icon set `none`) | The standard asks for both icon sets where a component renders icons. |
| An `icons` prop on one item that accepts components | Both libraries would be dependencies of every install; the contract's per-icon-set items exist to avoid that. |
| Name the upstream-glyph item as a style (`video-player-glyphs`) | The default style is the unnamed one; renaming the faithful default makes the library style look like the original. |

## Evidence

`scripts/export-ports.test.mjs` ("a style with its own icon sets beside an
icon-free default") and `packages/cli/test/cli.test.mjs` ("resolves the icon
axis within the requested style"); `docs/evidence/ports/video-player/`
(the default at 0.0000% against upstream; the icon styles in
`enhance-icons-*.webp`).

## Consequences

Other ports with hand-drawn glyphs can follow the same shape. The component
page lists the style in its variant switcher (contract section 8).

## Re-test when

The contract gains an explicit "upstream glyphs" icon set, or an icon library
ships glyphs matching the upstream ones.

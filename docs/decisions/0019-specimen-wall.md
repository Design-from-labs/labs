# 0019: Show /ui as a wall of specimens with no text on the tiles

- Status: Accepted (amends [0012](0012-gallery-view-transitions.md): the tile title no longer morphs)
- Date: 2026-10-12
- Deciders: Owner (brief), Pod GRID
- Sources: S-158, S-159, S-160, S-046, S-045

## Context

The owner asked for the `/ui` gallery to read like their own portfolio grid
and a reference screenshot: a dense wall of soft gray tiles, each showing a
component in its raw form and nothing else. No title, meta, badges or text
chrome on a tile. Everything else (title, description, variants, source,
install, credits) appears only on the component page, which the tile still
expands into (decision 0012).

The other requirements were these:

- a size per component, additive to the contract;
- each tile still an accessible link, with a visible focus ring;
- static-first;
- no layout shift (CLS at most 0.1);
- one or two columns on phones, with full-bleed tiles;
- the morph from the specimen to the hero.

## Decision

- **Contract revision 4:** an optional `tile: { span: 1|2, rows: 1|2|3,
  surface: light|dark }` ([contract 4.2](../contract.md)), validated by the
  schema and tested in `scripts/meta-wall.test.mjs`. Defaults: 1x1 on light;
  a staged layout part is 2x2.
- **Layout:** a CSS grid with `grid-auto-flow: row dense`. There are 4
  columns from a 960px wall, 3 from 640px, 2 from 360px and 1 below that. The
  breakpoints are container queries on the wall, so the layout follows the
  wall rather than the window. The row unit is four fifths of a column,
  computed from the wall's width (`cqw`), so every box is reserved in CSS
  before anything loads, with no script and no shift. Tiles are sorted
  largest first, so the dense packing fills holes with small tiles and the
  reading order stays close to the visual order. On phones a full-width
  tile is at least two units tall.
- **Look, from the owner's grid** (rules only, re-implemented; S-160):
  - hairline gaps (4px on phones, 6px wider);
  - a small radius (8px);
  - soft surfaces: `--tile-surface` and `--tile-surface-dark`, light and dark
    site themes;
  - on hover, the lift from that grid (2px up, 1.2% larger, a soft shadow)
    on 260 ms `cubic-bezier(0.19, 1, 0.22, 1)`, compositor-only (transform
    and shadow) and never under reduced motion;
  - generous padding (`clamp(1rem, 6cqi, 2.5rem)`);
  - full bleed below 640px.
- **Dark surface:** the tile and the component page's hero both get `.dark`,
  which switches the theme tokens inside, so the specimen renders in dark
  and the morph keeps its ground.
- **Accessibility:** the tile is the link. Its name is "Title: first
  sentence of the description" (`aria-label`, plus "(beta)" on preview
  builds), and it draws a 2px focus ring. The specimen is `aria-hidden` and
  `inert`, so the demo's own controls never take focus from the wall.
- **Static-first:** the specimen is the server-rendered demo. Only a
  specimen whose loop needs JavaScript is an island (decision 0020).
- **Morph:** the specimen surface (or a staged entry's device frame) keeps
  `tile-preview-<name>`. With no title on the tile, the heading has no
  partner and fades in. Named tiles without a partner on the other page are
  only children of their image pair, and fade with the page they belong to
  (`::view-transition-old(*):only-child`), so they never linger
  (docs/pitfalls.md, P-051).

## Alternatives

| Option | Why not |
| --- | --- |
| A script-packed masonry (the owner's grid measures natural heights and places each item in the shortest column) | Tile heights here are declared in meta, so CSS can reserve every box and pack with `dense`; measuring would add JavaScript and a frame of unplaced tiles. |
| A pannable, infinite canvas, as in the owner's grid | Hides the catalogue from keyboard and screen-reader users behind a pointer interaction, and costs a runtime; the wall is a list of links. |
| Title on hover (the owner's grid reveals metadata over the tile) | The brief says no text on unexpanded tiles; the name is in the link's label for assistive technology. |
| Measuring each demo to scale it to fit | Needs a script per tile; two CSS `zoom` steps on small tiles and a sensible `span` keep demos inside. |
| Naming only the clicked tile at click time | Would need script on both pages; static names with the `:only-child` fade look right and keep the morph working without JavaScript. Re-test below. |

## Evidence

- `e2e/wall.spec.ts`:
  - no text outside the specimen in any tile, and no headings;
  - the specimen is `aria-hidden` and `inert`, and the link has a label with
    a description;
  - 1, 2 and 4 columns at 320, 375 and 1440px;
  - full bleed and no horizontal scroll on phones.
- `e2e/gallery.spec.ts` and `e2e/stage.spec.ts`: the morph from a specimen
  and from a staged device frame, back and scroll restoration, reduced
  motion, the focus ring, CLS at most 0.1.
- `e2e/a11y.spec.ts`: axe clean on `/ui` in light and dark.
- Screenshots of the wall at 1440 and 375px were reviewed with the owner's
  reference.

## Consequences

- A new component should set `tile.span` when its demo is wide, and
  `tile.surface: dark` when it reads better on dark.
- The wall's DOM order is by tile size, then content order.

## Re-test when

- The wall passes 60 tiles, or a navigation from `/ui` takes more than
  100 ms from input to the new page's first frame on a 4x-throttled CPU:
  name only the clicked tile.
- The CSS `masonry` / `grid-lanes` layout ships in every engine: it could
  replace `dense` with a true masonry that keeps DOM order.

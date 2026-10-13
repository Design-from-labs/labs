# 0028: Ship two text splitters, and keep Morph Icon free of icon libraries

- Status: Accepted
- Date: 2026-10-13
- Deciders: Port pod H (text, annotation and icon motion), under the owner's port brief
- Sources: S-387, S-157, S-382, S-383, S-385, S-005, S-006

## Context

Batch H (S-387) asked for Griffo's kerning-aware SplitText (S-382) and to
evaluate kugiri (S-383), an alternative splitter, porting it only if its
license allows and it adds real value. It also asked for Morph Icon
(S-385), and the owner's standard (S-157) wants Lucide and Phosphor items
for every component that renders icons. Both upstreams are MIT.

Measured in the fidelity harness (Chromium, the site's OFL fonts, 1280x800
and 375x812; `docs/evidence/ports/split-text/fidelity.md`):

- Kerning: both splitters keep it. Against the unsplit text, kugiri's split
  differs by 0.0001% / 0.0003% and Griffo's by 0.0017% / 0.0079%; Griffo
  without its compensation differs by 1.94% / 5.22%.
- Painted lines: on a hyphenated paragraph Griffo returns 5 lines for 4
  painted ones (the block grows 25% taller), on a Japanese paragraph 1 line
  for 5, on a long URL 4 lines for 5. kugiri returns the painted lines in
  all three, and passes its own 55-case suite on upstream and on the port.
- Griffo alone has screen-reader text, re-splitting on resize, the Motion
  variants API and a larger test suite (15 unit files and 3 browser specs).

Morph Icon takes icon geometry as data (node lists or a path `d`) and draws
its own SVG; upstream ships no icon data. lucide-react's public entry does not
expose icon nodes, and upstream documents that filled glyphs such as
Phosphor's do not morph correctly.

## Decision

- Ship both splitters, beta: `split-text` (Griffo's core and Motion
  `SplitText`) for declarative reveals, and `split-lines` (kugiri's splitter
  verbatim, with a Labs React wrapper that adds the font wait, width-change
  re-splits, revert on unmount and screen-reader text) for text whose painted
  lines must be kept: hyphenation, spaceless scripts, long URLs, balanced
  wraps. Each item's docs points to the other.
- Morph Icon ships one item, `morph-icon`, with `iconSets: ["none"]`: it
  imports no icon library and its demo inlines six Lucide icons (ISC,
  S-005). There are no `-lucide` or `-phosphor` items, because the two would
  be byte-identical and a Phosphor item would promise morphs upstream says
  do not work.
- Every component in the batch uses primitive `none`: they render text or a
  decorative graphic; their demos' controls are native buttons.

## Alternatives

| Option | Why not |
| --- | --- |
| Port only Griffo and note kugiri in docs | Leaves the measured line-break failures (hyphens, Japanese, URLs) without an answer in the catalogue. |
| Port only kugiri | Loses Griffo's Motion API, resize handling and screen-reader text, which the batch asked for. |
| Merge kugiri's line measurement into Griffo | Rewrites both upstreams; fidelity first rules it out. |
| Lucide and Phosphor Morph Icon items | Identical files under two names; the Phosphor one would morph filled glyphs badly. |

## Evidence

`docs/evidence/ports/split-text/fidelity.md` (the comparison above, and
Alternatives considered: kugiri), `docs/evidence/ports/split-lines/fidelity.md`
(0.0000% in 18 frames), `docs/evidence/ports/morph-icon/fidelity.md`
(0.0000% in 10 frames), `e2e/text-icon-motion.spec.ts`.

## Consequences

Two splitter items to maintain, with docs that say when to use which. An app
that wants Morph Icon to morph Phosphor or other icons passes their geometry
itself.

## Re-test when

- Griffo keeps painted lines for hyphenated, spaceless-script and URL text
  (re-run the comparison; drop `split-lines` if it matches kugiri).
- lucide-react or Phosphor exports icon nodes and Phosphor publishes outline
  glyphs that morph: reconsider icon-set items for Morph Icon.

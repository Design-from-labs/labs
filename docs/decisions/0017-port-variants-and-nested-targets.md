# 0017: Ports may ship primitive variants and nested file targets

- Status: Accepted
- Date: 2026-10-12
- Deciders: Port pod C (data-display), under the owner's port brief
- Sources: S-184, S-172, S-170, S-032, S-033, S-034, S-004

## Context

Decision 0016 exports ports from flat files with primitive `none`. The
data-display batch has a port whose behavior sits on headless primitives
(the data-table blocks of S-172 use popovers, menus, checkboxes, dialogs,
sliders and accordions, which shadcn ships for Radix, Base UI and React Aria)
and ports with dozens of upstream modules (Liveline, S-170: 26 files of
canvas engine; the data-table: about 60 files). The owner's standard (S-184)
asks for the Radix, Base UI and React Aria variants where a primitive applies,
and for line-for-line fidelity, which merging dozens of modules into a few
flat files works against.

## Decision

- `scripts/export-ports.mjs` accepts a second `component.json` shape,
  `variants`: each variant names a primitive and an ordered list of source
  roots (`src/shared`, then `src/radix`); later roots override earlier ones
  file by file, so only primitive-specific files differ between variants.
  One item is written per primitive and icon set, with the primitive package
  added to `dependencies` and `{primitive}` / `{iconSet}` substituted in
  `registryDependencies`. The flat shape of decision 0016 is unchanged
  (its exports are byte-identical).
- A variants-shape port may set `target`; every file then keeps its upstream
  relative path below it (`components/liveline/draw/line.ts`), and imports
  between an item's files stay relative.
- The Phosphor rewrite of a variants-shape port also maps type imports
  (`LucideIcon`, `LucideProps`) and aliased specifiers, from a per-component
  `icons.json` merged over `ports/icons.json`.

## Alternatives

| Option | Why not |
| --- | --- |
| Merge every port into flat files (0016) | Reasonable for a handful of modules; for 26 to 60 modules it hides the upstream diff that fidelity review depends on. |
| One component directory per primitive | Triples 60 identical files and lets the copies drift. |
| Ship only the Radix variant | The brief asks for all three where shadcn has the equivalents, and it does. |

## Evidence

`scripts/export-ports.test.mjs` (typed Phosphor rewrite; a variants export
with nested targets and the notice in every file); `pnpm ports:check` keeps
the four flat ports of 0016 unchanged.

## Consequences

Nested targets are fine for the site, the registry and preview review, but
the npm library generator flattens files by name (pitfall P-044), so a nested
item cannot be promoted to `ready` until that generator keeps target paths.

## Re-test when

The library generator keeps target paths (then drop the promotion caveat), or
shadcn drops a style family.

# 0022: Keep library picks as prefixed flat files, rebuild what a primitive does not model, and fix structural accessibility

- Status: Accepted
- Date: 2026-10-12
- Deciders: Port pod F (library picks), under the owner's port brief
- Sources: S-157, S-230, S-232, S-234, S-238, S-239, S-241, S-004

## Context

Batch F takes one linked component from each of six libraries (S-157). The
ports are authored in `ports/` and exported by `pnpm ports` (decisions 0016
and 0017). Three shapes needed a choice those records leave open:

- Two upstreams are packages: border-beam is 4 modules (about 3,000 lines)
  and liquid-gooey 12 (about 4,000 lines) (S-230). Decision 0016 merges
  modules into a few flat files; decision 0017 keeps the upstream tree with
  nested targets, which the npm library cannot publish yet (P-044).
- The brief asks for Radix, Base UI and React Aria variants of Morphing Tabs
  and Fluid Tooltip. Fluid Tooltip's upstream is built on a Base UI feature
  the other two primitives lack: one popup shared by every trigger, moved
  between them with a handle (S-234). Morphing Tabs is a hand-rolled tablist
  (S-232); React Aria builds a TabList from its Tab children only and drops
  any element that wraps a Tab (S-241, measured: an empty tablist).
- Upstream Morphing Tabs puts each close button inside the tablist, next to
  its tab; a tablist may own only tabs (S-239).

## Decision

- **One upstream module per file, flat and prefixed.** Each upstream module
  stays its own `registry:ui` file in `components/ui`, renamed with the
  component prefix (`border-beam-styles.ts`, `liquid-gooey-observer.ts`) and
  imported relatively: no merging (each file still diffs against its
  upstream module), no nested targets (the npm library flattens files by
  name, P-044, and prefixed file names cannot collide), and an install never writes
  generic names such as `hooks.ts` or `context.ts`. Sources live in
  `ports/<source>/<component>/src` (variants shape, one root per primitive),
  so Biome leaves the upstream lines alone; `pnpm ports` appends the upstream
  MIT notice to every file.
- **Primitive variants keep one API.** The upstream primitive is the fidelity
  variant and the default (Fluid Tooltip: Base UI; Morphing Tabs: Radix, with
  0.000% differing pixels against upstream in every measured state). The
  other variants expose the same props and the same look at rest:
  - Fluid Tooltip on Radix and React Aria gives every trigger its own tooltip
    (their own aria-describedby, Escape and focus handling) and rebuilds the
    handoff: a tooltip that opens within the skip window of the previous one
    closing starts from the previous surface and glides to its own with the
    Web Animations API (FLIP, 200 ms on the upstream curve, S-238), its label
    sliding in 8 px from the side of travel.
  - Morphing Tabs on React Aria makes each Tab the moving element (the
    spring writes its transform), because a TabList keeps nothing but Tabs.
  - All three tab variants select on release without a drag, as upstream;
    Radix and Base UI otherwise select on mousedown or mouse focus, which
    selected a tab the moment a drag started.
- **Close buttons leave the tablist.** They render in a layer beside it that
  moves with their tab (same transform and stacking order), so the tablist
  owns only tabs while the look and the drag stay upstream's.

## Alternatives

| Option | Why not |
| --- | --- |
| Merge each package into a few files (0016) | Hides the per-module upstream diff that fidelity review relies on (border-beam's 2,500-line style generator, gooey's engine). |
| Upstream tree with nested targets (0017) | The npm library flattens files by name (P-044), so the items could not be promoted to ready. |
| Keep upstream file names (`types.ts`, `hooks.ts`, `context.ts`) | They would collide in a user's `components/ui` with any other item or file of the same name. |
| Ship Fluid Tooltip on Base UI only | Allowed by the contract (missing combinations show "not yet available"), but the brief asks for all three, and per-trigger tooltips with a FLIP handoff reach the same look at rest (measured below). |
| Wrap Radix's internal Popper to share one popup | `radix-ui/internal` is not the unified package the contract allows (`radix-ui` only). |
| Keep close buttons inside the tablist | A tablist may own only tabs (S-239); assistive technology would read the close buttons as part of the tab set. |

## Evidence

`docs/evidence/ports/<component>/fidelity.md` for each port: the default
variants differ from upstream by at most 0.08% of pixels in every measured
state at 1280x800 and 375x812. The other primitive variants of Fluid Tooltip
differ only in label anti-aliasing at rest (at most 0.43% of a 234x142
crop); the Base UI and React Aria Morphing Tabs match upstream at rest and
after a selection (0.000%).

## Consequences

Items with many files install many files; their names say which component
owns them, and they do not wait on P-044 to be promoted. The Radix and
React Aria Fluid Tooltip variants carry about 120 lines of handoff code
that the Base UI variant does not need.

## Re-test when

Radix or React Aria gain a shared, handle-driven tooltip (then rebuild those
variants on it), React Aria collections accept wrapper elements, or the npm
library keeps nested target paths (then nested targets are an option).

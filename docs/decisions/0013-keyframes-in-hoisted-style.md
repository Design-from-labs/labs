# 0013: Ship CSS keyframe animations as registry:ui components with a hoisted style

- Status: Accepted
- Date: 2026-10-12
- Deciders: Port pod B (css-keyframes), under the owner's port brief
- Sources: S-150, S-157, S-156, S-155, S-004, S-008

## Context

The yui540/css-animations ports (S-150) are pure CSS: each is a few
elements and a set of `@keyframes`, with several animations chained by
delay. They have to reach users through every Labs output (the gallery
demo, the shadcn registry, the `designfrom` CLI and the `@designfrom/react`
library) and match the upstream pages pixel for pixel (S-157).

Measured in this repository: `scripts/prepare-content.mjs` reads only an
item's `cssVars` (into `.generated/theme.css` and the library's theme); an
item's shadcn `css` field reaches neither the gallery nor the npm library.

## Decision

- Each animation is one `registry:ui` item, primitive `none`, no icons: a
  React component that renders the upstream markup with `data-slot` parts.
- Its keyframes and part styles are the upstream CSS, line for line, in a
  string inside the component file, rendered as
  `<style href="designfrom-<name>" precedence="default">` (S-156). React 19
  hoists and deduplicates it; server rendering emits it with the markup, so
  the first paint is already animated and no JavaScript is needed to run it.
- Everything global is prefixed with the component name: keyframes
  (`blocks-large-ball-1`), parts (`data-slot="blocks-bar"`) and variables
  (`--blocks-shape`, declared in `cssVars` light and dark, with the upstream
  value as the `var()` fallback).
- The stage (size, surface, overflow) is Tailwind classes on the root, so a
  `className` overrides it; the parts are unlayered CSS, tuned through the
  variables.
- Right to left: figures are drawn left to right as upstream and mirrored
  as a whole with `:dir(rtl)` (S-155) and the `scale` property, or by
  appending `scale(-1, 1)` to a static centering transform. Logical insets
  would double the flip.
- Every file has a `prefers-reduced-motion: reduce` block: no motion (the
  resting or end state), or opacity only on the same timeline.
  `scripts/keyframe-items.test.mjs` checks the prefixes and that block.

## Alternatives

| Option | Why not |
| --- | --- |
| `registry:lib` with keyframes in the item's `css` field and `--animate-*` theme variables (Tailwind v4) | The gallery and the npm library ignore `css` (measured above), so demos and `@designfrom/react` would ship without keyframes; installs write permanent global keyframes into the user's stylesheet; users would rebuild the multi-element markup by hand. |
| Web Animations API in an effect | Client only: nothing moves until hydration, the server render shows the wrong first frame, and it is no longer the upstream CSS. |
| Tailwind arbitrary `animate-[...]` classes | Still needs the `@keyframes` defined somewhere global; chained animations become unreadable. |

## Evidence

`docs/evidence/ports/<component>/fidelity.md`: 0.000% differing stage
pixels against the upstream pages at 0/25/50/75/100% (and every 5%), at
1280x800 and 375x812; the right-to-left render equals the mirrored render;
reduced motion animates only opacity or nothing.

## Consequences

Needs React 19 for hoisting and deduplication (React 18 renders the style
inline per instance, which still works). Separate Astro islands each emit
their own copy of the style; it is identical, so the duplicate is harmless.

## Re-test when

The Labs pipeline starts shipping an item's `css` field to the gallery and
the library, or React changes the `<style precedence>` contract.

# 0027: Default a primitive-free port to the primitive that keeps its behavior

- Status: Accepted
- Date: 2026-10-13
- Deciders: Port pod G (ai-states), under the owner's port brief
- Sources: S-157, S-320, S-321, S-032, S-033, S-034, S-005, S-006

## Context

The owner's brief (S-157) asks for Radix, Base UI and React Aria variants of
MessageActions (S-321) and ReasoningSteps (S-320), with the upstream look as
the default. Decision [0017](0017-port-variants-and-nested-targets.md) gives
ports their variants. Two questions remained: which variant is the default,
and what a variant replaces when the upstream uses no primitive at all.

ReasoningSteps is a Base UI collapsible upstream. MessageActions hand-rolls
its tooltip (one bubble that glides from button to button), its reaction
popover and its menu; the site's switcher offers only Radix, Base UI and
React Aria, so upstream's primitive-free row cannot ship as a fourth choice.

## Decision

- **The upstream's own primitive is the default** when it has one:
  `reasoning-steps-base-lucide`, upstream's file plus marked Labs additions (upstream imports `Check` from lucide-react itself).
- **A primitive-free upstream defaults to the primitive that reproduces its
  behavior best.** Base UI's detached tooltip triggers share one popup whose
  position can transition, so `message-actions-base` keeps upstream's
  gliding bubble and is the default. The Radix and React Aria variants give
  each button its own tooltip with the same look and no glide.
- **Upstream's own glyphs stay the default icons**, following decision
  [0025](0025-upstream-glyphs-default-with-icon-style.md): the default items
  (`message-actions-radix`, `-base`, `-aria`) draw upstream's glyphs with
  their animated parts; the "icons" style (`message-actions-icons-<primitive>-
  <lucide|phosphor>`) draws the same slots from Lucide or Phosphor.
- **Every variant replaces the hand-rolled parts with the primitive's own**:
  tooltips, a popover holding the reactions as a toolbar (arrow keys), the
  emoji picker in the same popover, and a real menu for "More actions". The
  class names and stylesheet stay upstream's (`message-actions-styles.ts`),
  shared by the three variants in `ports/aicss/message-actions/shared/`.
- **Where the primitive's default behavior changes the look, the variant
  restores upstream's**: Base UI's alignment flip becomes a shift (the picker
  clamps into the viewport, as upstream's), and focus returns to the trigger
  only after a keyboard close (after a mouse close it stays where upstream
  leaves it), docs/pitfalls.md P-109 to P-112.

## Alternatives

| Option | Why not |
| --- | --- |
| Radix as the MessageActions default (the CLI's default primitive) | Radix tooltips are one per trigger, so the default would lose upstream's glide. |
| Keep upstream's hand-rolled tooltip and menus in all three variants | Then the variants would differ in name only, and upstream's `role="menu"` rows have no arrow keys or focus handling. |
| Ship upstream's row as a `none` variant beside the three | The switcher cannot select it, and it would add two items for one behavior. |

## Evidence

`docs/evidence/ports/message-actions/fidelity.md` (every variant against
upstream at 1280x800 and 375x812, light and dark, hover, press, popover,
picker, menu and after-close states); `docs/evidence/ports/reasoning-steps/fidelity.md`;
`e2e/ai-states.spec.ts` (keyboard, tooltip, menu and toolbar behavior per
primitive, axe).

## Consequences

A behavior change upstream has to be carried into three primitive files. The
Radix and React Aria rows show a separate tooltip per button.

## Re-test when

Radix or React Aria ship one tooltip that can serve several triggers (then
those variants can glide too), or the switcher gains a primitive-free option.

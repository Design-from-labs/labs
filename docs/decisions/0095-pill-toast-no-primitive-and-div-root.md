# 0095: Port the pill toast primitive-free, with a div root and the npm license

- Status: Accepted
- Date: 2026-10-13
- Deciders: Port pod WEB-2 (sileo), under the owner's WEB-2 brief
- Sources: S-500, S-501, S-528, S-157, S-184, S-325, S-005, S-006

## Context

The owner's brief (S-528, S-184) asks for a headless primitive only where one
genuinely fits, and for every ported change to stay inside the fidelity
budget. The upstream toast (S-500) is imperative (a module store and
`sileo.success(...)` called from anywhere), draws its own shape (an SVG pill
and body under a gooey filter), owns its timers and has one card element per
toast whose root is a `<button>`.

Its license is not in the repository: there is no LICENSE file at the pinned
commit, the published tarball (S-501) has none either, and `package.json`
says `"license": "MIT"` with no `author` field.

## Decision

- **Primitive `none`.** Radix Toast, Base UI Toast and React Aria's toast
  queue each own the viewport, the timers, the swipe, the stacking and the
  announcements, and expect a declarative provider and a toast component per
  entry. Adopting one means replacing the store, the hover and timer rules and
  the card's measured geometry, which are the behavior being ported. The
  accessibility gaps are small and are filled directly (live regions, Escape,
  focus). Items ship as `pill-toast` plus an `icons` style
  (`pill-toast-icons-lucide`, `pill-toast-icons-phosphor`), following decision
  0025.
- **A div root and a real action button.** The root is a `div` (a focusable
  named group when the toast has a description) and the action is a `<button>`
  with the same box (`width: 100%`), not an `<a>` inside a `<button>`. The
  fidelity frames stay at 0 differing pixels.
- **License from the npm metadata.** The port is MIT on the strength of the
  published `license` field of `sileo@0.1.6` (the snapshot-pinning decision
  covers npm packages whose repository lacks a LICENSE). `ports/hiaaryan-sileo/LICENSE`
  carries the MIT text with the copyright line "Copyright (c) 2026 Aaryan
  (hiaaryan)", taken from the repository owner and the sole commit author,
  because neither the repository nor the package states one.
- **Names.** The component is `pill-toast`, exports `PillToaster` and
  `pillToast`: `toast` is shadcn's, and the upstream's name is credited, not
  borrowed. Data attributes, custom properties and keyframes carry the
  component's name (`data-pill-toast-*`, `--pill-toast-*`, `pill-toast-*`).

## Alternatives

| Option | Why not |
| --- | --- |
| Rebuild on Base UI Toast (default) with Radix and Aria rewrites | Replaces the behavior the port exists to carry; three rewrites of an imperative store for no measured gain in accessibility. |
| Keep the `<button>` root and the `<a>` action | axe reports nested-interactive; the action is not a separate control for assistive technology. |
| Treat the missing LICENSE as blocking | The published package declares MIT and the repository is its declared source; the brief allows exactly this basis. |

## Evidence

`docs/evidence/ports/pill-toast/fidelity.md`: every frame against upstream at
or under the 0.1% budget, with the div root and the button; axe clean on the
harness states; `e2e/pill-toast.spec.ts` (announcement, Escape, keyboard
reach, axe, right to left).

## Consequences

The toast carries about 150 lines of Labs additions beside upstream's, each
marked "Labs:". A later upstream change to its card re-merges by hand.

## Re-test when

Upstream adds a LICENSE file or an `author` field (replace the copyright line
with its own); or a headless toast primitive exposes an imperative store with
hover-held timers, which would let the port drop its store.

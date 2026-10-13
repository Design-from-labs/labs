# 0012: Expand gallery tiles into component pages with cross-document view transitions

- Status: Accepted, amended by [0019](0019-specimen-wall.md) (tiles show no title, so only the specimen morphs)
- Date: 2026-10-12
- Deciders: Owner (brief), Pod GRID
- Sources: S-042, S-043, S-044, S-045, S-046, S-002

## Context

The owner asked for the `/ui` gallery to read as a grid of objects: each
entry a uniform card with a live, static-first preview, its title and minimal
meta. Clicking a card should grow it into the component page's hero
(`/ui/<component>`), and back should shrink it into its place in the grid,
through the View Transitions API and Astro's `transition:name`.

Constraints: the site is a static multi-page app with no client router
(decision [0002](0002-astro-static-site.md)); the tile is a keyboard-reachable
link with a visible focus ring; reduced motion never morphs; no layout shift;
CLS at most 0.1 and INP at most 200 ms; browsers without view transitions
navigate normally; back restores the scroll position; 320 px, 375 px and
desktop, left-to-right and right-to-left.

## Decision

- **Cross-document view transitions**, not Astro's `<ClientRouter />`. Both
  documents opt in with `@view-transition { navigation: auto; }` in
  `src/styles/global.css`, inside `@media (prefers-reduced-motion:
  no-preference)`.
- **Names through Astro's `transition:name`** with `transition:animate="initial"`
  (Astro emits only the `view-transition-name`, no animation of its own). The
  names come from `src/lib/transitions.ts`: `tile-preview-<name>` on the tile
  preview and on the component page's hero frame, `tile-title-<name>` on the
  tile title and on the page heading. Each pair also has a
  `view-transition-class` (`tile-preview`, `tile-title`) so one set of rules
  styles every pair.
- **The hero moves above the switcher.** The component page shows one hero
  frame per published variant, the selected one rendered and the rest
  `hidden`, so the shared name is unique among rendered elements. Foundation
  entries, which have no demo, get a hero with the same exports text as their
  tile, so every tile expands.
- **Motion:** the frame grows on `--motion-ease-spring` (a damped spring,
  damping ratio 0.78, about 2% overshoot, sampled into `linear()`, with an
  ease-out fallback) over `--motion-duration-expand` (400 ms). The snapshots
  keep their size inside the growing frame (`object-fit: none`, clipped to the
  frame with its radius) so the card reads as one object opening, not a
  stretched picture. Outgoing snapshots fade out in
  `--motion-duration-fast` (120 ms); incoming ones fade in. The page itself
  (root) fades through the same way, so the two pages never stack. The site
  header has its own name and stays still. Tokens live in
  `src/styles/tokens.css` (site only; not part of the published theme item).
- **Reduced motion:** the document never opts in, so navigation is an
  ordinary, instant page change.
- **Fallback:** a browser without cross-document view transitions ignores the
  at-rule and navigates normally; nothing depends on JavaScript.
- **Focus:** the whole card is the title link's hit area (a stretched link),
  and the card draws the ring with `:has(:focus-visible)`, so it is not
  clipped.

## Alternatives

| Option | Why not |
| --- | --- |
| Astro `<ClientRouter />` (single-page navigation) | Turns the static site into a client-routed app: every inline script (`src/scripts/ui.ts`) must re-run on `astro:page-load`, islands are swapped instead of loaded, and every page ships the router. Cross-document transitions give the same morph with no JavaScript. |
| Name only the clicked tile, from `pageswap` and `pagereveal` scripts | Captures 2 elements instead of 2 per entry (20 today), but adds client JavaScript to every page, and the brief asked for `transition:name`. Worth revisiting at the size threshold below. |
| Default snapshot sizing (scale the old and new images) | The card's content stretched to the hero's aspect ratio mid-transition. |
| Plain crossfade of the root (no fade-through) | Both pages showed at once for most of the transition. |
| A morph under reduced motion with a shorter duration | The requirement is no morph at all; an instant change is the clearest reading. |

## Evidence

- `e2e/gallery.spec.ts` (Playwright project `transitions`): the tile and
  hero share `tile-preview-<name>` and `tile-title-<name>`; the new page's
  `pagereveal` carries a view transition that animates
  `::view-transition-group(tile-preview-<name>)` (a group animation exists
  only when both pages have the name), forward and back; back restores the
  scroll position within 1 px and the tile is in view; reduced motion gives
  `pagereveal` no transition; Enter on a keyboard-focused tile opens the page
  and the card shows a solid outline of at least 2 px; right-to-left keeps the
  match and the heading at the inline start; CLS stays at most 0.1; axe is
  clean after the expand and after back, in light and dark.
- Local measurements on the built site (Chromium, 2026-10-12): CLS 0.013
  (`/ui`) and 0.001 (`/ui/button`) at 1280 px, 0.0004 and 0.021 at 375 px,
  with 4x CPU throttling; pointer-down to `pageswap` 7 to 9 ms; no event
  timing entry of 16 ms or more.
- Frame-by-frame captures at 60, 150, 250 and 400 ms (desktop left-to-right,
  375 px right-to-left) were reviewed before merging.

## Consequences

- A new page type that should take part needs the same names from
  `src/lib/transitions.ts`; a rename on one side breaks the match, which the
  e2e test catches.
- Each entry adds two captured elements to the gallery's transition.
- Headless Chromium sometimes drops a cross-document transition, so morph
  assertions retry a missing morph and run in their own
  Playwright project after the others (docs/pitfalls.md, P-016).

## Re-test when

- The gallery passes 60 entries, or a navigation from `/ui` measures more than
  100 ms from input to the new page's first frame on a 4x-throttled CPU:
  switch to naming only the clicked tile.
- Firefox ships cross-document view transitions: add it to the e2e matrix.
- The site adopts a client router for another reason: move the transition to
  that router instead of the at-rule.

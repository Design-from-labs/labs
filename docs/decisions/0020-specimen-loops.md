# 0020: Loop each specimen with scripted fake states, in view only, pausable

- Status: Accepted
- Date: 2026-10-12
- Deciders: Owner (brief), Pod GRID
- Sources: S-158, S-161, S-162, S-045

## Context

The owner asked for the wall's tiles to loop, as in the reference, so that
each tile shows its component in motion (a hover, a toggle, a morph, a toast
appearing). The requirements:

- an optional, additive per-component script driving fake pointer and focus
  states, never real input;
- a default for components without one;
- only tiles in view animate, staggered, within a phone's CPU budget, with no
  INP regression;
- lazy hydration where needed;
- reduced motion gives a static frame;
- a visible, remembered "Pause animations" toggle (WCAG 2.2.2, since the
  motion lasts over 5 seconds);
- the loops are decoration;
- clicking freezes the frame for the morph.

## Decision

- **Contract revision 4:** an optional `loop: { script?, duration?,
  hydrate? }` ([contract 4.3](../contract.md)). A script is a list of steps
  separated by `→`:
  - `hover`, `press`, `release`, `focus`, `blur` and `click`, each with an
    optional `[n]` (the nth control);
  - `idle` and `wait`.

  The steps are played evenly over `duration` (default 4000 ms).
- **Fake states reach the components unchanged:**
  - The driver (`src/scripts/specimens.ts`) writes `data-loop="hover press
    focus"` on a control.
  - The site redefines Tailwind's `hover`, `active` and `focus-visible`
    variants with `@custom-variant` so they also match those tokens. `hover`
    keeps its `(hover: hover)` media.
  - For React Aria, the driver also sets `data-hovered`, `data-pressed` and
    `data-focus-visible`.
  - Published sources are untouched; the site's CSS gains attribute
    selectors.
- **Defaults:** a specimen with its own infinite CSS animation keeps it.
  One with controls cycles hover over its first three controls. Anything
  else gets a spotlight that dims all its parts but one, in turn.
- **Hydration only when needed:** a specimen is an island (`client:visible`)
  only with `loop.hydrate`, for `click` steps or a demo whose motion needs
  JavaScript. Fake hover, press and focus states need no hydration, so most
  tiles stay static markup. A scripted `click` is cancelled at the tile, so
  it never follows the tile's link (P-050).
- **When it plays:**
  - An IntersectionObserver (20% visible) starts and stops each loop.
  - A hidden tab, reduced motion and the visitor's pause stop every loop.
  - A stopped specimen carries `data-loop-paused`, which pauses its CSS
    animations (and Web Animations), so a hydrated demo with its own timer
    can skip its step.
  - Starts are staggered with golden-ratio offsets over 60% of a cycle.
- **Pause toggle:** "Pause animations" above the wall (`aria-pressed`),
  stored in `localStorage` under `labs:specimens-paused`, with every access
  in try/catch. It works for the visit even when storage is blocked.
- **Freeze:** a pointer press or Enter on a tile stops its loop without
  clearing it, so the page is captured on that frame and the morph expands
  it. Back from the component page (back/forward cache) resumes.

## Alternatives

| Option | Why not |
| --- | --- |
| Synthetic pointer events | Do not trigger `:hover` or `:active`; components would not show their states. |
| Videos or GIFs of each component | Not live, heavy, and drift from the code; the brief asks for the live component. |
| Hydrate every tile and drive state through React | Ships React for the whole wall; fake CSS states cost nothing per tile. |
| One `requestAnimationFrame` loop for the whole wall | Timers per tile are idle between steps; a rAF loop would wake every frame. |

## Evidence

- `e2e/wall.spec.ts`:
  - a tile in view moves through at least three states in one cycle and
    never navigates;
  - a specimen with no controls gets the spotlight;
  - offscreen and in a hidden tab the loop stops and clears;
  - reduced motion: paused, no states;
  - the toggle stops every loop, survives a reload and resumes;
  - pressing a tile freezes its frame.
- CPU, beta build with every port: main-thread busy 3.0% at 1280px, and
  7.8% at 375px with 4x CPU throttling (the mid-range phone proxy). One long
  task of 69 ms, while a port's island hydrated.
- `e2e/gallery.spec.ts`: the morph from a looping tile.

## Consequences

- A demo with its own timer (for example a cycling text) must check
  `closest("[data-loop-paused]")`; the text-morph port does.
- Writing component states with `hover:`, `active:` and `focus-visible:` (or
  React Aria's data attributes) keeps them loopable.

## Re-test when

- Main-thread busy on the wall exceeds 15% at 4x CPU throttling, or a tile's
  island adds a long task over 100 ms after load.
- Tailwind changes how built-in variants can be redefined.

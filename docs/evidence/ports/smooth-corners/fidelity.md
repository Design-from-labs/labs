# Smooth Corners: fidelity

- Upstream: JaceThings/Lisse at `173846978ed806e14c78154ec914a9645a991932`,
  `packages/core/src` and `packages/react/src` (MIT, copyright 2026 Jace
  Attard; S-406). Vue, Svelte, Octane and Flutter bindings are not ported.
- Port: `ports/lisse/smooth-corners/` (decision 0016, flat files), exported to
  `content/components/lisse/smooth-corners/`.

## Method

Upstream's demo site is a server-rendered app with its own router, sounds and
fonts, so the comparison uses a harness (Vite, React 19.3) that renders the
same scene twice: once with upstream's `@lisse/react` source (and
`@lisse/core` source through an alias), once with the port. Chromium
(Playwright 1.64), device scale 1, light, `prefers-reduced-motion:
no-preference`, a 800 ms settle, then a viewport screenshot; pixelmatch
threshold 0.1 (S-152). The output is a deterministic SVG path and clip-path,
so no noise floor applies (upstream against a second upstream load is
identical).

| Scene | What it covers | 1280x800 | 375x812 |
| --- | --- | --- | --- |
| readme | the README's quick start, card, per-corner, all-effects card, the hook with effects, the hook on a button | 0.0000% | 0.0000% |
| curves | arc, squircle (0, 0.6, 1), clothoid (0.3, 0.65, 1), superellipse (3, 4, 6), `preserveSmoothing: false`, mixed curves per corner, a capsule, a small box | 0.0000% | 0.0000% |
| borders | inner and outer borders in all six styles, a middle border, a linear-gradient border | 0.0000% | 0.0000% |
| shadows | a drop shadow, two drop shadows, an inner shadow, `shadowStrategy="box-shadow"` | 0.0000% | 0.0000% |
| auto | CSS border and box-shadow converted (`autoEffects`), inset shadow, `autoEffects={false}`, `asChild` on a link, `as="section"` | 0.0000% | 0.0000% |

Worst frame: **0.0000%** (0 differing pixels in all 10 frames).
Evidence: `1280x800-{before,after,diff}.webp` (the five scenes stacked) and
`375x812-{before,after,diff}.webp` (side by side); numbers in
`fidelity.json`.

### Upstream's unit tests against the port

Upstream's own core and React suites (vitest 3.2.4, happy-dom, 31 files, 470
tests) were run with every `../src/*` and `@lisse/core` import redirected to
the port's three files: **467 passed, 3 failed**. The three failures are in
`svg-effects.test.ts` ("generatePath memoisation across update dispatches"):
they `vi.mock` the `generate-path` module and count calls through it, and in
the port that module is merged into `smooth-corners-path.ts`, so the mock
never intercepts the effects file's call. They test module boundaries, not
behaviour; the cache itself is upstream's code, unchanged.

## Deviations from upstream

- **Merged files** (decision 0016): 16 core modules into
  `smooth-corners-path.ts` (pure, no DOM: curves, corner parameters,
  distribution, `generatePath`), 7 into `smooth-corners-effects.ts` (DOM:
  SVG borders and shadows, CSS effect extraction, resize observation), and the
  4 React modules into `smooth-corners.tsx`. Upstream lines are kept; only
  relative imports were removed and re-exports between modules dropped. Each
  module starts with `// ---- upstream: packages/<path> ----`.
- **Renamed (de-branding)**: `APPLE_SMOOTHING` is `CONTINUOUS_SMOOTHING`
  (0.65) and `FIGMA_SMOOTHING` is `HANDOFF_SMOOTHING` (0.6). Values are
  unchanged. Comments that named design tools, a platform vendor, a test DOM
  library or the upstream project are reworded to describe the construction;
  the two references upstream links for the corner parameters are credited as
  S-412 and S-413 instead of linked in code.
- **Labs addition, logical corners**: `corners` also takes `topStart`,
  `topEnd`, `bottomStart` and `bottomEnd`, resolved against the element's
  computed direction after layout (`resolveLogicalCorners` is exported for the
  hook and `generatePath`). Physical names behave exactly as upstream and win
  when both are given. Before hydration a logical set shows its left-to-right
  radii as the `border-radius` fallback.
- `"use client"` added to `smooth-corners.tsx` (hooks). The two lib files
  have no directive; `smooth-corners-path.ts` stays server safe.
- Not ported: upstream's `index.ts` / `path.ts` barrels (the item files are
  the surface) and the non-React bindings.

## Primitive and icons

Primitive `none`: the component is a clip-path and an SVG overlay on any
element; there is no dialog, menu or input behaviour a headless primitive
would add. Upstream's own `Slot` (the `asChild` merge) is kept rather than a
Radix variant, because a `-radix` item would differ only in that merge and
would add a dependency for no behaviour. No icons are rendered.

## Accessibility, motion, direction

- Presentational only; every overlay is `aria-hidden` with pointer events
  off (upstream). `clip-path` clips focus outlines: documented, with the
  inset-ring and `outerBorder` patterns.
- Forced colors (Chromium, measured): the SVG borders keep their colors;
  backgrounds become Canvas, so borderless shapes lose their edge. Documented
  in the item's a11y notes.
- No motion of its own. The demo's smoothing sweep stops under reduced
  motion, skips frames while `[data-loop-paused]` is set (contract 4.3) and
  has a Pause control.

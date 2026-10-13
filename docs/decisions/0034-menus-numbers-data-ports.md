# 0034: Share one goo engine as a lib item, wrap npm libraries thinly, keep a required attribution link on, and offer the primitive-free default in the switcher

- Status: Accepted
- Date: 2026-10-13
- Deciders: Port pod K (menus, numbers, data), under the owner's port brief
- Sources: S-444, S-420, S-421, S-428, S-429, S-430, S-434, S-435, S-436, S-440

## Context

Batch K (S-444) ports eight components. Four questions were open:

- liquid-taffy (S-420) builds three surfaces (Anchored Dropdown, Morphing
  Dropdown, Speed Dial) on about 4,000 lines of shared engine, and
  choreographs them with GSAP (S-421), whose license is not on the allowlist
  (decision [0007](0007-component-license-policy.md)). Exported one item per
  component, the engine would be copied three times and installing two
  components would prompt about identical files. Its default glyphs are four
  plain shapes with one hue each, and the Speed Dial lays them out as a
  compass; together they read as a well-known games controller's buttons.
- NumberFlow (S-434), Lightweight Charts (S-435) and React Virtuoso (S-436)
  are maintained npm libraries; porting their sources would fork them.
  Lightweight Charts is Apache-2.0 with a NOTICE, and its README asks the page
  that uses it to show a link to its author.
- Segmented Pill (S-428) has a primitive-free default beside Radix, Base UI
  and React Aria variants. The component page's Primitive switcher listed only
  the three primitives, so the default could not be chosen again.
- Balloons (S-429) embeds the Sniglet font (S-430, SIL OFL-1.1), which is not
  on the code-license allowlist.

## Decision

- **One engine, shipped once.** `liquid-taffy-engine` is a `lib` item
  (`"kind": "lib"`, `registry:lib`, files under `lib/`); the three components
  list it in `registryDependencies` and import `@/lib/taffy-*`.
  `scripts/export-ports.mjs` accepts `kind: "lib"` (no demo, no preview).
  Files only the two dropdowns share (hover pill, burst, icon morph,
  stylesheet, glyph and menu layers) stay in each item, because the glyph and
  menu files differ per style and primitive.
- **GSAP is replaced, as decision [0026](0026-canvas-and-3d-ports.md)
  requires**, by `taffy-tween.ts`: a timeline on Motion's `frame` loop with the
  GSAP semantics the choreography uses (positions, `set` and `call`,
  `overwrite: "auto"`, `autoAlpha`, keyframes, stagger, `fromTo`,
  play/reverse/timeScale, SVG matrix transforms, named and bezier eases). No
  GSAP code, dependency or comment ships.
- **Neutral hues.** The four shapes keep upstream's geometry, but their hues
  are a neutral set (teal, violet, sky, amber) instead of upstream's. Fidelity
  runs give upstream the same hue table, so the comparison stays like for
  like. Sound is off by default (`sound` prop) and never plays on the wall.
- **Variants follow decisions [0022](0022-library-picks-shapes.md) and
  [0025](0025-upstream-glyphs-default-with-icon-style.md):** upstream's glyphs
  are the default and an `icons` style offers Lucide and Phosphor; Radix, Base
  UI and React Aria variants replace only the menu layer. The icon style ships
  on the primitive-free variant only, which keeps six items per component.
- **Thin wrappers over npm libraries.** NumberFlow, Financial Chart and
  Virtual List install the library at an exact pin (optional peers of the npm
  library) and add only accessibility, tokens and reduced motion; the
  library's look is unchanged.
- **The required attribution stays.** Financial Chart sets
  `layout.attributionLogo: true` and its docs say to keep it on; the end-to-end
  test asserts the link on the page and on the wall tile. The upstream NOTICE
  travels in every exported file through decision
  [0029](0029-scroll-transition-and-3d-ports.md)'s exporter support and is
  reproduced in `THIRD_PARTY_NOTICES.md` (Apache-2.0, section 4(d), S-440).
- **The Vite install check covers a `lib` item.** `anchored-dropdown`
  joins the items `scripts/registry-install-vite-test.sh` installs (decision
  [0031](0031-vite-install-check-on-beta-items.md)), so a component that pulls
  a shared `lib` item and imports it as `@/lib/...` is built in a fresh app.
- **The switcher offers "None".** When a component has a primitive-free
  variant beside primitive variants, the Primitive dimension lists "None"
  first; it is checked initially and round-trips (`scripts/lib/publish.mjs`).
- **Balloons ships no font.** It uses the site's font stack; its docs say how
  to load Sniglet. The fidelity harness loads Sniglet on both sides, so the
  comparison stays pixel-exact.

## Alternatives

| Option | Why not |
| --- | --- |
| The engine copied into each component item | Three copies drift, and the CLI prompts about identical files when two are installed. |
| Depend on `gsap` | Its license is not on the allowlist (decision 0007). |
| Rewrite the choreography with one Motion `animate()` per element | Loses the timeline positions, overwrite and play/reverse semantics the springs and the seam depend on, so it cannot be compared line for line. |
| Keep upstream's hues | The shapes, hues and the dial's compass together read as another company's trade dress. |
| Port the npm libraries' sources | Forks maintained libraries for no visual gain; every fidelity frame of the wrappers matches at 0.000%. |
| Hide the chart's attribution logo | Ignores the upstream's stated condition. |
| Ship Sniglet | SIL OFL-1.1 is not on the code-license allowlist (decision 0007). |
| Leave the switcher without "None" | The default variant could only come back on reload. |

## Evidence

- `docs/evidence/ports/<component>/fidelity.md` for `segmented-pill`,
  `balloons`, `number-flow`, `financial-chart`, `virtual-list`,
  `anchored-dropdown`, `morphing-dropdown` and `speed-dial`: every frame of
  the first five matches at 0.000%; the 64 default liquid-taffy frames match
  within 0.1% with the neutral hues on both sides, and the primitive variants
  within 0.1% except one Anchored Dropdown frame (four rows ticked, dark,
  375x812), which flips between two text rasterizations within upstream's own
  run-to-run spread and is accepted as a deviation (P-237).
- `scripts/export-ports.test.mjs`: a `lib` item has no demo or preview, and
  the components' `@/lib/` imports resolve to its files; an Apache-2.0 port
  carries its NOTICE in every file.
- The Vite install check with all eight components (ten items) failed
  `tsc -b` on two shared liquid-taffy files and on the Base UI and React Aria
  menu layers (P-238), which the repository's own typecheck does not compile;
  after the fixes each menu layer compiles and every demo mounts in Chromium
  with no console errors.
- `scripts/publish-visibility.test.mjs`: the primitive dimension offers
  "none".
- `e2e/segmented-pill-balloons.spec.ts`, `e2e/data-wrappers.spec.ts` and
  `e2e/liquid-taffy.spec.ts` on a `LABS_INCLUDE_BETA=1` build.

## Consequences

- A `lib` item appears on the wall as its export list (P-229).
- Promoting the liquid-taffy items to ready needs a check that the npm library
  generator keeps cross-item `@/lib/<name>` imports working.
- Financial Chart's `options` pass through, so a user can still turn the logo
  off; the docs ask them not to.

## Re-test when

- Motion ships a timeline with positions and overwrite: drop `taffy-tween.ts`.
- An Apache-2.0 upstream ships a NOTICE of a different shape, or Lightweight
  Charts changes the logo's default.
- The component page renders sources lazily: the icon style can return on the
  primitive variants.

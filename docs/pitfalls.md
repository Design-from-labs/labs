# Pitfalls

Problems this repository has already hit, so nobody hits them twice. Add an
entry in the same pull request that fixes (or works around) a new one; the
pull request template has a checkbox for it.

Each entry: an id (`P-NNN`, never reused), the date, the area, the symptom you
see, the cause, the fix, how to prevent it, and links to the pull request or
commit. Write what happened, not who; name no product or repository other than
Design From and Design From Labs (the guards enforce this).

| Id | Area | Pitfall |
| --- | --- | --- |
| [P-001](#p-001) | Deployments | The first Vercel CLI deploy of a new project goes to production |
| [P-002](#p-002) | GitHub | A release pull request deleted `staging` |
| [P-003](#p-003) | GitHub | Squash-only merging blocked merge-commit releases |
| [P-004](#p-004) | npm publishing | `setup-node` `registry-url` breaks trusted publishing |
| [P-005](#p-005) | npm publishing | `publishConfig.provenance` breaks local publishes |
| [P-006](#p-006) | npm publishing | Trusted publishing needs the package to exist first |
| [P-007](#p-007) | npm publishing | The unscoped package belongs to the user account |
| [P-008](#p-008) | CI guards | Text after `## Sources` fails the PR-body check |
| [P-009](#p-009) | Registry | Example names collide with real exports |
| [P-010](#p-010) | Components | The Base UI tooltip was not linked to its trigger |
| [P-011](#p-011) | Toolchain | A same-day release is blocked by `minimumReleaseAge` |
| [P-012](#p-012) | Registry | The shadcn CLI drops comments above the first import |
| [P-013](#p-013) | Deployments | A failed Vercel `git connect` can unlink the project |
| [P-014](#p-014) | DNS | The record was entered as `lab` instead of `labs` |
| [P-015](#p-015) | Tests | Mobile emulation hides horizontal overflow |
| [P-016](#p-016) | Tests | Headless Chromium sometimes drops a cross-document view transition |
| [P-017](#p-017) | Site | Grid and flex children overflow phone widths by default |
| [P-018](#p-018) | Tests | A local preview server on port 4321 is silently reused |
| [P-019](#p-019) | Site build | Beta components were invisible on the preview |
| [P-020](#p-020) | Tests (local) | `astro preview` backgrounds itself and moves to a free port |
| [P-021](#p-021) | Components (RTL) | Mirroring flipped twice, or pushed a figure off the stage |
| [P-022](#p-022) | Components (CSS) | The `scale` property mirrors a centering translate |
| [P-023](#p-023) | Fidelity | Tailwind preflight changes inherited spacing in a diff |
| [P-024](#p-024) | Components (layout) | A grid root moves relatively positioned parts |
| [P-025](#p-025) | Components (responsive) | A flex pile re-wraps on a narrower stage |
| [P-026](#p-026) | Site (React 19) | `<style precedence>` is not hoisted across Astro islands |
| [P-027](#p-027) | Fidelity harness | Bundling `react-dom/server` as ESM fails |
| [P-028](#p-028) | Site (layout) | One long attribution widened the whole credits list |
| [P-029](#p-029) | Site (Astro) | A component prop named `slot` disappears |
| [P-030](#p-030) | Accessibility | axe reads an iframe as part of the page |
| [P-031](#p-031) | Content | `pnpm examples` rewrites every example's `source.commit` |
| [P-032](#p-032) | Deployments (headers) | `X-Frame-Options: DENY` blanks the site's own iframes on Vercel |
| [P-033](#p-033) | Components (CSS order) | A toast stylesheet injected after Sonner's broke the first toast |
| [P-034](#p-034) | Fidelity harness | Playwright's clock keeps running after `install`, and a fixed time stalls Motion |
| [P-035](#p-035) | Fidelity harness | Upstream's own timing noise in real-time captures |
| [P-036](#p-036) | Components (RTL) | Per-character spans reverse Latin text in a right-to-left page |
| [P-037](#p-037) | Site (gallery tiles) | Canvas-drawn and swell-in demos are blank in unhydrated tiles |
| [P-038](#p-038) | Tooling (Vite dev) | Tegaki fonts and the harfbuzz WASM break under dependency pre-bundling |
| [P-039](#p-039) | npm library | A dependency missing from the library's peers gets bundled into it |
| [P-040](#p-040) | npm library | Two item files exporting one name break the library's barrel |
| [P-041](#p-041) | Site (component page) | No direction switch for a component without variants |
| [P-042](#p-042) | Components (Next.js) | Importing harfbuzzjs fails a default Next.js build |
| [P-043](#p-043) | Ports (process) | Two pods built incompatible ports exporters in parallel |
| [P-044](#p-044) | npm library | Nested item files are flattened by name |
| [P-045](#p-045) | Contract imports | Multi-segment `@/` aliases fail validation |
| [P-046](#p-046) | Ports (exporter) | A CRLF upstream LICENSE puts carriage returns in every exported file |
| [P-047](#p-047) | Ports (process) | Unfinished sibling content breaks a shared worktree's site build |
| [P-048](#p-048) | Components | A dev overlay shown in production when env reads are banned |
| [P-049](#p-049) | Site (demo aliases) | A directory import in a demo did not resolve |
| [P-050](#p-050) | Site (loops) | A scripted click inside a tile followed the tile's link |
| [P-051](#p-051) | Site (view transitions) | Unpartnered named tiles lingered through the morph |
| [P-052](#p-052) | Site (header) | A no-wrap brand pushed the header past 320px |
| [P-053](#p-053) | Tests | A check that passed on the CI build failed on a beta build |
| [P-054](#p-054) | Site (wall) | A full-width demo collapsed to zero width in a centring grid |
| [P-055](#p-055) | Site (wall) | Fixed zoom steps cropped tall and wide specimens |
| [P-056](#p-056) | Site (wall) | A ResizeObserver on an Astro island never fires |
| [P-057](#p-057) | Fidelity (WebGL) | Headless Chromium draws WebGL on a different renderer per flag set |
| [P-058](#p-058) | Fidelity harness | A canvas at a fractional offset screenshots one pixel taller |
| [P-059](#p-059) | Components (three.js) | A renderer given an outside context can change its output |
| [P-060](#p-060) | Fidelity harness | Eased pointer tilt is not converged after a fixed wait on software GL |
| [P-061](#p-061) | Site (previews) | The preview route and gallery tiles never hydrate, so canvas effects show only their fallback |
| [P-062](#p-062) | Licenses (assets) | Upstream demo photos and textures are not covered by the code license |
| [P-063](#p-063) | Components (hydration) | Reduced motion read through a hook still runs one WebGL setup on hydration |
| [P-064](#p-064) | Tests (axe) | axe's region rule takes over 30 s on a page with a large highlighted source |
| [P-065](#p-065) | Components (TypeScript) | A type imported without `type` breaks hydration under `verbatimModuleSyntax` |
| [P-066](#p-066) | Components (React Aria) | A TabList drops every element that wraps a Tab |
| [P-067](#p-067) | Components (Radix Tooltip) | The arrow's height is added to `sideOffset` |
| [P-068](#p-068) | Components (tabs) | Radix and Base UI tabs select on mousedown, so a drag selects |
| [P-069](#p-069) | Components (Radix Tabs) | `Tabs.Root` writes its own `dir`, hiding the page direction |
| [P-070](#p-070) | Fidelity harness (Vite) | A dependency found mid-run reloads the page with two Reacts |
| [P-071](#p-071) | Registry (validator) | Icon names in a shared comment fail the icon-pair check |
| [P-072](#p-072) | Tests (axe) | Text on an SVG surface reads as low contrast |
| [P-073](#p-073) | Registry (shadcn CLI) | A base-style project rewrites `asChild` in Radix items |

---

### P-001

- Date: 2026-10-12
- Area: Deployments (Vercel)
- Symptom: The first `vercel deploy` of the newly created `design-from-labs`
  project produced a production deployment, not a preview.
- Cause: Vercel treats the first deployment of a new project as its
  production deployment.
- Fix: Later deployments pass the target explicitly; production follows
  `main` once the GitHub repository is connected.
- Prevention: Always run `vercel deploy --target preview` by hand; never run a
  bare `vercel deploy` on a new project. Prefer connecting Git first, so the
  first deployment comes from a branch.
- Links: [docs/CICD.md, Deployments](CICD.md#deployments), [#3](https://github.com/Design-from-labs/labs/pull/3)

### P-002

- Date: 2026-10-12
- Area: GitHub (branches)
- Symptom: Merging the first `staging` to `main` release pull request deleted
  the `staging` branch.
- Cause: The repository setting "Automatically delete head branches" was on,
  and a release pull request's head branch is `staging`.
- Fix: A repository ruleset that restricts deletion of `staging` and `main`;
  `staging` was restored from its last commit.
- Prevention: Keep the deletion rule on long-lived branches in the ruleset
  (head-branch auto-delete can stay on for feature branches). Check that
  `staging` still exists after every release merge.
- Links: [#4](https://github.com/Design-from-labs/labs/pull/4)

### P-003

- Date: 2026-10-12
- Area: GitHub (merge methods)
- Symptom: The release pull request could not be merged with a merge commit.
- Cause: The repository allowed squash merging only. Squashing `staging` into
  `main` would rewrite history and make the two branches diverge.
- Fix: Merge commits are allowed. Feature pull requests into `staging` are
  squashed; release pull requests into `main` use a merge commit.
- Prevention: Check the merge method before merging: squash into `staging`,
  merge commit into `main`.
- Links: [#4](https://github.com/Design-from-labs/labs/pull/4), [#6](https://github.com/Design-from-labs/labs/pull/6)

### P-004

- Date: 2026-10-12
- Area: npm publishing (CI)
- Symptom: Publishing through npm trusted publishing (OIDC) failed to
  authenticate in the Publish to npm workflow.
- Cause: `actions/setup-node` with `registry-url` writes an `.npmrc` that
  reads `NODE_AUTH_TOKEN`, with a placeholder value when no token is given.
  npm uses that token instead of exchanging the OIDC token.
- Fix: `registry-url` removed from the publish job; npm 11.5 or later
  exchanges the OIDC token itself.
- Prevention: No `registry-url` and no npm token in any workflow that
  publishes ([docs/publishing.md](publishing.md)).
- Links: [#5](https://github.com/Design-from-labs/labs/pull/5)

### P-005

- Date: 2026-10-12
- Area: npm publishing (local)
- Symptom: A local `npm publish` failed with "provenance not supported for
  provider: null".
- Cause: `publishConfig.provenance: true` in the package manifests asks npm
  for provenance, which is only possible from a supported CI provider.
- Fix: The first (manual) publishes ran with `--provenance=false`; CI
  publishes keep provenance.
- Prevention: Publish only from the workflow. If a manual publish is ever
  needed again, pass `--provenance=false` and record why.
- Links: [docs/publishing.md](publishing.md), `packages/react/package.json`,
  `packages/cli/package.json`

### P-006

- Date: 2026-10-12
- Area: npm publishing (setup)
- Symptom: The trusted publisher could not be configured for
  `@designfrom/react` and `designfrom` before their first release.
- Cause: npmjs.com only offers trusted publishing settings on an existing
  package.
- Fix: Version 0.1.0 of both packages was published by hand, then the trusted
  publisher was configured on each package page.
- Prevention: Plan a manual first publish (with P-005 in mind) for every new
  package name, then switch it to the workflow.
- Links: [docs/publishing.md](publishing.md), [#5](https://github.com/Design-from-labs/labs/pull/5)

### P-007

- Date: 2026-10-12
- Area: npm publishing (ownership)
- Symptom: The `designfrom` CLI package did not appear under the
  `designfrom` npm organization.
- Cause: Unscoped packages cannot belong to an npm organization; they are
  owned by the account that publishes them.
- Fix: The trusted publisher and 2FA policy are configured on the package page
  under the owner's account.
- Prevention: Expect unscoped names to be account-owned; put organization
  packages under the `@designfrom` scope.
- Links: [docs/publishing.md](publishing.md),
  [decision 0008](decisions/0008-npm-names.md)

### P-008

- Date: 2026-10-12
- Area: CI guards (`pr-text`)
- Symptom: The `pr-text` check failed on a pull request whose Sources section
  was correct.
- Cause: `scripts/check-sources-core.mjs` reads the Sources section up to the
  next heading. Text after `## Sources` with no following heading (for
  example the generated-by footer) becomes part of the section.
- Fix: End the Sources section with another heading (`## Notes`, `## Evidence`)
  before any other text.
- Prevention: Use the pull request template unchanged; it puts a heading after
  Sources.
- Links: `scripts/check-sources-core.mjs`, [#5](https://github.com/Design-from-labs/labs/pull/5)

### P-009

- Date: 2026-10-12
- Area: Registry (names)
- Symptom: The first real export reused names that the Labs examples already
  had: `button`, `badge`, `tooltip`, the theme and the fonts.
- Cause: The registry namespace is flat across all sources
  ([contract](contract.md), section 1); the examples were seeded with the most
  common names.
- Fix: For the preview, the export replaced the example entries of the same
  name; the validator refuses a duplicate name.
- Prevention: Before an export, compare its names with `/r/registry.json` and
  decide replace or rename in the export pull request. Tests that depend on an
  example (e2e) must move with it.
- Links: [#7](https://github.com/Design-from-labs/labs/pull/7)

### P-010

- Date: 2026-10-12
- Area: Components (accessibility)
- Symptom: The Base UI tooltip's popup was not announced as the description of
  its trigger.
- Cause: The Base UI trigger did not set `aria-describedby` to the popup.
- Fix: The example wires `aria-describedby` from the trigger to the popup id;
  the e2e tooltip test checks it on every primitive.
- Prevention: Keep the keyboard and `aria-describedby` assertions in
  `e2e/site.spec.ts` for every tooltip variant.
- Links: `examples/tooltip/base/tooltip.tsx`, [#3](https://github.com/Design-from-labs/labs/pull/3)

### P-011

- Date: 2026-10-12
- Area: Toolchain (pnpm)
- Symptom: Installing `radix-ui@1.8.0` failed.
- Cause: pnpm's `minimumReleaseAge` refuses releases that are too new;
  1.8.0 was eleven hours old.
- Fix: Pinned `radix-ui@1.6.7`, an aged release.
- Prevention: Pin aged releases; do not exclude new packages from the policy
  ([decision 0010](decisions/0010-toolchain-pins.md)).
- Links: [decision 0010](decisions/0010-toolchain-pins.md), [#3](https://github.com/Design-from-labs/labs/pull/3)

### P-012

- Date: 2026-10-12
- Area: Registry (headers)
- Symptom: The provenance header vanished from files installed with
  `shadcn add`.
- Cause: The shadcn CLI drops comments above a file's first import.
- Fix: The build inserts the `@dfl-header` after the imports.
- Prevention: Never move the header above the imports; `registry-install` in
  CI installs real items.
- Links: [contract](contract.md), section 2, `scripts/lib/publish.mjs`, [#3](https://github.com/Design-from-labs/labs/pull/3)

### P-013

- Date: 2026-10-12
- Area: Deployments (Vercel)
- Symptom: After a failed `vercel git connect`, a project was no longer linked
  to its repository (seen outside this repository).
- Cause: The reconnect failed part-way and left the project with no Git
  link; the CLI reported the failure but did not restore the old link.
- Fix: Relink through the API, `POST /v9/projects/{id}/link`.
- Prevention: Check the project's Git link after any reconnect; keep the API
  call at hand.
- Links: none (outside this repository)

### P-014

- Date: 2026-10-12
- Area: DNS
- Symptom: `labs.designfrom.com` did not resolve after the record was added.
- Cause: The record's host was entered as `lab` instead of `labs`.
- Fix: The record was re-entered as `labs`.
- Prevention: After any DNS change, check the exact name
  (`dig +short labs.designfrom.com`) before calling it done.
- Links: [docs/CICD.md, Deployments](CICD.md#deployments)

### P-015

- Date: 2026-10-12
- Area: Tests (Playwright)
- Symptom: The phone-width overflow check passed, but `/ui` and the component
  pages scrolled sideways at 320 and 375 px.
- Cause: The test ran on Playwright's `Pixel 7` device, which emulates a
  mobile browser: the layout viewport widens to fit the content, so
  `scrollWidth - innerWidth` stays 0 even when the page overflows.
- Fix: `e2e/layout.spec.ts` checks 320 and 375 px with mobile emulation off,
  left-to-right and right-to-left, on every page type.
- Prevention: Measure overflow at explicit widths with `isMobile: false`.
- Links: `e2e/layout.spec.ts`, [#8](https://github.com/Design-from-labs/labs/pull/8)

### P-016

- Date: 2026-10-12
- Area: Tests (view transitions)
- Symptom: The morph assertions failed at random: the new page's
  `pagereveal` had no view transition, although the old page's `pageswap`
  reported one.
- Cause: Headless Chromium drops a cross-document view transition on the
  incoming page now and then: 12 of 20 runs with ten parallel workers, about
  1 in 12 even one at a time. A click before the outgoing page's first frame
  also has nothing to capture.
- Fix: The view-transition tests run in their own Playwright project
  (`transitions`), after the others and in order; they wait for the page to
  be revealed and painted before clicking; and `navigateWithMorph` in
  `e2e/gallery.spec.ts` retries a navigation that shows no morph twice from
  the same starting state before failing.
- Prevention: Assert morphs only through `navigateWithMorph`, in the
  `transitions` project.
- Links: `playwright.config.ts`, `e2e/gallery.spec.ts`, [#8](https://github.com/Design-from-labs/labs/pull/8)

### P-017

- Date: 2026-10-12
- Area: Site (layout)
- Symptom: Long commands, registry URLs and author links pushed the page wider
  than a phone screen.
- Cause: A grid with no column template sizes its implicit column to the
  content's min-content width, and grid and flex children default to
  `min-width: auto`; a `1fr` track is `minmax(auto, 1fr)`.
- Fix: `grid-cols-1` on single-column grids, `minmax(0, 1fr)` for flexible
  tracks, `min-w-0` on the command row, and `break-words` or `break-all` on
  long unbroken values.
- Prevention: The 320 px checks in `e2e/layout.spec.ts` (P-015).
- Links: `src/pages/ui/[component].astro`, `src/components/Command.astro`,
  [#8](https://github.com/Design-from-labs/labs/pull/8)

### P-018

- Date: 2026-10-12
- Area: Tests (local)
- Symptom: Local e2e runs failed on code that was already fixed.
- Cause: `playwright.config.ts` reuses any server on port 4321 outside CI. A
  preview server from another checkout or worktree was answering, so the
  tests ran against a different build.
- Fix: Run against your own server: stop the other preview, or point a local
  config's `baseURL` at your own preview port.
- Prevention: Before a local e2e run, check what listens on 4321
  (`lsof -iTCP:4321 -sTCP:LISTEN`).
- Links: `playwright.config.ts`, [#8](https://github.com/Design-from-labs/labs/pull/8)

### P-019

- Date: 2026-10-12
- Area: Site build (publishing)
- Symptom: A port pull request's Vercel preview showed none of the beta
  components it added, so there was nothing to review.
- Cause: `siteData` kept only `ready` entries (decision 0005) on every build.
- Fix: Preview deployments (`VERCEL_ENV=preview`) and `LABS_INCLUDE_BETA=1`
  builds also show beta entries, labeled; the npm library stays ready-only
  (decision 0014).
- Prevention: Review beta locally with `LABS_INCLUDE_BETA=1 pnpm build:site`;
  `scripts/publish-visibility.test.mjs`.
- Links: [#9](https://github.com/Design-from-labs/labs/pull/9), `docs/decisions/0014-beta-on-preview-deployments.md`

### P-020

- Date: 2026-10-12
- Area: Tests (local)
- Symptom: Requests to `astro preview --port 4391` timed out; the server was
  answering on 4392, and Playwright's `webServer` reported that the preview
  "exited before becoming ready".
- Cause: Astro 7's `astro preview` starts a background server, takes the next
  free port when the requested one is busy, and refuses to start a second
  server while its lock file names one.
- Fix: Read the port from the "Preview server running at" line; stop it with
  `pnpm exec astro preview stop`. For a separate e2e run, use a local config
  whose `webServer` runs `astro preview --port <free> --ignore-lock` with the
  worktree as `cwd`.
- Prevention: Never assume the requested port (see P-018), and stop only the
  server your task started.
- Links: [#9](https://github.com/Design-from-labs/labs/pull/9)

### P-021

- Date: 2026-10-12
- Area: Components (right to left)
- Symptom: Under `dir="rtl"` a domino row reversed its colors after
  mirroring, and the Scroll Unroll title rendered outside the stage.
- Cause: Grids and flex rows already reverse in a right-to-left context, so
  mirroring them flips twice; and a `width: fit-content` block in a
  right-to-left container sits at the right edge, so `left: 50%` pushes it
  out.
- Fix: Draw the figure with `direction: ltr` and physical insets, as
  upstream, then mirror it once with `:dir(rtl)`; restore `direction: rtl`
  only where text reads.
- Prevention: Compare the right-to-left render with the horizontally flipped
  left-to-right render (no differing pixels expected).
- Links: [#9](https://github.com/Design-from-labs/labs/pull/9)

### P-022

- Date: 2026-10-12
- Area: Components (CSS transforms)
- Symptom: `scale: -1 1` on an element centered with
  `transform: translate(-50%, -50%)` moved it by its own width.
- Cause: The individual `scale` property applies outside `transform`, so it
  mirrors the translation too.
- Fix: For those elements append `scale(-1, 1)` to the static transform in
  the `:dir(rtl)` rule; use the `scale` property only on elements without a
  positioning transform.
- Prevention: The flipped-render comparison in P-021.
- Links: [#9](https://github.com/Design-from-labs/labs/pull/9)

### P-023

- Date: 2026-10-12
- Area: Fidelity (screenshot diffs)
- Symptom: Scroll Unroll differed by 0.25% to 0.82% of stage pixels while
  every other port matched exactly.
- Cause: The spaces between inline-block letters and the line strut use the
  parent's font and line height. The upstream page inherits the browser
  defaults; Tailwind preflight sets a sans font and `line-height: 1.5`.
- Fix: The harness gives the page the upstream defaults
  (`font-family: initial; line-height: normal`) and the upstream letter font;
  the component is unchanged.
- Prevention: Reproduce the upstream page's typographic context before
  diffing, and record both numbers.
- Links: [#9](https://github.com/Design-from-labs/labs/pull/9), `docs/evidence/ports/scroll-unroll/fidelity.md`

### P-024

- Date: 2026-10-12
- Area: Components (layout)
- Symptom: A part positioned with `position: relative; top: 50%; left: 50%`
  sat off center.
- Cause: The root used `grid place-content-center`, which centers the part
  first; the offsets then apply again.
- Fix: Give each root the upstream container's display (grid only where
  upstream uses grid).
- Prevention: Diff the 0% frame before reviewing motion.
- Links: [#9](https://github.com/Design-from-labs/labs/pull/9)

### P-025

- Date: 2026-10-12
- Area: Components (responsive)
- Symptom: On the 375 px component page (a 277 px stage) Rattle Bounce piled
  its bricks 1 + 2 + 2 instead of 3 + 2.
- Cause: Upstream wraps fixed 90 px bricks across the full 320 px stage.
- Fix: A centered 280 px pile column, pixel-identical at 320 px.
- Prevention: Check every demo at 375 px wide, not only at 1280.
- Links: [#9](https://github.com/Design-from-labs/labs/pull/9)

### P-026

- Date: 2026-10-12
- Area: Site (React 19 in Astro islands)
- Symptom: A component's keyframe `<style href precedence>` stays in the
  island markup instead of `<head>`, once per island.
- Cause: Each Astro island is a separate React root; React hoists and
  deduplicates only within one root.
- Fix: None needed: the copies are identical, the styles apply on first
  paint, and hydration logs no warning.
- Prevention: Do not rely on cross-island deduplication for anything
  stateful.
- Links: [#9](https://github.com/Design-from-labs/labs/pull/9), `docs/decisions/0013-keyframes-in-hoisted-style.md`

### P-027

- Date: 2026-10-12
- Area: Fidelity harness
- Symptom: `Dynamic require of "util" is not supported` when running an
  esbuild ESM bundle that rendered components on the server.
- Cause: esbuild inlined React's CommonJS server build, which requires Node
  built-ins.
- Fix: Bundle with `--packages=external` so React loads from `node_modules`.
- Prevention: Keep framework packages external in Node-side harness bundles.
- Links: [#9](https://github.com/Design-from-labs/labs/pull/9)

### P-028

- Date: 2026-10-12
- Area: Site (layout)
- Symptom: With the beta ports shown, `/credits` scrolled sideways by 174 px
  at 320 px wide, on every "By component" row.
- Cause: The list was a grid with no column template (P-017), and a
  third-party attribution carried an unbroken license URL, so the implicit
  column took that URL's width.
- Fix: `grid-cols-1` and `break-words` on the list; the attribution is the
  short notice (`Copyright (c) 2026 yui540. MIT License.`), as the
  `sources.yaml` example shows; the source link is already on the page.
- Prevention: Run `e2e/layout.spec.ts` against a `LABS_INCLUDE_BETA=1` build
  when a pull request adds beta content.
- Links: [#9](https://github.com/Design-from-labs/labs/pull/9), `src/pages/credits.astro`

### P-029

- Date: 2026-10-12
- Area: Site (Astro)
- Symptom: A prop called `slot` passed to an Astro component never arrived;
  the child was placed in a named slot of the parent instead.
- Cause: `slot` is a reserved attribute in Astro templates: it assigns the
  element or component to a named slot.
- Fix: The stage shell's prop is `region`.
- Prevention: Never name an Astro prop `slot`; the same goes for other
  directive-like names (`class:list`, `set:html`, `transition:*`).
- Links: `src/components/StageShell.astro`

### P-030

- Date: 2026-10-12
- Area: Accessibility (axe, iframes)
- Symptom: axe reported `landmark-unique` on the component page of a staged
  component: two `nav` landmarks named "Main", and two `main` landmarks.
- Cause: `@axe-core/playwright` analyzes same-origin iframes as part of the
  page, so the framed stage document's landmarks join the site's.
- Fix: The stage shell has no `<main>`; the demo names its navigation
  ("Studio") instead of using the component's default ("Main").
- Prevention: A stage document has a title, no `<main>`, and landmark names
  that the site does not use. `e2e/a11y.spec.ts` covers a staged page.
- Links: `src/components/StageShell.astro`, `examples/sidebar/demo.tsx`

### P-031

- Date: 2026-10-12
- Area: Content (Labs examples)
- Symptom: After `pnpm examples`, every example's `meta.json` showed as
  changed although only one example was edited.
- Cause: `source.commit` (and `date`) follow the last commit that touched
  each example, which moves with the branch; `pnpm examples:check` ignores
  both fields, so the churn is harmless but noisy.
- Fix: Restore the untouched examples' `meta.json` before committing
  (`git checkout -- content/components/labs-examples/<name>/meta.json`).
- Prevention: Commit only the examples you changed; CI's `examples:check`
  stays green either way.
- Links: `scripts/export-labs-examples.mjs`

### P-032

- Date: 2026-10-12
- Area: Deployments (Vercel headers)
- Symptom: Every stage frame would have been empty on Vercel, while local
  previews and every e2e test showed it working.
- Cause: `vercel.json` sends `X-Frame-Options: DENY` on every path, which
  forbids framing even by the same origin. `astro preview` does not apply
  `vercel.json`, so nothing local could see it; `vercel curl -I` on the
  branch deployment showed the header on `/stage/*`.
- Fix: `/stage/*` gets `X-Frame-Options: SAMEORIGIN` and
  `Content-Security-Policy: frame-ancestors 'self'`; every other path keeps
  `DENY`.
- Prevention: `scripts/vercel-headers.test.mjs` checks the rules. After a
  change to `vercel.json`, check the real headers on the branch deployment
  (`vercel curl <path> --deployment <url> -- -sI`).
- Links: `vercel.json`, [#10](https://github.com/Design-from-labs/labs/pull/10)

### P-033

- Date: 2026-10-12
- Area: Components (CSS order)
- Symptom: The ported Gooey Toast's first toast was missing on a 375 px page
  for seconds, and a later one rendered behind a stray earlier one, while the
  same code from upstream's package did not.
- Cause: Upstream's stylesheet loads before Sonner injects its own, and
  several rules of equal specificity rely on that order. The port injected
  its stylesheet when the toaster mounted, after Sonner's.
- Fix: The toaster inserts its `<style>` directly before Sonner's.
- Prevention: When a port replaces a CSS import with injected styles, keep
  upstream's cascade position and diff the first frame on a phone width.
- Links: `ports/goey-toast/gooey-toast/gooey-toast-core.ts`, `docs/evidence/ports/gooey-toast/fidelity.md`

### P-034

- Date: 2026-10-12
- Area: Fidelity harness (Playwright clock)
- Symptom: Frames captured "at 150 ms" differed between two identical runs;
  with `clock.setFixedTime`, Motion animations sometimes stayed at their first
  frame for seconds.
- Cause: `page.clock.install()` leaves time running until `clock.pauseAt()`;
  and `setFixedTime` freezes the clock Motion's frame loop reads.
- Fix: `install` then `pauseAt` before navigating, and step with `runFor` in
  small increments with a little real time between them (WAAPI and CSS
  transitions run on real time). Use real time, not a fixed clock, for
  Motion's settled states.
- Prevention: Use the clock only for code driven by `requestAnimationFrame`
  and `performance.now` (DotMorph); freeze WAAPI animations with
  `Animation.currentTime` instead (TextMorph).
- Links: `docs/evidence/ports/dot-morph/fidelity.md`, `docs/evidence/ports/gooey-toast/fidelity.md`

### P-035

- Date: 2026-10-12
- Area: Fidelity harness (real-time captures)
- Symptom: Gooey Toast frames differed by up to a few percent between runs,
  in both directions, and a pill toast sometimes vanished a few seconds in.
- Cause: Upstream's own nondeterminism: spring timing in real time, and an
  occasional early dismissal of a pill toast, in upstream and the port alike.
- Fix: One toast per fresh page, captured once two frames 250 ms apart are
  identical; the best of three captures; a retrigger when the toast vanished;
  and an upstream-against-upstream control under the same conditions
  (up to 0.089%) to show the noise floor.
- Prevention: Report a control row whenever a port's numbers come from real
  time.
- Links: `docs/evidence/ports/gooey-toast/fidelity.md`

### P-036

- Date: 2026-10-12
- Area: Components (right to left)
- Symptom: Text Morph showed "scratch morf Design" for "Design from scratch"
  inside a `dir="rtl"` page.
- Cause: The engine splits text into inline-block spans; in a right-to-left
  context the bidi algorithm orders those spans right to left, reversing
  Latin words and letters. Upstream has the same behavior.
- Fix: The rendered element gets `dir="auto"` (a `dir` prop), so the text's
  own direction applies; left-to-right pages render identically.
- Prevention: Render text components in `dir="rtl"` with Latin text, not just
  with mirrored layout.
- Links: `ports/torph/text-morph/text-morph.tsx`

### P-037

- Date: 2026-10-12
- Area: Site (gallery tiles and previews)
- Symptom: The Handwriting tile and its `pnpm previews` still were blank, and
  DotMorph's tile would have been.
- Cause: Tiles and `/preview/<item>` render on the server and never hydrate.
  Tegaki draws strokes on a canvas in the browser, and upstream DotMorph hides
  its icon until a client-side swell-in.
- Fix: The Handwriting demo shows the words as text until it hydrates;
  DotMorph renders its resting single dot on the server.
- Prevention: Look at the gallery tile, not only the component page, for
  every canvas or client-only demo.
- Links: `ports/tegaki/handwriting/demo.tsx`, `ports/peckz-playground/dot-morph/dot-morph.tsx`

### P-038

- Date: 2026-10-12
- Area: Tooling (Vite dev server)
- Symptom: Under `vite dev`, Handwriting logged "wasm streaming compile
  failed ... expected magic word" and drew in a fallback font.
- Cause: Vite's dependency pre-bundling moves `tegaki`'s font bundles and
  `harfbuzzjs` into `.vite/deps` without their `.ttf` and `.wasm` files, so
  the dev server answers those URLs with `index.html`.
- Fix: `optimizeDeps: { exclude: ["tegaki", "harfbuzzjs"] }`; the item's docs
  say so. Production builds are unaffected.
- Prevention: Keep the note in the Handwriting docs.
- Links: `ports/tegaki/handwriting/component.json`

### P-039

- Date: 2026-10-12
- Area: npm library (tsdown)
- Symptom: With Gooey Toast marked ready, `@designfrom/react`'s `dist` gained
  a `node_modules` folder with Motion inside.
- Cause: tsdown keeps only the package's dependencies and peers external;
  `motion` was neither.
- Fix: `motion`, `sonner`, `tegaki` and `harfbuzzjs` are optional peers of
  `@designfrom/react`.
- Prevention: When an item adds a dependency, add it to the library's
  optional peers in the same pull request, and look for `dist/node_modules`.
- Links: `packages/react/package.json`

### P-040

- Date: 2026-10-12
- Area: npm library (barrel)
- Symptom: Porting torph as is would have exported `TextMorph` from two files
  of one item: the vanilla class and the React component.
- Cause: `scripts/prepare-content.mjs` re-exports every file of an item with
  `export *`, and TypeScript rejects an ambiguous re-export (TS2308).
- Fix: The class is `TextMorphEngine` in the port.
- Prevention: Give every exported name in an item's files a distinct name;
  a trial ready build runs the library's `tsc`.
- Links: `ports/torph/text-morph/text-morph-engine.ts`

### P-041

- Date: 2026-10-12
- Area: Site (component page)
- Symptom: Text Morph, Handwriting and Dot Morph pages had no direction
  switch, so right to left could not be reviewed there.
- Cause: The switch is rendered inside the variant switcher, which only shows
  when a component has more than one variant or a stage.
- Fix: None on the site yet; `e2e/ports.spec.ts` sets the frame's `dir` the
  way the switch does.
- Prevention: A follow-up for the site: show the direction switch on every
  component page.
- Links: `src/pages/ui/[component].astro`, `e2e/ports.spec.ts`

### P-042

- Date: 2026-10-12
- Area: Components (Next.js)
- Symptom: A fresh Next.js 16 app with the Handwriting item failed
  `next build`: "Module not found: Can't resolve 'module'" in
  `harfbuzzjs/dist/harfbuzz.js`; with that aliased, prerendering failed with
  ENOENT on `/_next/static/media/harfbuzz.*.wasm`.
- Cause: harfbuzzjs's Emscripten loader imports Node's `module` on its server
  branch, which Turbopack resolves for the browser bundle too, and it loads
  its WASM when the module is evaluated, including on the server.
- Fix: The item imports only `tegaki`; shaping is opt-in, registered in the
  browser with a dynamic `import("tegaki/shaper-harfbuzz")`, and the docs give
  the Turbopack alias it then needs.
- Prevention: Install an item that adds a WASM or Node-flavored dependency
  into a fresh Next.js app (`scripts/registry-install-test.sh` does once it is
  ready) before calling it portable.
- Links: `ports/tegaki/handwriting/component.json`, `docs/evidence/ports/handwriting/fidelity.md`

### P-043

- Date: 2026-10-12
- Area: Ports (process)
- Symptom: The data-display batch and the text-motion batch each wrote a
  `scripts/export-ports.mjs` and a `ports/` layout at the same time, with
  different `component.json` shapes; the second to land would have broken the
  first one's exports.
- Cause: Parallel pods started from the same staging commit with no shared
  owner for the pipeline.
- Fix: Rebased onto staging and extended the merged exporter with a second,
  opt-in shape (`variants`, decision 0017); the flat shape's exports stayed
  byte-identical (`pnpm ports:check`).
- Prevention: Shared pipeline code lands first in its own small pull request;
  a pod that needs a pipeline change extends it behind a new field.
- Links: `scripts/export-ports.mjs`, `docs/decisions/0017-port-variants-and-nested-targets.md`

### P-044

- Date: 2026-10-12
- Area: npm library
- Symptom: An item whose files keep nested targets (`components/liveline/draw/index.ts`
  next to `components/liveline/index.ts`) would be written by basename into one
  library folder once ready, so files collide and relative imports such as
  `../math/lerp` break.
- Cause: `scripts/prepare-content.mjs` writes each library file as
  `file.path.split("/").pop()` and re-exports all of them.
- Fix: None needed while such items are beta (the library takes ready items
  only); they are reviewed on preview deployments.
- Prevention: Before promoting a nested item, make the library generator keep
  each file's target path and export only the item's entry module, then run
  `pnpm build` and `pnpm pack:dry` with the item ready.
- Links: `scripts/prepare-content.mjs`, decision 0017

### P-045

- Date: 2026-10-12
- Area: Contract imports
- Symptom: Upstream registry files importing `@/lib/store/hooks` or
  `@/components/data-table/types` fail `validate:content` ("alias ... is not
  allowed").
- Cause: The contract allows only single-segment registry aliases
  (`@/components/ui/<name>`, `@/lib/<name>`); everything inside one item is
  relative.
- Fix: The data-table ports fold upstream's `lib/`, `hooks/` and `providers/`
  under one `target` root and import between files relatively.
- Prevention: Grep a port for `from "@/` with more than one path segment before
  exporting.
- Links: `ports/data-table-filters/`

### P-046

- Date: 2026-10-12
- Area: Ports (exporter)
- Symptom: Every exported Liveline file ended with a license footer whose
  lines carried `\r`, visible as `\r` escapes in the item JSON and as mixed
  line endings after `shadcn add`.
- Cause: The upstream LICENSE uses CRLF line endings, and the footer split
  the text on `\n` only.
- Fix: `licenseFooter` normalises `\r\n` and `\r` to `\n` before building the
  footer; a test covers it.
- Prevention: Treat every upstream text file as possibly CRLF when copying it
  into generated output.
- Links: `scripts/export-ports.mjs`, `scripts/export-ports.test.mjs`

### P-047

- Date: 2026-10-12
- Area: Ports (process)
- Symptom: `LABS_INCLUDE_BETA=1 pnpm build:site` failed in the batch's shared
  worktree on a demo that another worker had not finished, so a finished
  component could not be checked in the site.
- Cause: The site build validates and bundles every entry under
  `content/components/`, including half-written sibling ports.
- Fix: Each worker built from an isolated copy of the worktree holding only
  committed content plus its own component.
- Prevention: When several workers share a worktree, run the site build from a
  per-worker copy (or a temporary `git worktree` at the commit being checked).
- Links: `docs/decisions/0014-beta-on-preview-deployments.md`

### P-048

- Date: 2026-10-12
- Area: Components (development tools)
- Symptom: The GuideframeGrid port first showed its layout overlay in
  production by default, so an app that did not wire `enabled` would ship a
  grid over its pages.
- Cause: The contract banned all environment access in item files, so the
  port could not reproduce upstream's `process.env.NODE_ENV` gate.
- Fix: Decision 0018 allows exactly `process.env.NODE_ENV` (inlined by every
  bundler); `validate:content` refuses any other environment read; the port
  defaults to on in development, off in production, with `enabled` as an
  override.
- Prevention: Port development-only tools with their production gate intact.
- Links: `docs/decisions/0018-node-env-in-items.md`, `scripts/validate-env.test.mjs`

### P-049

- Date: 2026-10-12
- Area: Site (demo aliases)
- Symptom: `LABS_INCLUDE_BETA=1 pnpm build:site` failed on the Liveline demo:
  `@/components/liveline` did not resolve, although Vite, Next.js and
  TypeScript all resolve it to `components/liveline/index.ts` in an
  installing app.
- Cause: The `labs-item-aliases` plugin in `astro.config.mjs` tried only
  `<path>.tsx` and `<path>.ts`.
- Fix: The plugin also tries `<path>/index.tsx` and `<path>/index.ts`, in the
  item's own files and in the dependency index.
- Prevention: Resolve demo imports the way the installing app's bundler would.
- Links: `astro.config.mjs`

### P-050

- Date: 2026-10-12
- Area: Site (specimen loops)
- Symptom: On a beta build, a few seconds after opening `/ui` the browser
  navigated to a component page by itself, and loop tests timed out.
- Cause: The loop driver's `click` step calls `click()` on a control inside
  the specimen, and the specimen sits inside the tile's `<a>`. The click
  bubbled to the link and ran its activation behaviour: a navigation.
- Fix: The driver cancels the click at the tile (`preventDefault` in a
  listener on the tile, added just for the scripted click). The component's
  own handlers have already run by then, so only the navigation stops.
- Prevention: `e2e/wall.spec.ts` checks the URL after a full loop cycle. Any
  synthetic event inside a link must be cancelled at the link.
- Links: `src/scripts/specimens.ts`

### P-051

- Date: 2026-10-12
- Area: Site (view transitions)
- Symptom: During the morph from a wall tile, the other staged tiles' device
  frames and the dark tile hung over the new page for most of the
  transition.
- Cause: Every tile has a static view-transition name, so each is captured
  as its own group. A tile with no partner on the next page still took its
  class's crossfade timing (400 ms), not the page's quick fade-out.
- Fix: `::view-transition-old(*):only-child` and
  `::view-transition-new(*):only-child` (an image without a partner is the
  only child of its pair) fade with the outgoing and incoming page.
- Prevention: When a class gets its own old/new animation, check a frame
  captured mid-transition with other named elements on the page.
- Links: `src/styles/global.css`, `docs/decisions/0019-specimen-wall.md`

### P-052

- Date: 2026-10-12
- Area: Site (header)
- Symptom: Every page scrolled sideways at 320px after the brand text was
  set to `whitespace-nowrap` (to stop it wrapping at 375px).
- Cause: Brand plus four navigation links need about 355px on one line.
- Fix: The brand may wrap below 360px, and below 400px the duplicate "Labs"
  link is hidden (the logo already links home).
- Prevention: `e2e/layout.spec.ts` checks every page at 320 and 375px; run
  it after any header change.
- Links: `src/layouts/Base.astro`

### P-053

- Date: 2026-10-12
- Area: Tests (beta builds)
- Symptom: "The gallery renders server-side demos without hydrating" passed
  on the CI build and failed on a `LABS_INCLUDE_BETA=1` build.
- Cause: The beta ports have `loop.hydrate`, so the wall rightly has
  islands there; the test asserted none at all.
- Fix: The test asserts no island outside a specimen marked
  `data-loop-hydrate`.
- Prevention: Run e2e on a beta build too before merging a change to the
  wall: `LABS_INCLUDE_BETA=1 pnpm build:site && pnpm e2e`.
- Links: `e2e/site.spec.ts`

### P-054

- Date: 2026-10-12
- Area: Site (specimen wall)
- Symptom: The ThiingsGrid tile was blank, although its island hydrated and
  rendered cells.
- Cause: The specimen wrapper was a grid with `place-items: center` and an
  automatic column. The demo's root is `w-full` and its cells are absolutely
  positioned, so the root had no content width: its column, and the root
  with it, resolved to 0px. The opposite case (the Lifeline rail) sized its
  column to 5,600px of content and spilled out of the tile.
- Fix: `grid-template-columns: minmax(0, 1fr)` on a wrapper as wide as the
  tile's padding box: a full-width demo fills the tile, a fixed-size one is
  centred.
- Prevention: `e2e/wall.spec.ts` checks that a full-width demo fills its
  tile and that no specimen leaves its tile.
- Links: `src/styles/global.css`

### P-055

- Date: 2026-10-12
- Area: Site (specimen wall)
- Symptom: The Lifeline tile was cropped at the right on desktop and became
  a tall text list on phones; small tiles shrank some demos too much.
- Cause: Two fixed `zoom` steps by tile width cannot know a demo's real size,
  and tiles on phones could be three rows tall.
- Fix: One measured, contain-style scale per specimen (a transform), padding
  relative to the tile, and at most two rows per tile on phones.
- Prevention: `e2e/wall.spec.ts`: no specimen outside its tile at 1440 and
  375px; no phone tile taller than two rows.
- Links: `src/scripts/specimens.ts`, `src/styles/global.css`

### P-056

- Date: 2026-10-12
- Area: Site (specimen wall)
- Symptom: A specimen that grew after hydration was not re-fitted.
- Cause: An `astro-island` element is `display: contents`, so it has no box
  and a ResizeObserver on it never reports.
- Fix: Observe the island's rendered children (`astro-island > *`) as well as
  the wrapper and the tile.
- Prevention: Never observe an island element itself.
- Links: `src/scripts/specimens.ts`

### P-057

- Date: 2026-10-12
- Area: Fidelity (WebGL screenshots)
- Symptom: The same WebGL frame came out differently depending on how
  Chromium was launched.
- Cause: Headless Chromium on macOS uses ANGLE on SwiftShader (software) by
  default and the Metal GPU with `--use-angle=metal`; GPU bytes depend on the
  GPU and driver.
- Fix: Every WebGL fidelity run pins SwiftShader (`--use-angle=swiftshader
  --enable-unsafe-swiftshader`), which is deterministic: the upstream noise
  floor (two loads diffed) was 0.000% for every still frame.
- Prevention: Record the renderer string and flags in each fidelity.md;
  compare a port only with upstream captured under the same flags (decision
  0021).
- Links: `docs/decisions/0021-webgl-render-loop.md`, `docs/evidence/ports/iridescent-ribbon/fidelity.md`

### P-058

- Date: 2026-10-12
- Area: Fidelity harness (screenshots)
- Symptom: Every ribbon frame differed by 100%: the upstream canvas capture
  was 1216x685 and the port's 1216x684.
- Cause: The upstream canvas sits at y = 234.59 px; Playwright's element
  screenshot rounds the clip outward, while the compositor snaps the canvas
  to whole pixels.
- Fix: Capture a page clip at the box rounded to whole CSS pixels on both
  sides (or read the canvas with `toDataURL` when it preserves its buffer).
- Prevention: Check both capture sizes before reading a percentage; a size
  mismatch is reported as 100%.
- Links: `docs/evidence/ports/iridescent-ribbon/fidelity.md`

### P-059

- Date: 2026-10-12
- Area: Components (three.js)
- Symptom: A three.js renderer built on a context created elsewhere can
  render differently from one that created its own.
- Cause: Given `context`, `WebGLRenderer` reads `alpha` from that context and
  uses it as is; on its own it always requests `alpha: true`, `depth: true`,
  `stencil: false` and premultiplied alpha, plus the caller's antialias and
  `preserveDrawingBuffer`.
- Fix: The render-loop helper creates the context with exactly those
  attributes for each three.js item (Holo Sticker: antialias and a preserved
  buffer; Holo Foil: no antialias, high-performance), then hands it over.
- Prevention: When an item moves to `useRenderLoop`, copy the upstream
  `WebGLRenderer` options into `contextAttributes` and diff it against
  upstream again.
- Links: `examples/render-loop/render-loop.ts`, `docs/decisions/0021-webgl-render-loop.md`

### P-060

- Date: 2026-10-12
- Area: Fidelity harness (animation)
- Symptom: Tilted Holo Sticker frames differed by 1 to 3% from upstream, and
  upstream differed from itself by up to 0.4%.
- Cause: The tilt eases toward the pointer by 9% per frame. Software GL draws
  only a few frames a second, so after a fixed 3 s wait neither page had
  converged, and each had drawn a different number of frames.
- Fix: Read the canvas every 250 ms and take the frame once three reads in a
  row are identical.
- Prevention: Never wait a fixed time for an eased value; wait for a stable
  frame, or fix the value (`tilt`, `time`) on the port and drive upstream to
  the same state.
- Links: `docs/evidence/ports/holo-sticker/fidelity.md`

### P-061

- Date: 2026-10-12
- Area: Site (gallery tiles and previews)
- Symptom: The gallery tile and the `/preview/<item>` still of a WebGL effect
  showed its static fallback, never the rendered effect.
- Cause: Tiles and the preview route render demos on the server without
  hydration; a canvas is only drawn by client JavaScript.
- Fix: The fallback is designed as the tile picture (decision 0021), and the
  beta previews were captured from the hydrated demo on the component page.
- Prevention: For a canvas effect, review the tile with JavaScript off, and
  take its preview from the component page (see also P-037).
- Links: `docs/decisions/0021-webgl-render-loop.md`

### P-062

- Date: 2026-10-12
- Area: Licenses (third-party assets)
- Symptom: Upstream demos shipped photographs, a poster and a scratch texture
  with no stated license of their own, and one shipped a vendor's video
  excerpt explicitly excluded from its MIT license.
- Cause: A repository license covers its code; assets of unknown origin are
  not shown to be redistributable.
- Fix: No upstream asset is shipped. Demos use original inline SVG art, the
  foil uses a procedural scratch map, and fidelity runs feed the same
  original inputs to upstream and port.
- Prevention: Check every image, video and font in an upstream before a port;
  ship only assets with a redistribution license, credited.
- Links: `docs/evidence/ports/lenticular/fidelity.md`, `docs/evidence/ports/holo-foil/fidelity.md`

### P-063

- Date: 2026-10-12
- Area: Components (hydration, reduced motion)
- Symptom: Under reduced motion the Holo Foil page froze for seconds on load
  in software GL, although the component only shows its fallback.
- Cause: `useReducedMotion` (useSyncExternalStore) returns the server value,
  false, during hydration, so the render-loop effect ran once with motion
  allowed: it created the WebGL scene (shader compiles, a PMREM environment)
  and disposed it a frame later.
- Fix: The helper also reads `matchMedia("(prefers-reduced-motion: reduce)")`
  inside its effect before any setup.
- Prevention: Gate expensive effects on the live media query, not only on a
  hydration-safe hook value.
- Links: `examples/render-loop/render-loop.ts`

### P-064

- Date: 2026-10-12
- Area: Tests (axe)
- Symptom: `axe: /ui/holo-foil` timed out at 30 s; the color-contrast rule
  took 1.3 s, the region rule 37 s.
- Cause: The component page shows every source file, highlighted token by
  token; the foil's captured pose was one array literal of 4,851 numbers,
  each a token for the region rule to walk.
- Fix: The pose data is one string literal (the same numbers, checked equal
  as Float32 values), and the axe tests of these pages allow 90 s.
- Prevention: Keep large data in string literals or separate assets, and
  watch axe time when an item adds big files.
- Links: `e2e/webgl.spec.ts`, `content/components/dmitrykurash-holocloth/holo-foil`

### P-065

- Date: 2026-10-13
- Area: Components (TypeScript, bundling)
- Symptom: The Glass demo threw "does not provide an export named
  'GlassLensDescriptor'" in the browser once its sources lived in this
  repository, while the same files worked in a scratch harness.
- Cause: Upstream imports some types in value imports (`import { Renderer,
  GlassLensDescriptor }`). This repository's tsconfig extends Astro's strict
  config, which sets `verbatimModuleSyntax`, so Vite's esbuild keeps every
  import name and the browser asks the module for an export that does not
  exist. Without that option esbuild drops the unused name.
- Fix: The port marks those names `type` (an import-only deviation, listed in
  the Glass fidelity notes).
- Prevention: Typecheck port sources under the site's tsconfig before
  exporting them, and keep the `hydrates without page errors` checks in
  `e2e/webgl.spec.ts`.
- Links: `ports/samasante-liquid-glass/glass`, `e2e/webgl.spec.ts`

### P-066

- Date: 2026-10-12
- Area: Components (React Aria collections)
- Symptom: The React Aria Morphing Tabs rendered an empty tablist.
- Cause: A TabList builds its collection from Tab elements only; a Tab
  wrapped in another element (the spring's `motion.div`) is dropped
  (S-241).
- Fix: Each Tab is the moving element: the spring lives in a component
  inside the Tab and writes the Tab's transform.
- Prevention: Keep React Aria collection items as direct children; put
  per-item logic inside the item.
- Links: `content/components/beui/morphing-tabs`, decision 0022

### P-067

- Date: 2026-10-12
- Area: Components (Radix Tooltip)
- Symptom: The Radix Fluid Tooltip sat 8px further from its trigger than
  the Base UI original.
- Cause: Radix adds the measured arrow height to `sideOffset`; the upstream
  arrow overlaps the gap instead.
- Fix: Pass `sideOffset - 8` when the arrow shows.
- Prevention: Diff a Radix port's open state against its source.
- Links: `content/components/sona-ui/fluid-tooltip`

### P-068

- Date: 2026-10-12
- Area: Components (Radix and Base UI tabs)
- Symptom: Starting to drag an inactive Morphing Tab selected it.
- Cause: Radix tabs select on mousedown, and Base UI tabs with
  `activateOnFocus` select when the mousedown focuses them.
- Fix: `preventDefault()` on mousedown (Radix also skips its own handler),
  select on click unless the press became a drag, then
  `focus({ focusVisible: false })` so focus lands without a ring, as a native
  click would.
- Prevention: The drag states in the Morphing Tabs fidelity run.
- Links: `content/components/beui/morphing-tabs`

### P-069

- Date: 2026-10-12
- Area: Components (Radix Tabs)
- Symptom: Morphing Tabs stayed left to right inside a right-to-left frame.
- Cause: `Tabs.Root` writes `dir="ltr"` unless told otherwise, so reading the
  direction from the root reads its own attribute; and the component page's
  direction toggle changes `dir` without a resize.
- Fix: Read the direction from the root's parent and also re-read it when
  any `dir` attribute in the document changes.
- Prevention: Check right to left by toggling the direction after mount, not
  only by loading the page that way.
- Links: `content/components/beui/morphing-tabs`

### P-070

- Date: 2026-10-12
- Area: Fidelity harness (Vite)
- Symptom: `Cannot read properties of null (reading 'useMemo')` and an
  "execution context was destroyed" error, the first time a page imported
  the Base UI variant.
- Cause: Vite found a new dependency mid-run, re-optimized and reloaded; the
  page briefly had two copies of React.
- Fix: List every dependency in `optimizeDeps.include`.
- Prevention: Pre-bundle the whole dependency set before screenshots.
- Links: none (harness outside the repository)

### P-071

- Date: 2026-10-12
- Area: Registry (validator)
- Symptom: "the lucide and phosphor items differ beyond their icon imports"
  for two files that differed only in the icon.
- Cause: The check replaces the imported icon names everywhere, comments
  included; a shared comment naming one icon component changed in one file
  only.
- Fix: Describe the icons in words in shared comments.
- Prevention: Do not write imported icon identifiers in comments.
- Links: `content/components/interior/show-more`

### P-072

- Date: 2026-10-12
- Area: Tests (axe)
- Symptom: axe reported color-contrast on the active Morphing Tab's label on
  the bare `/preview` page.
- Cause: The white surface under the label is an SVG with
  `pointer-events: none`, which axe's background lookup does not see, so it
  measured the dark label against the dark root (the real contrast is about
  17:1). The component page (`/ui/morphing-tabs`) reports no violation.
- Fix: None in the component; recorded in its fidelity notes.
- Prevention: Check contrast by hand where text sits on an SVG or canvas
  surface.
- Links: `docs/evidence/ports/morphing-tabs/fidelity.md`

### P-073

- Date: 2026-10-12
- Area: Registry (shadcn CLI install)
- Symptom: Radix items installed into a project made with
  `shadcn init --defaults` failed to typecheck (`render` is not a prop of
  `Tabs.Trigger`), and `asChild={asChild}` disappeared, nesting a button in a
  button.
- Cause: The default style is now `base-nova`; for base styles the CLI
  rewrites every JSX `asChild` attribute into Base UI's `render` prop, and
  drops one it cannot convert. Radix code needs `asChild`.
- Fix: Radix items avoid the attribute: render the primitive's own element
  where it already is the right one (`Tabs.Trigger` is a button), and pass
  a computed value as a spread (`{...{ asChild }}`), which the CLI leaves
  alone.
- Prevention: Install a new Radix item into a `--defaults` project and
  typecheck it before publishing.
- Links: `content/components/beui/morphing-tabs`, `content/components/sona-ui/fluid-tooltip`

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

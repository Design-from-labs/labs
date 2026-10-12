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

# CI/CD

Branches: feature branches open pull requests into `staging`; `staging` is
promoted to `main` (production) only with the owner's approval. All jobs run
on GitHub-hosted runners (decision 0006).

| Workflow | Jobs | When |
| --- | --- | --- |
| `guards.yml` | `guards` (external references with the secret patterns, citations, guard tests), `secret-scan` (gitleaks 8.30.0, checksum-pinned), `links` (credits link check) | every pull request and push to `staging`/`main` |
| `pr-text.yml` | `pr-text` (title and body against the patterns; the `## Sources` section) | pull request opened or edited |
| `ci.yml` | `verify` (examples export, content contract and shadcn schema, licenses, lint, typecheck, unit tests, build, committed library exports, npm pack dry runs), `e2e` (Playwright smoke, keyboard, RTL, axe in light and dark, 320 and 375 px, stages per device, and the gallery view transitions and specimen-wall loops in their own project), `registry-install` (real `shadcn add` by namespace and URL, and `shadcn init` from the base item, into fresh Next.js apps that must build) | every pull request and push |
| `scanner.yml` | third-party scan; export pull request checks | every 6 hours, by hand, `repository_dispatch: component-export` |
| `publish.yml` | npm publish with provenance | by hand from `main`, npm trusted publishing (OIDC), no token ([publishing.md](publishing.md)) |

Repository secrets: `EXTERNAL_REF_PATTERNS` (set) and `LABS_SCANNER_TOKEN`
(optional, owner-provided). npm publishing uses trusted publishing, so there is
no npm token.

## Deployments

Vercel project `design-from-labs` on the `andrew-243s-projects` team builds
`pnpm build:site` (static `dist/`, `vercel.json`). Production follows `main`
once the GitHub repository is connected (Vercel's GitHub app must be
installed on the `Design-from-labs` organization); until then, deployments
are made with `vercel deploy --target preview`. The custom domain
`labs.designfrom.com` is attached and waits for its DNS record.

## Run everything locally

```bash
pnpm verify
LABS_SITE_URL=http://localhost:4321 pnpm build:site && pnpm preview &
scripts/registry-install-test.sh http://localhost:4321 "$(mktemp -d)"
```

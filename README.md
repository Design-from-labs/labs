# Design From Labs

**Design From Labs: experiments and production-ready components.**

This repository holds the Labs hub and the public component registry served at
[labs.designfrom.com](https://labs.designfrom.com): React components on Radix,
Base UI or React Aria, with Lucide or Phosphor icons, installable with the
shadcn CLI, the `designfrom` CLI or the `@designfrom/react` npm library.

| Page | What |
| --- | --- |
| `/` | The Labs hub: products, active and past experiments (`content/projects/*.yaml`) |
| `/ui` | The gallery: server-rendered demos of every published component |
| `/ui/<component>` | Live demo, switcher (primitive, icon set, style, direction), install tabs, source with copy, props, dependencies, accessibility, credits, license |
| `/r/<item>.json`, `/r/registry.json` | The shadcn registry |
| `/llms.txt`, `/llms-full.txt` | The index and full source for coding assistants |
| `/credits` | Every resource used, with author, link and license |

## Install a component

```bash
npx shadcn@latest add https://labs.designfrom.com/r/button-radix-lucide.json
npx shadcn@latest add @designfrom/button-radix-lucide      # with the namespace in components.json
npx designfrom add button --primitive aria --icons phosphor
npm i @designfrom/react                                     # import { Button } from "@designfrom/react/radix/button"
```

See [docs/registry.md](docs/registry.md) for the namespace, the base item and
the shadcn MCP server setup for Claude Code.

## How it works

Everything published is generated from canonical content: one shadcn
`registry-item.json` per variant plus a `meta.json` sidecar per component,
under `content/components/<source-id>/<component>/`. The format is the
[export contract](docs/contract.md) (JSON Schemas in [`schemas/`](schemas/)).
Only variants marked `ready` publish.

```text
content/components/<source>/<component>/   canonical items + meta.json + demo + preview
examples/                                  authoring sources of the Labs examples
scripts/prepare-content.mjs                validates, then generates the site data,
                                           /r/*.json and the npm library sources
src/                                       the Astro site (static; React islands for demos)
packages/react/                            @designfrom/react (built, packed, not yet published)
packages/cli/                              designfrom CLI (built, packed, not yet published)
sources.yaml                               approved component sources (first-party and OSS)
docs/sources/registry.yaml                 every cited resource
docs/decisions/                            decision records
```

## Develop

Requires Node 24 and pnpm 12.

```bash
pnpm install
pnpm dev                  # validate content, generate, run the site
pnpm examples             # re-export the Labs examples after editing examples/
pnpm previews             # regenerate gallery stills (needs pnpm preview running)
pnpm verify               # everything CI runs, in order
```

The checks: `examples:check`, `validate:content` (contract and shadcn's own
schema), `check:licenses`, `check:sources`, `check:links`, `lint` (Biome),
`typecheck` (astro check and tsc), `test` (scripts and CLI), `build`,
`pack:dry`, and `e2e` (Playwright smoke, keyboard, RTL and axe). CI also
installs items into fresh Next.js apps with the real shadcn CLI
(`scripts/registry-install-test.sh`). Guards: gitleaks (pinned), an
external-reference check, citations and a credits link check.

Work happens on `staging` through pull requests; `main` is production and is
merged only with the owner's approval.

## License

The repository's own code is released under the [MIT License](LICENSE).
Third-party components and resources keep their own licenses; each one is
credited with its author, link and license on the site's `/credits` page and in
[`docs/sources/registry.yaml`](docs/sources/registry.yaml).

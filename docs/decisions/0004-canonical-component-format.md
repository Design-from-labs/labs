# 0004: shadcn registry items plus a meta.json sidecar are the canonical component format

- Status: Accepted
- Date: 2026-10-12
- Deciders: Owner (brief), Pod LAB
- Sources: S-001, S-004, S-005, S-006

## Context

Components arrive from several sources (the private Design From app through
export pull requests, third-party repositories through the scanner, and the
Labs examples in this repository) and must publish to four outputs: the site,
the shadcn registry, the `designfrom` CLI and the `@designfrom/react` library.

## Decision

The contract in `docs/contract.md`: one shadcn `registry-item.json` per
component per variant (`<component>-<iconset>`, `<component>-<style>-<iconset>`)
with file contents inline, plus a `meta.json` sidecar validated by
`schemas/meta.schema.json`, under `content/components/<source-id>/<component>/`.
Every output is generated from those files. Items are validated against
shadcn's own zod schema (`shadcn/schema`) and the stricter overlay
`schemas/labs-registry-item.schema.json`.

## Alternatives

| Option | Why not |
| --- | --- |
| TSX sources with a custom manifest | Every source would need our build to produce a registry; shadcn's format is already what users install. |
| One item per component with an icon-set option | shadcn has no install-time options; separate items keep `npx shadcn add` a single URL. |

## Evidence

`pnpm validate:content` and the CI job that installs a built item into a
fresh Next.js app with `npx shadcn add`.

## Consequences

Icon-set pairs duplicate source; the validator checks that a pair differs
only in its icon imports. Exporters must inline file content.

## Re-test when

shadcn gains install-time variants, or more than two icon sets are required.

# 0008: Publish the library as @designfrom/react and the registry CLI as designfrom

- Status: Accepted
- Date: 2026-10-12
- Deciders: Owner, Pod LAB
- Sources: S-030, S-031

## Context

The first brief named the library `@designfrom-labs/ui`. The owner then
approved names that follow Vercel's convention (S-030): platform SDKs under
the brand scope (`@vercel/*`), framework bindings under a product scope
(`@ai-sdk/react`), small tools and libraries unscoped (`ai`, `flags`,
`streamdown`), a registry wrapper CLI unscoped (`ai-elements`), and Labs
projects published unscoped (`agent-browser`, `skills`). There is no
`@vercel-labs` npm scope: "labs" is a GitHub organization and a site section,
not an npm scope.

## Decision

- The component library is **`@designfrom/react`** in the `packages/react`
  workspace, with per-component, per-icon-set subpath exports
  (`@designfrom/react/button/lucide`, `@designfrom/react/button/phosphor`,
  `@designfrom/react/button` for the default variant, and
  `@designfrom/react/styles.css`).
- The registry CLI is **`designfrom`** in `packages/cli`:
  `npx designfrom add <component> [--style <style>] [--icons lucide|phosphor]`
  (default `lucide`) resolves the item name, checks it against
  `https://labs.designfrom.com/r/registry.json`, and runs
  `shadcn add https://labs.designfrom.com/r/<item>.json`;
  `npx designfrom list` prints the ready components and their variants.
- Both are built and packed in CI; nothing is published until the owner
  creates the `designfrom` npm organization and sets `NPM_TOKEN`.

## Alternatives

| Option | Why not |
| --- | --- |
| `@designfrom-labs/ui` | Treats "labs" as a package namespace, which the convention reserves for the organization and site. |
| `@designfrom/ui` | `react` states the binding, like `@ai-sdk/react`, and leaves room for other bindings. |
| A scoped CLI (`@designfrom/cli`) | Longer to type with `npx`; registry CLIs in the convention are unscoped. |

## Evidence

Both names were reported available on npm by the coordinator on 2026-10-12;
`npm pack --dry-run` of both packages runs in CI.

## Consequences

The owner must create the `designfrom` npm organization (for the scope) and
publish the unscoped `designfrom` package from an account in it.

## Re-test when

Either name is taken before the first publish, or a second framework binding
is planned.

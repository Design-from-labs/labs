# Publishing to npm

Two packages are built and packed in CI but **not published**:

| Package | Directory | What |
| --- | --- | --- |
| `@designfrom/react` | `packages/react` | the component library (decision [0008](decisions/0008-npm-names.md), subpaths in [0009](decisions/0009-primitive-variants.md)) |
| `designfrom` | `packages/cli` | the registry CLI (`npx designfrom add`, `npx designfrom list`) |

## What the owner does to enable publishing

1. Create the npm organization **`designfrom`** (for the `@designfrom` scope),
   with two-factor authentication required.
2. Create a granular access token with **Read and write** on the
   `@designfrom/react` and `designfrom` packages (the unscoped `designfrom`
   package is created on first publish by an account in the organization).
3. Add it to this repository as the Actions secret **`NPM_TOKEN`**:
   `gh secret set NPM_TOKEN -R Design-from-labs/labs` (paste when prompted).
4. Enable the **Publish to npm** workflow in the Actions tab (it is disabled).
5. Run it from `main` with `dry-run` checked first, then unchecked.

The workflow publishes with npm provenance (`id-token: write`), only from
`main`, only by hand, and packs without publishing while `NPM_TOKEN` is
absent.

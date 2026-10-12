# Publishing to npm

Two packages are built and packed in CI but **not published**:

| Package | Directory | What |
| --- | --- | --- |
| `@designfrom/react` | `packages/react` | the component library (decision [0008](decisions/0008-npm-names.md), subpaths in [0009](decisions/0009-primitive-variants.md)) |
| `designfrom` | `packages/cli` | the registry CLI (`npx designfrom add`, `npx designfrom list`) |

Both are published on npm (0.1.0 was published by hand on 2026-10-12, without
provenance). Later versions are published only by the **Publish to npm**
workflow, through **npm trusted publishing (OIDC)**: there is no npm token
anywhere in this repository.

## How it is set up

- On npmjs.com, each package has a GitHub Actions trusted publisher:
  organization `Design-from-labs`, repository `labs`, workflow `publish.yml`,
  no environment, with `npm publish` allowed.
- Each package's publishing access is "Require two-factor authentication and
  disallow bypass 2fa tokens", so only this workflow (or the owner with 2FA)
  can publish.
- `designfrom` is unscoped, so it belongs to the owner's npm account rather
  than the `designfrom` organization; its trusted publisher is configured on
  the package page.

## Releasing a version

1. Bump the version in `packages/react/package.json` and/or
   `packages/cli/package.json` through a normal PR (staging, then main).
2. Run **Publish to npm** from `main`, with `dry-run` checked first, then
   unchecked. It installs npm 11 (trusted publishing needs npm 11.5 or later),
   packs each package and publishes with provenance.

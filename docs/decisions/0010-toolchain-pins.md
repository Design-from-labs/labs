# 0010: Pin the toolchain and prefer aged dependency releases

- Status: Accepted
- Date: 2026-10-12
- Deciders: Pod LAB
- Sources: S-002, S-011, S-013, S-017, S-032

## Context

`@astrojs/check@0.9.10` declares `typescript: ^5 || ^6` as a peer, while the
latest TypeScript is 7. pnpm 12's supply-chain policy refuses packages
published too recently unless excluded; `radix-ui@1.8.0` was eleven hours old
when this repository was created (npm publish time 2026-10-12T00:48Z).

## Decision

- TypeScript is pinned to `6.0.3` everywhere (site, library, CLI), the newest
  version `astro check` supports.
- Direct dependencies are pinned to exact versions in the workspace root and
  to caret ranges in the published packages' peer dependencies.
- When the newest release is younger than the package manager's release-age
  policy, use the newest aged release instead of excluding it from the
  policy: `radix-ui` is `1.6.7` (published 2026-07-24); the library's peer
  range `^1.6.7` still accepts newer releases in users' projects.
- `pnpm-workspace.yaml` allows no dependency build scripts;
  `@parcel/watcher` (prebuilt binaries) is explicitly refused.

## Alternatives

| Option | Why not |
| --- | --- |
| TypeScript 7 with `astro check` forced | Unsupported peer; type errors in `.astro` files could go unreported. |
| `minimumReleaseAgeExclude` for new releases | Turns a supply-chain safeguard off for the packages most likely to be compromised in their first hours. |

## Evidence

`pnpm install` reports "Lockfile passes supply-chain policies"; `pnpm
typecheck` runs `astro check` and `tsc` for both packages.

## Consequences

Upgrades are deliberate pull requests. The registry items themselves name
caret ranges (`radix-ui@^1`), so users get current releases.

## Re-test when

`@astrojs/check` accepts TypeScript 7, or a pinned version has a security
advisory.

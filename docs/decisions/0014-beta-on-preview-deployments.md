# 0014: Show beta components on preview deployments, labeled, never in production

- Status: Accepted, amended by [0031](0031-vite-install-check-on-beta-items.md) (CI's local registry-install build includes beta items)
- Date: 2026-10-12
- Deciders: Port pod B (css-keyframes), under the owner's port brief
- Sources: S-157, S-001, S-009

## Context

Ports land as `beta`, and the owner promotes them to `ready` after
reviewing them on the preview (S-157). Decision 0005 excludes `beta` from
every output, so a pull request's Vercel preview (S-009) showed none of
the components it added: there was nothing to review.

## Decision

- `includeBeta()` (`scripts/lib/content.mjs`) is true only when
  `VERCEL_ENV=preview` (Vercel preview deployments) or
  `LABS_INCLUDE_BETA=1` (local review). Then `beta` entries with `beta` or
  `ready` variants are added to the site data: gallery tiles, component
  pages, `/r` items and `llms.txt` of that preview.
- They are labeled: "Beta" on the tile, "Beta preview" on the page.
- The npm library never takes them (`prepare-content.mjs` builds it from
  ready variants only), and production builds set neither variable, so
  decision 0005 holds for everything users install from
  `labs.designfrom.com` and npm. CI sets `LABS_INCLUDE_BETA=1` only for the
  throwaway local registry the `registry-install` job serves to itself
  (decision 0031).

## Alternatives

| Option | Why not |
| --- | --- |
| Review beta only from screenshots in the pull request | No hydration, interaction, dark mode or responsive check on the real site. |
| Promote to ready in the pull request, then revert if rejected | Would publish to production on merge. |
| A separate staging site | Another deployment to maintain for what a preview already is. |

## Evidence

`scripts/publish-visibility.test.mjs`: `includeBeta` truth table, `isShown`
(ready always, beta only when asked, never draft) and `siteData` with and
without beta. A local `LABS_INCLUDE_BETA=1 pnpm build:site` renders the
eight yui540 ports labeled, while `pnpm build` leaves
`packages/react/package.json` unchanged.

## Consequences

A preview's `/r` URLs can install beta code; previews are not linked from
production. Amends decision 0005 for preview deployments only.

## Re-test when

The owner wants a public beta channel, or Vercel stops exposing
`VERCEL_ENV` at build time (then the preview would show ready items only).

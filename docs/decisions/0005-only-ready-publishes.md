# 0005: Only ready components publish

- Status: Accepted
- Date: 2026-10-12
- Deciders: Owner (brief), Pod LAB
- Sources: S-001

## Context

Statuses are draft, beta, ready and deprecated; the owner asked that only
`ready` publishes.

## Decision

`ready` components appear on the site (gallery and page), in `/r/*.json` and
`/r/registry.json`, in the CLI's list, in the npm library and in `llms.txt`.
`draft`, `beta` and `deprecated` components are validated by CI (so they can
be reviewed) but are excluded from every output. Deprecating a component
removes its registry URL; the next npm release drops its entry point.

## Alternatives

| Option | Why not |
| --- | --- |
| Show beta on the site with a badge | Contradicts the owner's rule; beta code would be installable from the page. |
| Keep deprecated registry URLs live | Keeps installing code the owner withdrew. |

## Evidence

`scripts/lib/content.test.mjs` asserts that non-ready components produce no
outputs.

## Consequences

A deprecated item's install URL returns 404. Owners announce deprecations in
the pull request that changes the status.

## Re-test when

Users report broken installs from deprecated URLs, or the owner wants a
public beta channel.

# 0018: Allow item files to read `process.env.NODE_ENV`, and nothing else from the environment

- Status: Accepted
- Date: 2026-10-12
- Deciders: Owner (via the port coordinator), Port pod C (data-display)
- Sources: S-175, S-184

## Context

The contract forbids environment access in item files, so an installed item
never depends on an app's configuration. GuideFrame (S-175) is a development
overlay: upstream shows it in development and hides it in production unless
`forceVisibleInProduction` is set, by reading `process.env.NODE_ENV`. A port
without that read either shows a layout overlay to every production user who
forgets to wire a prop, or ships hidden and surprises developers. The owner
judged showing it in production by default unsafe.

## Decision

- Item files may read exactly `process.env.NODE_ENV`. Next.js, Vite and
  webpack inline it at build time, so it is a build constant rather than
  runtime configuration and needs no setup in the installing app.
- Every other environment read is refused by `pnpm validate:content`
  (`envProblems` in `scripts/lib/validate.mjs`): any other `process.env.*`,
  a bare or computed `process.env`, and `import.meta.env`.
- GuideframeGrid defaults to upstream's semantics (on in development, off in
  production) and keeps `enabled` as an explicit override.

## Alternatives

| Option | Why not |
| --- | --- |
| Default the overlay on everywhere, with an `enabled` prop | Ships a grid overlay to end users of anyone who does not wire the prop. |
| Default it off everywhere | Breaks upstream's zero-config development use; every user must wire a flag. |
| Allow any `process.env` read | Reintroduces app-specific configuration and secrets risk in shared code. |

## Evidence

`scripts/validate-env.test.mjs` covers the allowed read and the refused forms
(another variable, bare, computed, destructured, `import.meta.env`, and reads
inside comments ignored).

## Consequences

A bundler that does not define `process.env.NODE_ENV` in the browser (rare
today) would throw a ReferenceError; items reading it guard with
`typeof process !== "undefined"`.

## Re-test when

A supported framework stops inlining `process.env.NODE_ENV`, or a second
environment value is requested for items.

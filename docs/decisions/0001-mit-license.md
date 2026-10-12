# 0001: License the repository's own code under MIT

- Status: Accepted
- Date: 2026-10-12
- Deciders: Owner (brief), Pod LAB
- Sources: S-001, S-004, S-005, S-006

## Context

The repository is public and exists to be copied from: the shadcn registry
writes component source straight into other people's projects, and the npm
library ships it. The brief asked for MIT unless there is a reason otherwise.

## Decision

The repository's own code (site, scripts, packages, Labs example components)
is MIT (`LICENSE`, copyright Design From Labs). Third-party components keep
their own license, recorded per component in `meta.json` and enforced by
`scripts/check-licenses.mjs` (decision 0007).

## Alternatives

| Option | Why not |
| --- | --- |
| Apache-2.0 | Its NOTICE and change-statement duties travel poorly with copy-paste installs; MIT matches shadcn (MIT), Lucide (ISC) and Phosphor (MIT), the ecosystem users already accept. |
| MPL-2.0 or GPL | File-level or project-level copyleft conflicts with the registry's purpose of copying code into closed apps. |
| CC0 / Unlicense | Drops the attribution line that tells users where the code came from. |

## Evidence

The licenses of the ecosystem this repository builds on are recorded in
`docs/sources/registry.yaml` (S-004 MIT, S-005 ISC, S-006 MIT).

## Consequences

Anyone may reuse the code with the copyright line. Every generated file header
(`@dfl-header`) names the license, so the notice travels with copied source.

## Re-test when

The owner wants to restrict commercial reuse, or a source the owner must
include requires a different license for the whole repository.

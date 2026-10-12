# 0007: Publish only components whose license allows redistribution with attribution

- Status: Accepted
- Date: 2026-10-12
- Deciders: Owner (brief), Pod LAB
- Sources: S-001, S-004

## Context

The registry redistributes source code into other people's projects. A
component whose license forbids that, or whose attribution is missing, must
never publish.

## Decision

`scripts/check-licenses.mjs` allows only `MIT`, `ISC`, `Apache-2.0`,
`BSD-2-Clause`, `BSD-3-Clause`, `0BSD`, `Unlicense` and `CC0-1.0` (SPDX
expressions joined by `OR` pass when one side is allowed; `AND` needs both).
It refuses a third-party component without an author, an attribution notice,
or a credit whose source has a URL, and any credit id missing from
`docs/sources/registry.yaml`. The generated file header repeats the license
and attribution in every published file.

## Alternatives

| Option | Why not |
| --- | --- |
| Allow MPL-2.0 / LGPL | File-level or library copyleft obligations do not survive a copy-paste install without user action. |
| Allow GPL / AGPL | Would impose copyleft on every app that installs the item. |
| Allow CC-BY-NC | Forbids commercial use; users cannot rely on it. |

## Evidence

`scripts/check-licenses.test.mjs` covers allowed, refused and
missing-attribution cases.

## Consequences

Some good third-party components cannot be listed. Copyleft exceptions need a
new decision record.

## Re-test when

The owner wants a copyleft component, or SPDX adds a license variant that
users request.

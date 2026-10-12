# 0011: The scanner opens pull requests only with a dedicated token

- Status: Accepted
- Date: 2026-10-12
- Deciders: Pod LAB
- Sources: S-001, S-029

## Context

The scanner must open or update a pull request for new or changed
third-party components. Enabling "Allow GitHub Actions to create and approve
pull requests" on this repository returned HTTP 409: the organization does
not allow it (checked 2026-10-12). Changing an organization security setting
is the owner's call, not the build's.

## Decision

The scanner pushes the `scanner/oss` branch with `GITHUB_TOKEN`
(`contents: write`). If the optional `LABS_SCANNER_TOKEN` secret exists (a
fine-grained token for this repository only, with Contents and Pull requests
write), it opens or updates the pull request; otherwise it writes a compare
link into the run summary. Export checks for private sources only comment on
an existing pull request, which `GITHUB_TOKEN` may do.

## Alternatives

| Option | Why not |
| --- | --- |
| Enable the organization setting | An organization-wide security change; it also lets every workflow in the organization approve pull requests. Left to the owner. |
| A third-party "create pull request" action | Needs the same permission; adds a dependency. |

## Evidence

The 409 response from `PUT /repos/Design-from-labs/labs/actions/permissions/workflow`.

## Consequences

Without the token, a person clicks the compare link to open the pull request.

## Re-test when

The organization setting changes, or the owner adds `LABS_SCANNER_TOKEN`.

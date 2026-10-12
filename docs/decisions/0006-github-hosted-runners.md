# 0006: Run this repository's CI on GitHub-hosted runners

- Status: Accepted
- Date: 2026-10-12
- Deciders: Owner (brief), Pod LAB
- Sources: S-001, S-029

## Context

The organization's self-hosted runner group refuses public repositories
(`allows_public_repositories: false`, read from the organization's runner
group settings on 2026-10-12), and Actions minutes are free for public
repositories.

## Decision

Every workflow runs on `ubuntu-latest`. Third-party actions are pinned by
commit SHA, workflow permissions default to read, and jobs that need a
secret do not run for pull requests from forks.

## Alternatives

| Option | Why not |
| --- | --- |
| Self-hosted runners | Refused by the runner group for public repositories, and unsafe for untrusted fork code. |

## Evidence

The runner-group setting above; the CI runs on the scaffold pull requests.

## Consequences

No local cache between runs beyond `actions/cache`; jobs install from scratch.

## Re-test when

The repository becomes private, or hosted-runner time exceeds 15 minutes per
pull request.

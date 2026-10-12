# 0003: Guard against external references with secret patterns and a public allowlist

- Status: Accepted
- Date: 2026-10-12
- Deciders: Owner (brief), Pod LAB
- Sources: S-001, S-029

## Context

This repository is public. It must never name the owner's other products or
private repositories, but it must name Design From, Design From Labs, its
domain `labs.designfrom.com`, its npm names (the `@designfrom` scope and the
`designfrom` CLI) and the approved export source `design-from-app`. The
studio's shared pattern set bans some of those phrases because it was written
for repositories where they are private.

## Decision

- The banned patterns live only in the `EXTERNAL_REF_PATTERNS` repository
  secret (created from the owner's local pattern file with `gh secret set`,
  never printed) and in that local file for the git hooks.
- `scripts/check-external-refs.mjs` scans tracked files, paths, commit
  messages and (in `pr-text.yml`) pull request titles and bodies. It fails
  closed without the secret and prints only `file:line` and a pattern index.
- `config/external-ref-allow.txt` lists the literal phrases this repository
  may use. Each is neutralized case-insensitively and word-bounded before the
  patterns run, so `designfrom` never covers a longer word or a
  `designfrom.<tld>` domain.

## Alternatives

| Option | Why not |
| --- | --- |
| A separate, edited pattern secret for this repository | Drifts from the shared set; a new banned name added later would be missed. |
| Spelling the banned names in the repository | Publishes the very names it is meant to hide. |

## Evidence

`scripts/check-external-refs*.test.mjs` (the shared tests) plus the
allowlist tests in `scripts/check-external-refs-allow.test.mjs`.

## Consequences

Adding an allowed phrase is a reviewed change to a public file. A phrase that
would hide another name must not be added.

## Re-test when

The shared pattern set changes its format, or a false positive appears that
the allowlist cannot express without widening it.

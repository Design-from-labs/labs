# Sources

We cite everything we use as a resource. Libraries, fonts, icon sets, design
references, services, briefs and AI tools all get an entry in
[`registry.yaml`](registry.yaml); the work that uses them cites the entry by
its id (`S-001`). Components cite theirs in `meta.json` `credits`, and the
site lists every entry on [`/credits`](https://labs.designfrom.com/credits).

## Add a source

Append an entry with the next free id. One `key: value` per line; strings in
double quotes; lists inline (`[a, "b"]`):

```yaml
  - id: S-NNN
    title: "What it is"
    author: "Person or organization"
    kind: library          # doc | library | brief | transcript | design-reference | article | figma | model | ai-tool | dataset
    url: "https://..."     # or private-file: "where the owner keeps it"; exactly one
    license: "MIT"         # SPDX id, or a short statement such as "All rights reserved (owner)"
    accessed: 2026-10-12
    visibility: public     # or private-cited-only
    used-in: [path/one, "#12"]
```

- `private-cited-only` is for owner material that must not be published: it is
  cited by id and title only.
- `note` explains anything unusual, such as a test-only dependency under a
  license that is not on the component allowlist.

## Enforcement

`scripts/check-sources.mjs` (CI `guards` job, and `pr-text` with `--pr-body`)
fails when the registry does not parse or an entry is incomplete, when a
decision record lacks a `- Sources:` line, when any tracked file cites an id
that is not in the registry, or when a pull request has no `## Sources`
section. `scripts/check-links.mjs` checks every public `url` and every
component credit link.

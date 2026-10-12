## What and why

<!-- The outcome in one or two sentences. Describe behaviour; name no repository or product other than Design From and Design From Labs. -->

## Sources

<!-- Required (scripts/check-sources.mjs): the registry ids this change uses or credits (docs/sources/registry.yaml), e.g. "S-004, S-005", or "none: <reason>". For a component export, list the component's credits and its source id from sources.yaml. -->

## Components

<!-- For content changes: each component, its status (draft | beta | ready | deprecated), its license and its source (sources.yaml id). Write "none" otherwise. -->

## Evidence

<!-- Checks run, preview URL, screenshots of the affected page. -->

## Decisions

<!-- New or changed records in docs/decisions/, or "none". -->

## Rollback

<!-- How to undo this: revert the squash commit, or the forward fix. -->

## Checklist

- [ ] `pnpm verify` passes locally (or the skipped checks are listed above)
- [ ] Only `ready` components are expected to publish
- [ ] Every third-party component carries author, link, license and attribution
- [ ] No env values, secrets, licensed fonts or icons added
- [ ] Added any new pitfall to docs/pitfalls.md

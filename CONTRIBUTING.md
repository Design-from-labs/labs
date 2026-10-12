# Contributing

Thank you for helping. The short version:

1. Branch from `staging` and open the pull request into `staging`. `main` is
   production and changes only through a release pull request the owner
   approves ([docs/CICD.md](docs/CICD.md)).
2. Fill in the pull request template as it is, including the `## Sources`
   section followed by another heading
   ([docs/sources/README.md](docs/sources/README.md)).
3. Run `pnpm verify` before asking for review.
4. Record a consequential choice in [docs/decisions/](docs/decisions/README.md)
   when you make it.
5. Components arrive through the export contract
   ([docs/contract.md](docs/contract.md)), not by hand.

## Pitfalls

When something costs you time because of how this repository, its tools or
its services behave (a setting, a CLI quirk, a flaky check), add it to
[docs/pitfalls.md](docs/pitfalls.md) in the same pull request: the next
`P-NNN` id, the date, the area, the symptom, the cause, the fix, how to
prevent it, and links. Read that file before you touch publishing,
deployments, branch settings or the e2e setup. The pull request template has a
checkbox for it.

Describe behaviour, not people, and name no product or repository other than
Design From and Design From Labs; the external-reference guard fails the
pull request otherwise.

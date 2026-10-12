# The scanner

`.github/workflows/scanner.yml` runs every 6 hours, on demand
(`workflow_dispatch`), and on a `component-export` `repository_dispatch`.
It reads [`sources.yaml`](../sources.yaml).

| Source | What happens |
| --- | --- |
| Third-party (`oss`, `fetch: pinned-git`, `status: active`) | Each listed registry item is fetched from `raw.githubusercontent.com` at the pinned commit (`ref`, a full SHA; never a branch). New or changed files are validated (`validate:content`, `check:licenses`) and pushed to the `scanner/oss` branch; the pull request into `staging` is opened or updated. Components arrive as `beta` with a stub demo; a person reviews them, adds a demo and a preview, and marks them `ready`. |
| Private (`fetch: exports-only`) | Never fetched. The source repository opens an export pull request ([contract](contract.md), section 7) and sends `repository_dispatch` with `client_payload.source` and `client_payload.pr`. The scanner checks the source is approved and the pull request only touches `content/components/<source>/` and `docs/sources/registry.yaml`, then comments the result on the pull request. CI on the pull request validates the content itself. |
| In-repo (`labs-examples`) | Exported by `pnpm examples`; `pnpm examples:check` in CI. |

## Pull request creation

The organization does not allow `GITHUB_TOKEN` to create pull requests
(decision [0011](decisions/0011-scanner-pull-requests.md)). The scanner
therefore:

- with the optional `LABS_SCANNER_TOKEN` repository secret (a fine-grained
  token limited to this repository with Contents and Pull requests write),
  opens or updates the pull request itself;
- without it, pushes `scanner/oss` and writes a ready-made compare link in
  the run summary.

Pull requests opened with `GITHUB_TOKEN` would not trigger CI anyway; one
opened with `LABS_SCANNER_TOKEN` does.

## Runners

GitHub-hosted (`ubuntu-latest`): the repository is public, so minutes are
free, and the organization's self-hosted runner group refuses public
repositories (decision [0006](decisions/0006-github-hosted-runners.md)).

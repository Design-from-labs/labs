# 0030: Pin sources that have no git commit by the tree hash of a verbatim snapshot

- Status: Accepted
- Date: 2026-10-13
- Deciders: Port pod WEB-1, under the owner's WEB-1 brief
- Sources: S-450, S-451, S-157

## Context

The WEB-1 batch (S-450) ports components whose upstream is not a git
repository: public CodePen pens (classic pens and CodePen 2.0 projects) and
a 21st.dev community item. The contract requires `source.commit` to be a
40-character SHA (schemas/meta.schema.json) and every `oss` source in
`sources.yaml` to carry a pinned `ref`. A pen has no public revision id: its
owner can edit it at any time, the classic editor serves compiled panes from
a debug view, and CodePen 2.0 serves files only through its editor (its
anonymous preview returns 404 and Cloudflare refuses automated clients).
Public pens are MIT licensed by default and show their notice on the Details
view (S-451); each pen in this batch was checked there.

## Decision

- **Snapshot the upstream verbatim** under
  `ports/<source-id>/<component>/upstream/`, as captured on the access date:
  a classic pen's debug view (`https://cdpn.io/pen/debug/<id>`, the code that
  actually runs), a CodePen 2.0 project's files read from its editor, or a
  gallery item's published files. Nothing in `upstream/` is edited, exported
  or linted (Biome excludes `ports/*/*/upstream`).
- **`ref` is the git tree hash of that directory**
  (`git write-tree --prefix=ports/<source-id>/<component>/upstream/` after
  staging it). Anyone can verify the pin from any commit that contains it:
  `git rev-parse <commit>:ports/<source-id>/<component>/upstream` must equal
  `ref`. `repo` is the canonical public page (the pen or item URL).
- **An npm package whose repository lacks a LICENSE file or is gone** pins the
  published version: `ref` is the package's `gitHead` when present, the
  registry entry cites the tarball and the `license` field of its
  `package.json`, and the fidelity notes say which.
- The pen's MIT notice, with its own copyright line and URL, is the source's
  `LICENSE`; the exporter appends it to every file as for any port.
- Media and fonts a pen loads from elsewhere (photo services, uploaded
  images, web fonts) are not part of the pen's license: they are replaced by
  generated or repo-licensed stand-ins on both sides of the fidelity diff.

## Alternatives

| Option | Why not |
| --- | --- |
| Fork each pen into a GitHub repository and pin that commit | Creates and maintains repositories outside this one for every pen; the fork's commit proves nothing about what the pen served. |
| A SHA-1 of the page as fetched, without keeping the file | Unverifiable once the pen changes: nobody can reproduce the hash. |
| An archive.org capture as the pin | CodePen 2.0 files are not in the page HTML, so the archive has no code; the archive also cannot be required to be up. |
| Skip pens without a commit | Loses well-licensed, high-value items; the license is explicit on each pen. |

## Evidence

`docs/evidence/ports/<component>/fidelity.md` of every WEB-1 component names
the snapshot and its tree hash; `pnpm ports:check` and `pnpm validate:content`
accept the tree hash as the `commit` (it is a 40-character SHA-1).

## Consequences

- Snapshots add small verbatim files to `ports/`; they never ship.
- A later port update re-captures the snapshot and its tree hash changes, as a
  commit pin would.

## Re-test when

CodePen exposes public revision ids, or the contract adds a source kind
without a commit.

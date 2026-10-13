# Ported components (authoring sources)

Third-party components rewritten in this repository from a pinned upstream
commit (decision [0016](../docs/decisions/0016-ported-component-sources.md)).
Each source is an `in-repo` entry of the `oss` section of
[`sources.yaml`](../sources.yaml), which holds its repository, commit,
author, license, attribution and credit.

```text
ports/<source-id>/
  LICENSE                   the upstream license, verbatim
  <component>/
    component.json          sidecar fields, files and their registry types,
                            dependencies, docs, demo, optional stage
    <files>                 the port (Lucide icons where it renders icons)
    demo.tsx                the gallery demo
ports/icons.json            Lucide -> Phosphor names for the -phosphor items
```

`pnpm ports` exports them in the canonical format to
`content/components/<source-id>/<component>/` (items, `meta.json`, demo;
the preview is kept), appending the upstream attribution and license to every
file. `pnpm ports:check` (CI) fails when the export is stale. Everything
downstream reads only the exported files.

Merged upstream modules keep their lines; each starts with a
`// ---- upstream: <path> ----` marker, and every change from upstream is
listed under Deviations in `docs/evidence/ports/<component>/fidelity.md`.
Verbatim upstream files are excluded from Biome so they stay diffable.

| Source | Component | Upstream |
| --- | --- | --- |
| `torph` | `text-morph` | lochie/torph, `packages/torph/src` (core and React adapter) |
| `goey-toast` | `gooey-toast` | anl331/goey-toast, `src` |
| `tegaki` | `handwriting` | gkurt/tegaki, a wrapper over npm `tegaki` |
| `peckz-playground` | `dot-morph` | peckz/playground, `src/app/chrome-morph` (renamed, logo removed) |

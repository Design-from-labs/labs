# Labs examples (authoring sources)

The Labs example components (Button, Badge, Tooltip, Sidebar) are written
here as plain TSX, authored with Lucide icons. `pnpm examples` exports them in
the canonical format (docs/contract.md) to `content/components/labs-examples/`,
deriving each Phosphor variant with `icons.json`; `pnpm examples:check` (CI)
fails when the export is stale. Everything downstream (site, registry, CLI,
npm library) reads only the exported files, exactly as it reads exports from
other sources.

Each component directory holds `component.json` (sidecar fields and item
settings), its source files, and `demo.tsx`.

`component.json` may set `"status"` (`"beta"`, `"draft"`, `"deprecated"`) for
an example that is not ready yet; it defaults to `"ready"`. The variants carry
their own `status` as well.

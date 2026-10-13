# 0027: Install beta port items into a fresh Vite app in CI and run its own build

- Status: Accepted
- Date: 2026-10-13
- Deciders: Port pod C (data-display) CI worker, under the owner's port brief
- Sources: S-004, S-013, S-038, S-157, S-284

## Context

The data-table trio shipped as beta with eight value-style imports of types
in six shared files (`import { DatePreset } from "../types"`). In a project
made by `shadcn init -t vite`, whose `tsconfig.app.json` sets
`verbatimModuleSyntax: true`, Vite keeps those imports and every demo
crashed at runtime (`does not provide an export named 'DataTableFilterField'`).
The `registry-install` job did not see it: it builds the site without beta
items (decision 0014) and installs a fixed list of ready items into a
Next.js app, whose tsconfig does not set `verbatimModuleSyntax`.

## Decision

- `registry-install` keeps its Next.js scenario unchanged, then builds the
  site a second time with `LABS_INCLUDE_BETA=1` and
  `LABS_SITE_URL=http://localhost:4322`, serves it on port 4322, and runs
  `scripts/registry-install-vite-test.sh`.
- That script creates a Vite app with the repository's pinned shadcn CLI
  (decision 0010): `shadcn init -t vite -b radix -p nova`, Lucide. The
  template is read from the shadcn-ui/ui tag of the same CLI release
  (`SHADCN_TEMPLATE_DIR`), not from the default branch the CLI clones by
  default, so an upstream template change cannot move the check.
- It adds the `@designfrom` namespace and installs by namespace
  `data-table-radix-lucide`, `data-table-sheet-radix-lucide`,
  `data-table-filter-command-radix-lucide` (the last two pull the first
  through a cross-item dependency) and `liveline` (a nested, non-shadcn
  port), renders each component's own `demo.tsx`, and runs the app's
  `npm run build` (`tsc -b && vite build`).
- Every template compiler flag applies as shipped, `noUnusedLocals` and
  `noUnusedParameters` included: a user's fresh app must build. The ports
  therefore drop the eleven upstream symbols they never read (data-table and
  Liveline), each recorded as a pixel-neutral deviation in its fidelity.md.

## Alternatives

| Option | Why not |
| --- | --- |
| Build once with beta items for both scenarios | The Next.js scenario would no longer install from production-shaped output. |
| Add `verbatimModuleSyntax` to the repository's own `tsconfig` | Covers Labs sources, not what `shadcn add` writes into a user's project, its paths, or a real bundler. |
| A lint rule for type-only imports | Verbatim upstream files are excluded from Biome (decision 0016). |
| Install every beta item | Each extra multi-file item adds npm installs; four items cover the cross-item dependency, nested targets and both port kinds. |
| Turn the template's unused-symbol flags off in the test app | A real user's fresh Vite app would still fail `npm run build` on the eleven upstream unused symbols; the check must test what users get. |

## Evidence

Against `origin/staging` at `ba4b343` (old imports), the script fails in
`tsc -b` with ten TS1484 errors in the six files; with `tsc` skipped,
`vite build` fails too, with `MISSING_EXPORT` for `DataTableFilterField`,
`SheetField`, `Table` and `FilterFn`. With the eight imports changed to
`import type` and the items re-exported, the same script passes, and the
built app renders three tables (48 rows) and the Liveline canvas in
Chromium with no console errors. One run takes about 50 seconds locally
after the site build.

## Consequences

Beta multi-file ports are now installed and built the way a Vite user gets
them on every pull request. A type-only import written as a value import,
or any other strict-mode type error in these items, fails CI. The job builds
the site twice and makes one more shallow git clone and npm install.

## Re-test when

The shadcn CLI pin changes (the template tag follows it), a port adds an
item with a different shape (another primitive or a new nested target), or a
second framework template sets stricter compiler options than Vite.

# 0023: Render demos with vendored stock shadcn components for the names an item lists

- Status: Accepted
- Date: 2026-10-13
- Deciders: Port pod C (data-display) site worker, under the owner's port brief (vendored snapshot approved by the owner)
- Sources: S-004, S-032, S-033, S-034, S-172, S-176, S-215, S-216

## Context

The data-table ports (S-172) list stock shadcn components by bare name in
`registryDependencies` (`button`, `calendar`, `command`, `drawer`, ... 16
names), which the contract (section 2) defines as shadcn built-ins. A user who
runs `shadcn add` gets shadcn's own files for them (S-004). The site's
`labs-item-aliases` plugin resolved `@/components/ui/<name>` only to Labs
items, so on beta preview builds (decision 0014) most names did not resolve,
and `button` and `tooltip` resolved to Labs' own button and tooltip, whose
API differs (no `size="icon-xs"`, `md` instead of `default`): the build
failed, and would have rendered the wrong components had it built. The three
items also install into one `components/data-table/` root, so the sheet and
filter-command import data-table's files relatively (`../data-table-provider`),
while the site writes each item into its own `.generated/items/<item>/`.

## Decision

- `scripts/vendor-shadcn.mjs` runs the shadcn CLI pinned in devDependencies
  (`shadcn add <name>`, one fresh temporary project per name and set, package
  installs stubbed) for every bare name any item lists, in six sets: the style
  family the Labs base item configures per primitive (`radix-nova`,
  `base-nova`, `aria-nova`; primitive `none` uses `radix-nova`) times the
  icon library per icon set (`lucide`, `phosphor`; `none` uses `lucide`),
  with `rsc: true` and `rtl: false`. It commits the output to
  `vendor/shadcn/<style>-<icons>/`, with `manifest.json` (files per name,
  transitive ones included, and the packages they import), `README.md` and
  shadcn's MIT `LICENSE`. The only rewrite: `import { cn } from "cn"` becomes
  `@/lib/utils`.
- `scripts/prepare-content.mjs` writes `.generated/item-graph.json` (per
  published item: its set, the stock paths it may import, its Labs
  dependencies), copies only the vendored files published items use to
  `.generated/stock/<set>/`, and writes `.generated/stock.css`: the
  `tw-animate-css` and `shadcn/tailwind.css` imports a `shadcn init` adds,
  only when some published item uses stock files, else a comment. It fails
  when a published item lists a name the snapshot lacks.
- The alias plugin delegates to `resolveDemoImport`
  (`scripts/lib/stock-shadcn.mjs`): a stock name the importing item lists goes
  to its set; imports inside a vendored file stay in that set; any other `@/`
  path goes to the item's own file, then its Labs dependencies (so a phosphor
  sheet uses the phosphor data-table), then the dependency index; a relative
  import the item does not contain takes the same fallbacks.
- `vendor/` is excluded from Tailwind's automatic scan (`@source not`) and
  from Biome; it is outside the TypeScript project. Nothing in it is
  published in `/r`, the CLI or the npm library.
- The packages the demos import are exact-pinned root devDependencies, the
  newest releases old enough for the supply-chain policy (decision 0010).
  `react-day-picker` is 10, which `shadcn add calendar` installs today.

## Alternatives

| Option | Why not |
| --- | --- |
| Drop the demos of the three items | The preview would show install and source only; the owner reviews ports on the preview. |
| Hand-copy the raw registry JSON | Its files hold unresolved placeholders (`IconPlaceholder`, `@/app/...` paths) that only the CLI transform resolves. |
| Vendor one set (radix-nova, Lucide) | A phosphor variant's demo would mix icon sets, and Base UI and React Aria variants (phase 2) would need another round. |
| Resolve every `@/components/ui/<name>` to stock when no Labs item provides it | Silently changes other items' resolution; listing the name is the contract's signal. |
| Scan `vendor/` always and import tw-animate-css globally | Changes production CSS for components production does not show. |

## Evidence

`scripts/stock-shadcn.test.mjs` (`pnpm test`): set selection, dependency
split, transitive paths, every resolution rule, and that the snapshot covers
every stock name an item lists with no `cn` import or placeholder left. A
production `pnpm build:site` before and after this change produced identical
`dist/` file hashes except `credits.html`, which lists the two new credits
(the CSS bundle is byte-identical). `LABS_INCLUDE_BETA=1 pnpm build:site`
builds; on its preview, at 1280 and 375 pixels with no console errors, the
filter command opens, lists values and filters rows, a row click opens the
sheet (both icon sets, phosphor icons in the phosphor sheet) and Escape
closes it, and the data table's View popover, calendar date picker and
mobile filter drawer open. All six sets bundle against the pinned packages
(no missing export).

## Consequences

The snapshot is third-party code to refresh deliberately (rerun the script
after bumping `shadcn`; review the diff). Beta previews that use stock files
carry shadcn's custom variants (`data-open:` also matches
`data-state="open"`) site-wide; production does not. Demos use the site's
tokens, so radius steps follow the Labs theme, not a fresh shadcn theme.

## Re-test when

shadcn changes a style family's name or its init CSS, the `cn` package
becomes a requirement of its components, a Labs item lists a name the
snapshot lacks (prepare-content fails), or the library generator (decision
0017) starts taking items with stock dependencies.

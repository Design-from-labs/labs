# Fidelity: data-table

Port of the `data-table` item (filter sidebar, toolbar, table parts and `DataTableInfinite`) from
[openstatusHQ/data-table-filters](https://github.com/openstatusHQ/data-table-filters)
at `dd87f2770048f1b805d497f1c763794e060781c1` (MIT, Copyright (c) 2024 OpenStatus).

## How each side was rendered

- **Upstream**: the upstream monorepo at the pinned commit, `pnpm install --frozen-lockfile`,
  `next dev -p 5360` in `apps/web` (Next.js 16.2.12, Turbopack). Pages: `/default` (the
  table composed from the block's parts, with the command filter) and `/example` (the
  registry's own infinite example: `DataTableInfinite`, command filter, row sheet).
- **Port**: a second copy of the same monorepo (a local harness) on `next dev -p 5361`, into
  which our exported items (`*-radix-lucide`) were installed the way a user would: every
  `files[].content` written to its `target` under `apps/web/src/components/data-table/`,
  and the item's `cssVars`/`css` appended to `globals.css` as `shadcn add` writes them.
  Every upstream registry module that the port replaces was then turned into a one-line
  re-export of the installed file, so the upstream pages run unchanged against our code
  and only our code. The shadcn `ui/*` files, fonts (Geist), theme, layout, data and
  examples are upstream's own on both sides.
- **Same data**: both dev servers ran with a preload that freezes the server clock at
  2026-01-01T00:00:00Z, so the rows built from `new Date()` / `Date.now()` on the server are
  identical; the infinite example's rows are already seeded upstream.
- **Same browser state**: Playwright with `--clock 1767225600000 --advance 2000` (frozen
  browser time for relative timestamps and timers), deviceScaleFactor 1, light scheme unless
  noted. Hooks wait for the data, then click the command trigger or the first row. The
  Next.js dev indicator and the dev-only render overlay are hidden on both sides.

## Results

Before enhancements (the contract changes only: relative imports, unified `radix-ui`,
prefixed tokens, `"use client"`, no `process.env`):

| State | Viewport | Scheme | Differing px | % | Pass |
| --- | --- | --- | --- | --- | --- |
| Table with the filter sidebar (/default) | 1280x800 | light | 0 | 0.0000 | yes |
| Table with the filter sidebar (/default) | 375x812 | light | 0 | 0.0000 | yes |
| DataTableInfinite with sidebar, chart and rows (/example) | 1280x800 | light | 0 | 0.0000 | yes |
| DataTableInfinite with sidebar, chart and rows (/example) | 375x812 | light | 0 | 0.0000 | yes |
| Table with the filter sidebar, dark (/default) | 1280x800 | dark | 0 | 0.0000 | yes |

After enhancements (logical properties for right-to-left, reduced motion, keyboard
access to the "only" filter shortcut); the images in this directory are from this run:

| State | Viewport | Scheme | Differing px | % | Pass |
| --- | --- | --- | --- | --- | --- |
| Table with the filter sidebar (/default) | 1280x800 | light | 0 | 0.0000 | yes |
| Table with the filter sidebar (/default) | 375x812 | light | 0 | 0.0000 | yes |
| DataTableInfinite with sidebar, chart and rows (/example) | 1280x800 | light | 0 | 0.0000 | yes |
| DataTableInfinite with sidebar, chart and rows (/example) | 375x812 | light | 0 | 0.0000 | yes |
| Table with the filter sidebar, dark (/default) | 1280x800 | dark | 0 | 0.0000 | yes |

Enhancements with no visual effect in these states: logical utilities
(`ms-*`, `start-*`, `border-s`, `text-start`) for right-to-left, `useIsRtl` for
the physical `side` props and the column resize direction, `motion-reduce:`
on the accordion, panel and spinners, keyboard access to the checkbox
filter's "only" shortcut, and `aria-label="View"` on the view-options
combobox. `rtl-table-1280x800.webp` shows the demo with `dir="rtl"`.

Files: `<state>-<viewport>-before.webp` (upstream), `-after.webp` (port), `-diff.webp`
(pixelmatch, threshold 0.1), and `fidelity.json`.

## Deviations after the fidelity run

Both are pixel-neutral: no class, element or style changed.

- **Type-only imports** (`constants/date-preset.ts`, `data-table-provider.tsx`,
  `lib/table/filterfns.ts`, and in data-table-sheet `data-table-sheet-content.tsx`,
  `data-table-sheet-row-action.tsx`, `data-table-sheet-skeleton.tsx`): seven imports
  of types became `import type`. Projects made with shadcn's Vite template set
  `verbatimModuleSyntax`, under which Vite keeps a value-style import of a type and the
  module fails at runtime ("does not provide an export named `DataTableFilterField`"),
  in every variant. Type imports are erased, so the emitted code is the same.
- **Accessibility on the Radix overlays** (also in the Base UI overlays): the
  view-options popover is named "View options" and the date popover "Date range" (axe
  `aria-dialog-name`), the date presets select is named "Date presets" (`button-name`,
  in the filter drawer at 375 px), and dnd-kit's instructions and live region are
  portaled to `<body>` (`accessibility.container`) instead of rendering inside the
  view options listbox (`aria-required-children`). The Radix range thumbs already read
  "Minimum" and "Maximum". Measured in a local Vite app with the `*-radix-lucide` items:
  19 states (table, filters, slider, date popover, view options while dragging,
  command, sheet, sheet menu, drawer, right-to-left; 1280 and 375) differ by 0 px
  before and after, and axe shows 0 violations for the view options with the slider
  open and for the date popover at 1280 and 375, light and dark, LTR and RTL (each of
  those states had one to three findings before).

## Residual differences

None measured: every state is pixel-identical. What the comparison does not cover:

- Only the Radix + Lucide item is compared; the Phosphor item differs by its icons by
  design and was type-checked, not diffed.
- In-flight motion (the sheet slide, the accordion) was not compared frame by frame; the
  states are the settled end states.
- The level colors are compared through `--data-table-*` with upstream's registry values;
  the upstream docs site overrides `--success` with a muted value, which no compared state
  shows (the example's rows are info, warning and error).

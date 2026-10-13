# Fidelity: data-table-filter-command

Port of the `data-table-filter-command` item (the command filter input) from
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
| Command filter open (/default, trigger clicked) | 1280x800 | light | 0 | 0.0000 | yes |
| Command filter open (/default, trigger clicked) | 375x812 | light | 0 | 0.0000 | yes |

After enhancements (logical properties for right-to-left, reduced motion, keyboard
access to the "only" filter shortcut); the images in this directory are from this run:

| State | Viewport | Scheme | Differing px | % | Pass |
| --- | --- | --- | --- | --- | --- |
| Command filter open (/default, trigger clicked) | 1280x800 | light | 0 | 0.0000 | yes |
| Command filter open (/default, trigger clicked) | 375x812 | light | 0 | 0.0000 | yes |

One deliberate color change: the suggestion hints (`[name input]`) and the
history timestamps drop upstream's 80% opacity (`text-muted-foreground/80`
to `text-muted-foreground`) for WCAG AA contrast. It stays under pixelmatch's
0.1 threshold, so the diff counts 0 px; the color is measurably darker. The
list separators and the empty groups are hidden from assistive tech, with
no visual change.

Files: `<state>-<viewport>-before.webp` (upstream), `-after.webp` (port), `-diff.webp`
(pixelmatch, threshold 0.1), and `fidelity.json`.

## Residual differences

None measured: every state is pixel-identical. What the comparison does not cover:

- Only the Radix + Lucide item is compared; the Phosphor item differs by its icons by
  design and was type-checked, not diffed.
- In-flight motion (the sheet slide, the accordion) was not compared frame by frame; the
  states are the settled end states.
- The level colors are compared through `--data-table-*` with upstream's registry values;
  the upstream docs site overrides `--success` with a muted value, which no compared state
  shows (the example's rows are info, warning and error).

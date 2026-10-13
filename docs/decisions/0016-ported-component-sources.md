# 0016: Keep multi-file ports as sources in ports/ and export them with a script

- Status: Accepted
- Date: 2026-10-12
- Deciders: Port pod A (text-motion), under the owner's port brief
- Sources: S-157, S-100, S-101, S-102, S-103, S-104, S-105, S-004

## Context

The text and motion batch ports four upstreams (S-100 to S-103) whose code
spans many modules: torph's engine is about 2,700 lines in 19 files, and
goey-toast's toast is about 2,900 lines with a stylesheet. A registry item
carries every file inline as a JSON string (decision 0004), which nobody can
review or edit by hand, and the Phosphor variant must differ from the Lucide
one only in its icon imports. The owner's brief (S-157) asks for upstream
fidelity first, then the Labs enhancements, with the upstream license kept in
the shipped files.

Measured in this repository: `scripts/prepare-content.mjs` flattens every
item file into one directory for the npm library and re-exports all of them
with `export *`, so two files that export the same name (torph's vanilla
`TextMorph` class and its React `TextMorph`) break the library's type build;
and tsdown bundles any import that is not a dependency or peer of
`@designfrom/react`.

## Decision

- A multi-file port keeps its sources in `ports/<source-id>/<component>/`:
  the files, a `component.json` (the sidecar fields, the files and their
  registry types, dependencies, `docs`, the demo and an optional `stage`),
  the demo, and the upstream `LICENSE` once per source in
  `ports/<source-id>/LICENSE`.
- `pnpm ports` (`scripts/export-ports.mjs`) writes the canonical items and
  `meta.json` to `content/components/<source-id>/<component>/`, the way
  `pnpm examples` exports the Labs examples. Provenance (repository, pinned
  commit, author, license, attribution, credit) comes from the source's
  `sources.yaml` entry (`fetch: in-repo`, as the yui540 ports use), so it is
  written once. Every exported file ends with the upstream attribution and
  license text. A `-phosphor` item is derived from the Lucide sources with
  `ports/icons.json`. CI runs `pnpm ports:check`, which fails when the export
  is stale.
- Upstream modules are merged into a few flat files per item (`text-morph-core`,
  `-text`, `-engine`; `gooey-toast`, `-view`, `-core`, `-icons`), keeping
  upstream lines and replacing only relative imports, with a
  `// ---- upstream: <path> ----` marker before each module. Names that would
  collide in one module or in the library barrel are renamed, and each rename
  is listed in the component's `fidelity.md`.
- Verbatim upstream files are excluded from Biome (formatting and lint) so
  they stay diffable against upstream; Labs-written files (the wrappers,
  DotMorph, demos) are linted as usual.
- Primitive `none` for all four. TextMorph and Handwriting render text;
  GooeyToast's actions and close button are native buttons inside Sonner's
  own list, and no Radix, Base UI or React Aria part adds behavior Sonner
  lacks; DotMorph is one native `<button aria-pressed>` (a toggle), which a
  primitive would only wrap. Icon sets: only GooeyToast renders icons, so it
  alone ships `-lucide` and `-phosphor` items.
- GooeyToast is an add-on over shadcn's `sonner` item
  (`registryDependencies: ["sonner"]`) that renders its own Sonner
  `<Toaster>`. Its stylesheet ships as a string the toaster injects once,
  directly before Sonner's own `<style>`, which reproduces upstream's cascade
  order (a React-hoisted style, as in decision 0013, cannot be placed relative
  to Sonner's injected sheet). `framer-motion` is imported as `motion/react`.
- `@designfrom/react` lists `motion`, `sonner` and `tegaki` as optional
  peers, so a promoted item's dependency is never bundled into the library.
- Handwriting depends on `tegaki` only. Harfbuzz shaping (`harfbuzzjs`) is
  opt-in and documented, because importing it fails a default Next.js build.

## Alternatives

| Option | Why not |
| --- | --- |
| Hand-edit the item JSON (as the yui540 ports do) | Fine for one CSS string; thousands of lines of TypeScript as JSON strings cannot be reviewed or kept in sync between two icon variants. |
| Keep upstream's file tree with targets in subfolders | The npm build flattens files by name (two `animate.ts`), and the import validator allows only flat `@/lib/<name>` aliases. |
| Depend on the upstream npm packages (`torph`, `goey-toast`) | Not a port: no tokens, RTL or accessibility changes, and goey-toast's package pins its own Sonner. Kept for Tegaki only, whose value is the renderer and its font bundles. |
| A new `fetch: ported` mode | `in-repo` already says "authored here, never fetched"; the export script finds ports by their `ports/` directory. |

## Evidence

`pnpm ports:check` in CI; `docs/evidence/ports/<component>/fidelity.md`
(worst frames: TextMorph 0.0007%, GooeyToast 0.0916% against a 0.0893%
upstream-against-itself noise floor, Handwriting 0.0000%, DotMorph 0.0000%);
`scripts/export-ports.test.mjs`. A trial build with the four marked ready
passed `pnpm typecheck` (the library's `tsc` over the generated item sources)
and `pnpm build`, with no dependency bundled into the library; a
`LABS_INCLUDE_BETA=1` build passed the full e2e suite (149 tests). The four
items, added with the shadcn CLI to a fresh Next.js 16 app, typechecked,
built and rendered without configuration.

## Consequences

Two places describe a port (sources and export); the check keeps them
equal. Updating a port means re-running the merge against a new upstream
commit and re-measuring fidelity.

## Re-test when

The registry contract allows nested file targets that the library can build,
or an upstream publishes a registry item that the scanner could fetch as is.

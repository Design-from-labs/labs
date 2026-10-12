# Component export contract

- Contract version: **1**, revision 2 (2026-10-12: primitive dimension,
  per-variant status, foundation item types, the `@designfrom` namespace).
  Nothing had been exported under revision 1, so the version number stays 1.
- Machine-readable: [`schemas/meta.schema.json`](../schemas/meta.schema.json)
  (the sidecar) and
  [`schemas/labs-registry-item.schema.json`](../schemas/labs-registry-item.schema.json)
  (a registry item: shadcn's own schema, vendored in
  [`schemas/vendor/`](../schemas/vendor/), plus the stricter rules below)
- Checked by: `pnpm validate:content` (`scripts/validate-content.mjs`) and
  `pnpm check:licenses` (`scripts/check-licenses.mjs`), both in CI on every
  pull request
- Decisions: [0004](decisions/0004-canonical-component-format.md),
  [0009](decisions/0009-primitive-variants.md)

This is what a source (an approved repository listed in
[`sources.yaml`](../sources.yaml)) delivers so a component can appear on
`labs.designfrom.com`, in the shadcn registry at `/r/*.json` (and the
`@designfrom` namespace), in the `designfrom` CLI and in the
`@designfrom/react` npm library. Everything published is generated from these
files; nothing is hand-copied.

## 1. Layout

One directory per component (or foundation item), under the source that owns
it:

```text
content/components/<source-id>/<name>/
  meta.json                  the gallery sidecar (section 3)
  items/<item-name>.json     one shadcn registry-item.json per variant (section 2)
  demo.tsx                   the gallery demo (section 4); more allowed
  preview.webp               a compressed still (WebP or AVIF, <= 200 KB)
```

- `<source-id>` is an `id` from `sources.yaml` (for example `design-from-app`,
  `labs-examples`).
- `<name>` is a lower-kebab slug, equal to `meta.json` `name`, and unique
  across **all** sources (the registry namespace is flat).
- Nothing else goes in the directory. Files outside
  `content/components/<source-id>/` must not change in an export pull request.

## 2. Registry items (canonical format)

Each variant is one file, `items/<item-name>.json`, in the shadcn
[`registry-item.json`](https://ui.shadcn.com/docs/registry/registry-item-json)
format. Required beyond shadcn's schema:

| Field | Rule |
| --- | --- |
| `$schema` | `"https://ui.shadcn.com/schema/registry-item.json"` |
| `name` | the item name (below); equals the file name without `.json` |
| `type` | components: `registry:ui` (a primitive) or `registry:block` (a composition). Foundations: `registry:theme`, `registry:font`, `registry:base`, `registry:hook`, `registry:lib`. |
| `title`, `description` | plain text; the description is at least 10 characters |
| `author` | `"Name <https://url>"` |
| `categories` | at least one string; the build adds the `meta.json` category |
| `docs` | markdown shown by the shadcn CLI after install (at least 10 characters): what was installed and the first thing to do with it |
| `files[]` | required for ui, block, hook and lib items: every file **with its `content`**. `path` is `registry/<name>/<file>`; `type` is one of `registry:ui`, `registry:component`, `registry:block`, `registry:hook`, `registry:lib`. `target` is optional and may only point into components, ui, lib or hooks. No `registry:page` or `registry:file`. |
| `dependencies` | every npm package the files import (except `react`/`react-dom`), optionally with a range: `lucide-react@^1`. |
| `registryDependencies` | shadcn built-ins by name (`utils`, `button`), another Labs item by its item name (the build rewrites it to `https://labs.designfrom.com/r/<name>.json`), a namespaced item (`@designfrom/<name>`), or an absolute URL to another public registry. |
| `cssVars` | optional on components, required on `registry:theme`. When present it has **both** `light` and `dark` (plus `theme` for Tailwind v4 mappings). Prefer the shared tokens (section 5); declare any extra variable here. |
| `css` | allowed (Tailwind v4 form). |
| `font` | required on `registry:font` (shadcn's font object; `provider: "google"`, plus the `@fontsource` `dependency` for non-Next.js projects). |
| `config` | `registry:base` only (shadcn's base config: `style`, `iconLibrary`, `rtl`, `tailwind.baseColor`, `registries`). |
| `envVars`, `tailwind` | not allowed. |
| `meta` | optional; the build overwrites it with status, license, author, source, credits, primitive and icon set from `meta.json`. |

### Item names

```text
<component>[-<style>][-<primitive>][-<iconset>]
```

| Segment | Values | Omitted when |
| --- | --- | --- |
| `<style>` | a lower-kebab slug declared in `variants[].style` | it is the default style |
| `<primitive>` | `radix` (the unified `radix-ui` package), `base` (`@base-ui/react`), `aria` (`react-aria-components`) | the component uses no headless primitive (`primitive: "none"`) |
| `<iconset>` | `lucide`, `phosphor` | the item renders no icons (`iconSet: "none"`) |

Examples: `button-radix-lucide`, `button-aria-phosphor`,
`dialog-compact-base-lucide`, `badge-lucide` and `badge-subtle-phosphor`
(no primitive), `tooltip-radix` (no icons), `designfrom-theme`,
`font-figtree` (foundations: neither).

- A combination that is not implemented yet is simply **absent**; the gallery
  shows it as "not yet available". Do not ship placeholders.
- Within one primitive and style, a component that renders icons ships
  **both icon sets**; the two items differ only in their icon imports (the
  validator warns otherwise).
- A `-lucide` item imports icons only from `lucide-react` and lists it in
  `dependencies`. A `-phosphor` item imports only from `@phosphor-icons/react`
  or its server-safe `@phosphor-icons/react/ssr` entry (use the `*Icon` export
  names, for example `CheckIcon`) and lists `@phosphor-icons/react`. An
  icon-free item depends on neither.
- A `-radix` item imports only `radix-ui` (not `@radix-ui/react-*`), a `-base`
  item only `@base-ui/react` (subpaths such as `@base-ui/react/tooltip` are
  fine), an `-aria` item only `react-aria-components`; each lists its package
  in `dependencies`. A primitive-free item imports none of the three.

### Source files

- Imports allowed: `react`, the packages in `dependencies`, `@/lib/utils`
  (with `utils` in `registryDependencies`), `@/components/ui/<name>`,
  `@/hooks/<name>` and `@/lib/<name>` for a registry dependency, and relative
  imports between the item's own files. No other `@/` alias, no app-specific
  path, no environment access, no network calls at import time.
- Server-render safe: no `window`/`document` access at module scope. Files
  that use hooks or event handlers start with `"use client"`.
- Right-to-left safe: use logical utilities (`ms-*`, `me-*`, `ps-*`, `pe-*`,
  `start-*`, `end-*`, `text-start`) instead of left/right ones. The smoke test
  renders every ready demo with `dir="rtl"`.
- Keep comments: they are shown on the site and shipped to users. Do **not**
  add a license or provenance header; the build prepends a generated header
  (`@dfl-header`) with the item name, status, license, author, source, credits
  and install commands, so the attribution travels with the code.
- Third-party code keeps its original copyright notices inside the file as
  well.

## 3. The sidecar, `meta.json`

```json
{
  "$schema": "https://labs.designfrom.com/schemas/meta.schema.json",
  "schemaVersion": 1,
  "name": "button",
  "kind": "component",
  "title": "Button",
  "description": "A button with variants, sizes, a loading state and optional icons.",
  "status": "ready",
  "category": "actions",
  "label": "Labs examples",
  "variants": [
    { "name": "button-radix-lucide", "primitive": "radix", "iconSet": "lucide", "status": "ready" },
    { "name": "button-radix-phosphor", "primitive": "radix", "iconSet": "phosphor", "status": "ready" },
    { "name": "button-aria-lucide", "primitive": "aria", "iconSet": "lucide", "status": "beta" }
  ],
  "defaultVariant": "button-radix-lucide",
  "demo": { "*": "demo.tsx", "aria": "demo.aria.tsx" },
  "preview": "preview.webp",
  "source": { "repo": "private source", "commit": "<40-hex sha>" },
  "author": "Design From Labs <https://labs.designfrom.com>",
  "license": "MIT",
  "credits": ["S-004", "S-005", "S-006"],
  "date": "2026-10-12",
  "props": [
    { "name": "variant", "type": "\"default\" | \"secondary\" | \"ghost\"", "default": "\"default\"", "description": "Visual weight." }
  ],
  "a11y": ["Native <button>: Enter and Space activate it; focus is always visible."],
  "usage": "<Button>Save</Button>"
}
```

| Field | Required | Rule |
| --- | --- | --- |
| `schemaVersion` | yes | `1` |
| `name` | yes | the slug, equal to the directory name |
| `kind` | no | `component` (default), or a foundation: `theme`, `font`, `base`, `hook`, `lib` |
| `title`, `description` | yes | plain text; the description is 10 to 300 characters |
| `status` | yes | the component's status: `draft`, `beta`, `ready` or `deprecated` |
| `category` | yes | one of the values in the schema (`foundations` for foundation kinds) |
| `variants[]` | yes | `{ name, primitive, iconSet, status, style?, label? }`; `name` follows the item-name rule, `items/<name>.json` exists |
| `defaultVariant` | yes | one of `variants[].name`, and a ready one when the component is ready |
| `demo` | components | a `.tsx` path, or a map keyed by variant name, primitive or `"*"` (most specific wins) |
| `preview` | components | a WebP or AVIF file in the directory, at most 200 KB |
| `source.repo` | yes | a public `https://` URL, or exactly `"private source"` |
| `source.commit` | yes | the full 40-character SHA the export was taken from |
| `source.path` | no | only for a public source |
| `author` | yes | `"Name <https://url>"` recommended |
| `license` | yes | an SPDX id on the allowlist (section 6) |
| `attribution` | third-party only | the copyright and license notice the license requires |
| `credits[]` | yes | ids from [`docs/sources/registry.yaml`](sources/registry.yaml), at least one; add new entries in the same pull request |
| `date` | yes | `YYYY-MM-DD` |
| `label`, `tags`, `props`, `a11y`, `usage` | no | shown on the component page and in `llms-full.txt` |

**Publishing rule:** a variant publishes when the component's `status` is
`ready` **and** the variant's `status` is `ready` (implemented and tested).
`draft`, `beta` and `deprecated` variants are validated but never published;
the gallery's switcher shows unpublished or missing combinations as disabled
with a "not yet available" note.

## 4. Demos and previews

- A demo is a `.tsx` module in the component directory whose **default
  export** is a React component with no props. It imports the component the
  way an installed user would: `import { Button } from "@/components/ui/button"`.
  The site resolves that import to the variant being shown, so one demo can
  serve every variant of a primitive.
- Primitives differ in API (for example `onClick` versus `onPress`), so a
  demo may be keyed by primitive (`"aria": "demo.aria.tsx"`) or by variant.
- A demo shared across icon sets must not import an icon library; one that
  needs icons is keyed by variant.
- Demos are gallery-only: they are never published in `/r`, the CLI or the
  npm library. They are server-rendered for the gallery tile and hydrated on
  the component page only when scrolled into view, and they must render
  correctly with `dir="rtl"`.
- `preview.webp` (or `.avif`) is a still of the default variant's demo, at
  most 200 KB, 1200x750 recommended. `pnpm previews` regenerates previews.

## 5. Tokens

Components use the shared token layer
([`src/styles/tokens.css`](../src/styles/tokens.css), published as the
`designfrom-theme` item), which follows the shadcn variable names so an
installed item works in any shadcn project: `--background`, `--foreground`,
`--card`, `--popover`, `--primary`, `--secondary`, `--muted`, `--accent`,
`--destructive`, `--border`, `--input`, `--ring` (each with `-foreground`
where it has one) and `--radius`, used through Tailwind v4 utilities
(`bg-primary`, `text-muted-foreground`, `rounded-md`). Fonts are
`--font-sans` (Figtree), `--font-mono` (JetBrains Mono) and `--font-serif`
(Instrument Serif). Motion respects `prefers-reduced-motion`
(`motion-safe:`/`motion-reduce:`). Focus is visible
(`focus-visible:ring-2 focus-visible:ring-ring`).

## 6. Licenses and attribution

`scripts/check-licenses.mjs` refuses a component when:

- `license` is missing or not on the redistribution allowlist: `MIT`, `ISC`,
  `Apache-2.0`, `BSD-2-Clause`, `BSD-3-Clause`, `0BSD`, `Unlicense`,
  `CC0-1.0` (decision [0007](decisions/0007-component-license-policy.md));
  copyleft and non-commercial licenses are refused;
- it is third-party (its source is in the `oss` section of `sources.yaml`)
  and lacks `author`, `attribution`, or a `credits` entry whose source has a
  URL;
- a `credits` id is not in `docs/sources/registry.yaml`;
- its source is not in `sources.yaml`, or that source is not `active`.

Components exported from a private Design From source are the owner's work and
are published under the repository's MIT license.

## 7. Delivering an export (private sources)

Private sources are never fetched by this repository. The source repository
pushes a pull request here:

1. Branch `export/<source-id>/<component>` (or `export/<source-id>/<yyyy-mm-dd>`
   for a batch) from `staging`; target `staging`.
2. Change only `content/components/<source-id>/**` and, when needed, append
   entries to `docs/sources/registry.yaml`.
3. Title: `export(<source-id>): <component>[, <component>...]`. Body: the
   pull request template, with the `## Sources` section listing the credit ids.
4. Never include a private repository URL, an internal path, an environment
   value, a secret, or the name of any product other than Design From and
   Design From Labs. `source.repo` is `"private source"`. The guards
   (external references, gitleaks) fail the pull request otherwise.
5. Then send a `repository_dispatch` to `Design-from-labs/labs`:

   ```bash
   gh api repos/Design-from-labs/labs/dispatches \
     -f event_type=component-export \
     -f 'client_payload[source]=<source-id>' \
     -f 'client_payload[pr]=<pull request number>'
   ```

   The scanner workflow validates the pull request's content and reports the
   result in its run summary. CI also runs on the pull request itself.

Public third-party sources are fetched by the scanner at a pinned commit
(`sources.yaml`, `oss` section) and arrive on a `scanner/*` branch.

## 8. What publishes where

Only published variants (section 3) appear. For each one:

| Output | Path |
| --- | --- |
| Component page | `https://labs.designfrom.com/ui/<component>` (switcher: primitive, icon set, style) |
| Registry item | `https://labs.designfrom.com/r/<item-name>.json` (`/r/registry.json` is the index) |
| shadcn, by URL | `npx shadcn@latest add https://labs.designfrom.com/r/<item-name>.json` |
| shadcn, by namespace | add `"registries": { "@designfrom": "https://labs.designfrom.com/r/{name}.json" }` to `components.json`, then `npx shadcn@latest add @designfrom/<item-name>` |
| CLI | `npx designfrom add <component> [--primitive radix\|base\|aria] [--icons lucide\|phosphor] [--style <style>]` (defaults: `radix`, `lucide`); `npx designfrom list` |
| npm library | `npm i @designfrom/react`, then `import { Button } from "@designfrom/react/<primitive>/<component>[-<style>]"` (Lucide icons) or `.../<component>[-<style>]/phosphor`; primitive-free items drop the primitive segment (`@designfrom/react/badge`, `@designfrom/react/badge/phosphor`); `@designfrom/react/<component>` is the default variant; styles: `@designfrom/react/styles.css` |
| LLM index | `https://labs.designfrom.com/llms.txt`, `https://labs.designfrom.com/llms-full.txt` |
| AI assistants | the shadcn MCP server reads the `@designfrom` namespace from `components.json` (`npx shadcn@latest mcp init --client claude`) |

## 9. Changing this contract

A change that breaks an existing export bumps `schemaVersion`, keeps the
validator accepting the previous version for one release, and is announced in
`docs/decisions/`.

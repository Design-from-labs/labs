# Component export contract

- Contract version: **1** (`schemaVersion: 1` in every `meta.json`)
- Machine-readable: [`schemas/meta.schema.json`](../schemas/meta.schema.json)
  (the sidecar) and
  [`schemas/labs-registry-item.schema.json`](../schemas/labs-registry-item.schema.json)
  (a registry item: shadcn's own schema, vendored in
  [`schemas/vendor/`](../schemas/vendor/), plus the stricter rules below)
- Checked by: `pnpm validate:content` (`scripts/validate-content.mjs`) and
  `pnpm check:licenses` (`scripts/check-licenses.mjs`), both in CI on every
  pull request
- Decision: [0004](decisions/0004-canonical-component-format.md)

This is what a source (an approved repository listed in
[`sources.yaml`](../sources.yaml)) delivers so a component can appear on
`labs.designfrom.com`, in the shadcn registry at `/r/*.json`, in the
`designfrom` CLI and in the `@designfrom/react` npm library. Everything
published is generated from these files; nothing is hand-copied.

## 1. Layout

One directory per component, under the source that owns it:

```text
content/components/<source-id>/<component>/
  meta.json                  the gallery sidecar (section 3)
  items/<item-name>.json     one shadcn registry-item.json per variant (section 2)
  demo.tsx                   the gallery demo (section 4); more allowed
  preview.webp               a compressed still (WebP or AVIF, <= 200 KB)
```

- `<source-id>` is an `id` from `sources.yaml` (for example `design-from-app`,
  `labs-examples`).
- `<component>` is a lower-kebab slug, equal to `meta.json` `name`, and unique
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
| `type` | `registry:ui` (a primitive) or `registry:block` (a composition) |
| `title`, `description` | plain text; the description is at least 10 characters |
| `files[]` | every file **with its `content`**. `path` is `registry/<component>/<file>`; `type` is one of `registry:ui`, `registry:component`, `registry:block`, `registry:hook`, `registry:lib`. `target` is optional and may only point into components, ui, lib or hooks. No `registry:page` or `registry:file`. |
| `dependencies` | every npm package the files import (except `react`/`react-dom`), optionally with a range: `lucide-react@^1`. |
| `registryDependencies` | shadcn built-ins by name (`utils`, `button`), another Labs item by its item name (the build rewrites it to `https://labs.designfrom.com/r/<name>.json`), or an absolute URL to another public registry. |
| `cssVars` / `css` | allowed (Tailwind v4 form). Prefer the shared tokens (section 5); declare any extra variable in `cssVars` for both `light` and `dark`. |
| `envVars`, `tailwind` | not allowed. |
| `meta` | optional; the build overwrites it with status, license, author, source and credits from `meta.json`. |

### Item names

```text
<component>-<iconset>             button-lucide, button-phosphor
<component>-<style>-<iconset>     badge-subtle-lucide, badge-subtle-phosphor
<component>                       a component that renders no icons
<component>-<style>               a style of a component that renders no icons
```

- `<iconset>` is `lucide` or `phosphor`. A component that renders any icon ships
  **every style in both icon sets**; the two items of a pair differ only in
  their icon imports.
- A `-lucide` item imports icons only from `lucide-react` and lists it in
  `dependencies`; a `-phosphor` item imports only from `@phosphor-icons/react`
  (use the `*Icon` export names, for example `CheckIcon`). An icon-free item
  depends on neither.
- `<style>` is a lower-kebab slug declared in `meta.json` `variants[].style`.

### Source files

- Imports allowed: `react`, the packages in `dependencies`, `@/lib/utils`
  (with `utils` in `registryDependencies`), `@/components/ui/<name>` for a
  registry dependency, and relative imports between the item's own files.
  No other `@/` alias, no app-specific path, no environment access, no
  network calls at import time.
- Server-render safe: no `window`/`document` access at module scope.
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
  "title": "Button",
  "description": "A button with variants, sizes, a loading state and optional icons.",
  "status": "ready",
  "category": "actions",
  "label": "Labs examples",
  "variants": [
    { "name": "button-lucide", "iconSet": "lucide" },
    { "name": "button-phosphor", "iconSet": "phosphor" }
  ],
  "defaultVariant": "button-lucide",
  "demo": "demo.tsx",
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
| `name` | yes | the component slug, equal to the directory name |
| `title`, `description` | yes | plain text; the description is 10 to 300 characters |
| `status` | yes | `draft`, `beta`, `ready` or `deprecated`. **Only `ready` publishes.** |
| `category` | yes | one of the values in the schema |
| `variants[]` | yes | `{ name, iconSet, style?, label? }`; `name` must follow the item-name rule for its `iconSet` and `style`, and `items/<name>.json` must exist |
| `defaultVariant` | yes | one of `variants[].name` |
| `demo` | yes | a `.tsx` path, or a map `{ "*": "demo.tsx", "<item-name>": "demo.phosphor.tsx" }` |
| `preview` | yes | a WebP or AVIF file in the directory, at most 200 KB |
| `source.repo` | yes | a public `https://` URL, or exactly `"private source"` |
| `source.commit` | yes | the full 40-character SHA the export was taken from |
| `source.path` | no | only for a public source |
| `author` | yes | `"Name <https://url>"` recommended |
| `license` | yes | an SPDX id on the allowlist (section 6) |
| `attribution` | third-party only | the copyright and license notice the license requires |
| `credits[]` | yes | ids from [`docs/sources/registry.yaml`](sources/registry.yaml), at least one; add new entries in the same pull request |
| `date` | yes | `YYYY-MM-DD` |
| `label`, `tags`, `props`, `a11y`, `usage` | no | shown on the component page and in `llms-full.txt` |

## 4. Demos and previews

- A demo is a `.tsx` module in the component directory whose **default
  export** is a React component with no props. It imports the component the
  way an installed user would: `import { Button } from "@/components/ui/button"`.
  The site resolves that import to the variant being shown, so one shared demo
  serves every variant.
- A shared demo (`"demo": "demo.tsx"` or the `"*"` entry) must not import an
  icon library. A demo that needs icons is per variant
  (`"button-phosphor": "demo.phosphor.tsx"`).
- Demos are gallery-only: they are never published in `/r`, the CLI or the
  npm library. They are server-rendered for the gallery tile and hydrated on
  the component page only when scrolled into view.
- `preview.webp` (or `.avif`) is a still of the demo, at most 200 KB,
  1200x750 recommended. `pnpm previews` regenerates previews from the demos.

## 5. Tokens

Components use the shared token layer
([`src/styles/tokens.css`](../src/styles/tokens.css)), which follows the
shadcn variable names so an installed item works in any shadcn project:
`--background`, `--foreground`, `--card`, `--popover`, `--primary`,
`--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--input`,
`--ring` (each with `-foreground` where it has one) and `--radius`, used
through Tailwind v4 utilities (`bg-primary`, `text-muted-foreground`,
`rounded-md`). Motion respects `prefers-reduced-motion` (use
`motion-safe:`/`motion-reduce:`). Focus is visible
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

   The scanner workflow validates the pull request's content and comments the
   result. CI also runs on the pull request itself.

Public third-party sources are fetched by the scanner at a pinned commit
(`sources.yaml`, `oss` section) and arrive as a pull request from the
`scanner/*` branch.

## 8. What publishes where

Only `status: "ready"` components publish. For each ready variant:

| Output | Path |
| --- | --- |
| Component page | `https://labs.designfrom.com/ui/<component>` (variant switcher) |
| Registry item | `https://labs.designfrom.com/r/<item-name>.json` (`/r/registry.json` is the index) |
| shadcn install | `npx shadcn@latest add https://labs.designfrom.com/r/<item-name>.json` |
| CLI install | `npx designfrom add <component> [--style <style>] [--icons lucide\|phosphor]` (default `lucide`) |
| npm library | `npm i @designfrom/react`, then `import { Button } from "@designfrom/react/<component>[-<style>]/<iconset>"` (icon-free items: `@designfrom/react/<component>[-<style>]`); `@designfrom/react/<component>` is the default variant; styles: `@designfrom/react/styles.css` |
| LLM index | `https://labs.designfrom.com/llms.txt`, `https://labs.designfrom.com/llms-full.txt` |

## 9. Changing this contract

A change that breaks an existing export bumps `schemaVersion`, keeps the
validator accepting the previous version for one release, and is announced in
`docs/decisions/`.

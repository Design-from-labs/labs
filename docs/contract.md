# Component export contract

- Contract version: **1**, revision 4 (2026-10-12: the optional `tile` and
  `loop` for the specimen wall, sections 4.2 and 4.3). Revision 3 (2026-10-12)
  added the optional `stage` for layout parts (section 4.1). Revision 2 (2026-10-12) added the primitive
  dimension, per-variant status, foundation item types and the `@designfrom`
  namespace. All three revisions are additive: a sidecar valid under an earlier
  revision is still valid, so the version number stays 1.
- Machine-readable: [`schemas/meta.schema.json`](../schemas/meta.schema.json)
  (the sidecar) and
  [`schemas/labs-registry-item.schema.json`](../schemas/labs-registry-item.schema.json)
  (a registry item: shadcn's own schema, vendored in
  [`schemas/vendor/`](../schemas/vendor/), plus the stricter rules below)
- Checked by: `pnpm validate:content` (`scripts/validate-content.mjs`) and
  `pnpm check:licenses` (`scripts/check-licenses.mjs`), both in CI on every
  pull request
- Decisions: [0004](decisions/0004-canonical-component-format.md),
  [0009](decisions/0009-primitive-variants.md),
  [0015](decisions/0015-layout-stages.md),
  [0019](decisions/0019-specimen-wall.md),
  [0020](decisions/0020-specimen-loops.md)

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
| `cssVars` | **As shadcn does it.** Theme and base items (`registry:theme`, `registry:base`) carry the full shared token set. A component item carries **no shared tokens**: only its own component-specific variables, each prefixed with the component name (`--badge-success`, like shadcn's `--sidebar-*` and `--chart-*`), with `theme` keys of the form `<namespace>-<component>[-...]` (`color-badge-success`). Whenever `cssVars` is present it has **both** `light` and `dark`. The validator rejects a shared token name or an unprefixed key in a component item. |
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
  path, no environment access (the one exception is `process.env.NODE_ENV`,
  which bundlers inline at build time, for development-only tools; decision
  [0018](decisions/0018-node-env-in-items.md)), no network calls at import
  time.
- Server-render safe: no `window`/`document` access at module scope. Files
  that use hooks or event handlers start with `"use client"`.
- Right-to-left safe: use logical utilities (`ms-*`, `me-*`, `ps-*`, `pe-*`,
  `start-*`, `end-*`, `text-start`) instead of left/right ones. The smoke test
  renders every ready demo with `dir="rtl"`.
- Keep comments: they are shown on the site and shipped to users. Do **not**
  add a license or provenance header; the build inserts a generated header
  (`@dfl-header`) with the item name, status, license, author, source, credits
  and install commands right after the imports (the shadcn CLI drops comments
  above the first import), so the attribution travels with the code.
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
| `stage` | no | components only (revision 3): show a layout part in a device frame and app shell, section 4.1 |
| `tile` | no | revision 4: the entry's tile on the `/ui` wall (span, rows, surface), section 4.2 |
| `loop` | no | revision 4: the scripted motion of the entry's tile, section 4.3 |

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
- A shadcn built-in the item lists by bare name in `registryDependencies`
  (`button`, `command`) renders as shadcn's own component, from the style
  family of the variant's primitive (`radix-nova`, `base-nova`, `aria-nova`)
  and its icon set, as `shadcn add` installs it (decision
  [0023](decisions/0023-stock-shadcn-for-demos.md)). Import a Labs component
  by listing its item (`@designfrom/<item>`) instead.
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

### 4.1 Stages for layout parts

A component that is part of a layout (a sidebar, side panel, sheet, nav bar,
toolbar, command palette, header, footer or tab bar) declares a `stage`, so
its demo is shown **in context**: inside a neutral device frame and a
skeleton app shell, where the layout reads as the sum of its parts.

```json
"stage": { "device": "laptop", "slot": "sidebar-start", "shell": "app" }
```

| Field | Required | Values |
| --- | --- | --- |
| `device` | yes | the frame shown by default: `desktop` (1440x900), `laptop` (1280x800), `browser` (1280x800), `tablet` (768x1024), `phone` (390x844) |
| `slot` | yes | where the demo sits in the shell: `sidebar-start`, `sidebar-end`, `panel-end`, `sheet-bottom`, `header`, `footer`, `toolbar`, `overlay`, `inline` |
| `shell` | no | the skeleton around it: `app` (default), `marketing`, `docs` |
| `height` | no | the default device's viewport height in CSS pixels (240 to 1600), for a part that needs a shorter or taller screen |

- The demo renders in a same-origin iframe whose size is the device's real
  viewport, so the component's own breakpoints apply: a sidebar that becomes
  a top bar below `md` does so in the phone and tablet frames. Write layout
  parts with viewport breakpoints (`md:`), as an installed user would.
- Start and end are logical: in right-to-left, `sidebar-start` is on the
  right. Use logical utilities (section 2).
- The gallery tile shows the default device, static. The component page
  shows it live (only the demo hydrates) with a device switcher (the default
  device, then desktop, tablet and phone) and the direction switch.
- The demo is the part alone: the shell draws the rest. It fills its slot's
  height when the slot is a column (`sidebar-*`, `panel-end`), so use
  `md:h-full` rather than a fixed height.
- The preview still shows the default device.

### 4.2 Tiles on the specimen wall

`/ui` is a wall of specimens: each tile shows only the component (its demo,
or its exports for a foundation without one), with no title or text of its
own. Everything else is on the component page, which the tile expands into.
`tile` sizes the entry's tile:

```json
"tile": { "span": 2, "rows": 1, "surface": "dark" }
```

| Field | Default | Values |
| --- | --- | --- |
| `span` | 1 (2 for a staged layout part) | columns: `1` or `2`. The wall has 4 columns on desktop, 3 on tablets, 2 on phones (where `2` is full width) and 1 below 360px. |
| `rows` | 1 (2 for a staged layout part) | row units, `1` to `3`; a unit is four fifths of a column's width. On phones every tile is at most two units tall, and a full-width tile exactly two. |
| `surface` | `light` | `light` (soft gray) or `dark`; `dark` also renders the specimen with the dark theme tokens. The component page's hero uses the same surface. |

- The demo is laid out at the tile's inner width (a `w-full` demo fills it,
  a fixed-size one is centred) and scaled down to fit when it is larger:
  contained, never cropped. Size the tile so it reads well: a wide demo
  spans 2.
- A component that paints its own stage with its prefixed `--<name>-surface`
  variable gets `transparent` on the wall, so it sits directly on the tile
  (one surface, not two). The component page is unchanged.
- The tile is a link named "Title: first sentence of the description"; the
  specimen is `aria-hidden` and `inert`, so a demo's own controls are never
  reachable from the wall.
- On the wall the demo's default export receives `wall: true` (the component
  page and previews pass nothing), so a demo whose page version carries text
  of its own, such as an `sr-only` heading or a component's section
  headings, renders a text-free specimen there:
  `export default function Demo({ wall = false }: { wall?: boolean } = {})`.

### 4.3 Loops

On the wall, a specimen moves on repeat: `loop` scripts its signature
interaction with fake states, never real input.

```json
"loop": { "script": "hover[4] → press[4] → release[4] → idle", "duration": 5600 }
```

| Field | Default | Values |
| --- | --- | --- |
| `script` | none | steps separated by `→` (or `->`), played evenly over `duration`: `hover`, `press`, `release`, `focus`, `blur`, `click` (each with an optional `[n]`, the nth control in the specimen: buttons, links, inputs and widgets with a role, in document order, inside a stage's iframe for a staged entry), `idle` (clear every state) and `wait` |
| `duration` | 4000 | one pass, 1500 to 20000 ms |
| `hydrate` | `false` | `true` hydrates the specimen as a lazy island on the wall (`client:visible`): needed for `click`, or for a demo whose own motion needs JavaScript |

- Without `script`: a specimen with its own infinite CSS animation keeps it;
  one with controls cycles a hover state over its first three; anything else
  gets a gentle spotlight over its parts.
- States reach the component's own `hover:`, `active:` and `focus-visible:`
  styles (and React Aria's `data-hovered`, `data-pressed`,
  `data-focus-visible`), so write states with those, as usual.
- Loops play only in view and stop offscreen, in a hidden tab, under reduced
  motion and while the visitor's "Pause animations" toggle is on. A paused
  specimen has `data-loop-paused`, which also pauses its CSS animations. A
  hydrated demo that moves on its own timer must skip its step while
  `element.closest("[data-loop-paused]")` is set.

## 5. Tokens

Components use, but never define, the shared token layer
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
(`focus-visible:ring-2 focus-visible:ring-ring`). Ported components keep an upstream palette that fails contrast as their
default and lift it under `prefers-contrast: more` and forced colors
("fidelity default, contrast on request", [`ports/README.md`](../ports/README.md)).

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

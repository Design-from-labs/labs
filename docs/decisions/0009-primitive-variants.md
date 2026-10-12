# 0009: Add the headless primitive as a variant dimension, published per variant

- Status: Accepted
- Date: 2026-10-12
- Deciders: Owner, Pod LAB
- Sources: S-004, S-032, S-033, S-034, S-039, S-040

## Context

shadcn's CLI (v4.21) ships three style families in `components.json`
(`radix-*`, `base-*`, `aria-*`), one per headless primitive library (S-040).
The owner asked for every component to be offered on all three: Radix (the
unified `radix-ui` package), Base UI (`@base-ui/react`) and React Aria
(`react-aria-components`), alongside the two icon sets, and for each variant
to publish only once it is implemented and tested.

## Decision

- Item names are `<component>[-<style>][-<primitive>][-<iconset>]`, the
  primitive segment omitted for primitive-free components (`badge-lucide`)
  and the icon segment for icon-free items (`tooltip-aria`).
- `meta.json` `variants[]` carries `primitive`, `iconSet`, `style` and its
  own `status`. A variant publishes when the component and the variant are
  both `ready`. Missing or unpublished combinations stay visible in the
  switcher as disabled, with a "not yet available" note.
- npm subpaths put the primitive first, because a project picks its primitive
  library once and imports many components from it:
  `@designfrom/react/<primitive>/<component>[-<style>]` (Lucide),
  `.../<component>[-<style>]/phosphor` (Phosphor),
  `.../<component>[-<style>]/lucide` (explicit), primitive-free items without
  the primitive segment (`@designfrom/react/badge`), and
  `@designfrom/react/<component>` for the default variant.
- The `designfrom` CLI takes `--primitive radix|base|aria` (default `radix`)
  and `--icons lucide|phosphor` (default `lucide`).
- Tokens follow shadcn exactly (owner: "do it how shadcn does it"): theme
  and base items carry the full shared token set; a component item carries
  only its own component-prefixed variables (`--badge-success`, as shadcn's
  sidebar and chart items add `--sidebar-*` and `--chart-*`) in light and dark
  pairs, never a shared token. `scripts/lib/validate.mjs` rejects a component
  item whose `cssVars` key is a shared token name or is not prefixed with the
  component name, so installing a component can never overwrite a user's
  theme.
- The Labs examples prove the pipeline: Button and Tooltip in all three
  primitives, Badge as the primitive-free case.

## Alternatives

| Option | Why not |
| --- | --- |
| `@designfrom/react/button/radix` (component first) | Reads as if the primitive were a per-component option; projects choose it globally, like shadcn's style family. |
| `@designfrom/react/radix-lucide/button` | Couples two independent choices into one segment and multiplies entry folders. |
| Three packages (`@designfrom/radix` ...) | Triples publishing and versioning for one source of truth. |
| One status per component | Would block a finished Radix variant until React Aria is done, or publish an untested one. |

## Evidence

`pnpm validate:content` enforces names, imports and the publishing rule; the
CI install job adds a Radix, a Base UI and a React Aria item into a fresh
Next.js app; the Playwright smoke test switches primitives on the page.

## Consequences

Up to 3 primitives x 2 icon sets x styles items per component. The library
lists all three primitive packages as optional peer dependencies.

## Re-test when

shadcn adds or drops a style family, or a primitive library changes its
package name.

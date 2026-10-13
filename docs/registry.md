# Using the registry

Every published variant of every component is a shadcn registry item at
`https://labs.designfrom.com/r/<item>.json`, listed in
`https://labs.designfrom.com/r/registry.json`. Item names are
`<component>[-<style>][-<primitive>][-<iconset>]`
([contract](contract.md), section 2).

## Four ways to install

| Way | Command |
| --- | --- |
| shadcn, by URL | `npx shadcn@latest add https://labs.designfrom.com/r/button-radix-lucide.json` |
| shadcn, by namespace | `npx shadcn@latest add @designfrom/button-radix-lucide` (after the setup below) |
| `designfrom` CLI | `npx designfrom add button --primitive radix --icons lucide` (defaults: radix, lucide); `npx designfrom list` |
| npm library | `npm i @designfrom/react`, then `import { Button } from "@designfrom/react/radix/button"` |

A whole project can start from the base item, which sets the primitive style
family, the icon library, the theme, the three fonts, the utilities and the
namespace in one go:

```bash
npx shadcn@latest init https://labs.designfrom.com/r/designfrom-base-radix-lucide.json
```

## The `@designfrom` namespace

Add the registry once to `components.json`:

```json
{
  "registries": {
    "@designfrom": "https://labs.designfrom.com/r/{name}.json"
  }
}
```

Then any item installs by name, alone or mixed with shadcn's own:

```bash
npx shadcn@latest add @designfrom/button-aria-phosphor @designfrom/tooltip-aria
npx shadcn@latest view @designfrom/badge-subtle-lucide
npx shadcn@latest search @designfrom
```

CI proves this on every pull request: `scripts/registry-install-test.sh`
creates a fresh Next.js app, adds the namespace, installs items by namespace
and by URL, initializes a second app from the base item, and builds both.
`scripts/registry-install-vite-test.sh` then serves a second local build that
includes beta items (decision 0014), creates a Vite app with the pinned
`shadcn init -t vite -b radix -p nova`, adds
`@designfrom/data-table-radix-lucide`, `@designfrom/data-table-sheet-radix-lucide`,
`@designfrom/data-table-filter-command-radix-lucide` and `@designfrom/liveline`
by namespace, renders each item's demo, and runs the app's own
`tsc -b && vite build`. The Vite template sets `verbatimModuleSyntax` (the
Next.js template does not), so a type imported without `import type` fails
there: TS1484 in `tsc`, a missing export in the bundle (decision 0027).

## With Claude Code (shadcn MCP server)

The shadcn MCP server reads the registries in `components.json`, so once the
namespace is configured, Claude Code can browse, search and install Design
From Labs items by name (S-038).

1. Configure the namespace (above).
2. In the project, run:

   ```bash
   npx shadcn@latest mcp init --client claude
   ```

   or add it to `.mcp.json` by hand:

   ```json
   {
     "mcpServers": {
       "shadcn": {
         "command": "npx",
         "args": ["shadcn@latest", "mcp"]
       }
     }
   }
   ```

3. Restart Claude Code and run `/mcp` to confirm the `shadcn` server is
   connected.
4. Ask for items from the namespace, for example: "Show me the components in
   the @designfrom registry", "Add the @designfrom button on React Aria with
   Phosphor icons", or "Build a settings form with @designfrom components".

For coding assistants without MCP, `https://labs.designfrom.com/llms.txt`
indexes every item and `https://labs.designfrom.com/llms-full.txt` includes
their full source.

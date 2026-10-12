# designfrom

Add [Design From Labs](https://labs.designfrom.com/ui) components to your project with the shadcn CLI.

`designfrom` is a thin wrapper around `npx shadcn@latest add`. It reads the Design From Labs registry, picks the variant that matches your primitive library and icon set, and hands the right item URL to shadcn. The shadcn CLI still does the installing: it writes files, adds dependencies, and updates your CSS variables.

## Usage

There is nothing to install. Run it with npx from the root of a project that already has shadcn set up (a `components.json` file):

```bash
npx designfrom add button
```

That runs `npx shadcn@latest add https://labs.designfrom.com/r/button-radix-lucide.json` for you.

Requires Node 20 or newer.

## Commands

### `designfrom add <component...>`

Resolve one or more components and install them with shadcn.

```bash
npx designfrom add button
npx designfrom add button --primitive aria --icons phosphor
npx designfrom add badge --style subtle
npx designfrom add button badge tooltip
npx designfrom add button --dry-run
npx designfrom add button -- --overwrite --yes
```

| Flag | Default | Description |
| --- | --- | --- |
| `--primitive <radix\|base\|aria>` | `radix` | Headless primitive library: Radix, Base UI, or React Aria. |
| `--icons <lucide\|phosphor>` | `lucide` | Icon set. |
| `--style <style>` | none | Component style, for example `subtle`. Without it you get the default style. |
| `--registry <url>` | `https://labs.designfrom.com` | Registry base URL. You can also set `DESIGNFROM_REGISTRY_URL`. The flag wins. |
| `--dry-run` | off | Print the shadcn command instead of running it. |
| `-- <args>` | none | Everything after a bare `--` is passed to `shadcn add` unchanged. |

How a component is resolved:

- The registry index is fetched once, then each name is matched against the `component` field of its items.
- A flag only applies when the component has a choice along that axis. A badge has no primitive, so `--primitive` is ignored for it. A tooltip has no icons, so `--icons` is ignored for it.
- You can pass a full item name such as `button-aria-phosphor`. It is matched exactly and skips resolution.
- Item names follow `<component>[-<style>][-<primitive>][-<iconset>]`.
- If nothing matches, the command exits with code 1 and lists the combinations that do exist (for an unknown component, it lists every component).
- All components are resolved before shadcn starts, so a typo never leaves a half-finished install.
- shadcn runs with your terminal attached, and its exit code becomes the exit code of `designfrom`.

### `designfrom list`

Show what is available: components first, then foundations (themes, fonts, hooks, libs, and base setups), each with its variants.

```bash
npx designfrom list
npx designfrom list --json
```

| Flag | Description |
| --- | --- |
| `--json` | Print a machine-readable array. Each entry has `component`, `title`, `description`, `kind`, `primitives`, `iconSets`, `styles`, and `items`. |
| `--registry <url>` | Registry base URL, as for `add`. |

### `designfrom --help`, `designfrom --version`

`-h` and `-v` work too.

## Relation to the shadcn CLI

`designfrom add button` is a shortcut for installing a registry item by URL:

```bash
npx shadcn@latest add https://labs.designfrom.com/r/button-radix-lucide.json
```

Every item is a regular shadcn registry item at `https://labs.designfrom.com/r/<item>.json`, so you can always skip this package and call shadcn directly. The index lives at `https://labs.designfrom.com/r/registry.json`.

## The @designfrom namespace

If you prefer shadcn's namespace syntax, register Design From Labs in `components.json`:

```json
{
  "registries": {
    "@designfrom": "https://labs.designfrom.com/r/{name}.json"
  }
}
```

Then install by full item name:

```bash
npx shadcn@latest add @designfrom/button-radix-lucide
```

The namespace needs the full item name. `designfrom add` does the lookup from a short name plus flags, which is the main thing it adds.

## License

MIT. See [LICENSE](./LICENSE).

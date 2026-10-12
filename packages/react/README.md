# @designfrom/react

Design From Labs components for React, on the headless primitive library you
already use (Radix, Base UI or React Aria) with Lucide or Phosphor icons.
Browse every component, variant and its source at
[labs.designfrom.com/ui](https://labs.designfrom.com/ui).

> Prefer owning the source? Install the same components into your project
> with the shadcn CLI (`npx shadcn@latest add https://labs.designfrom.com/r/button-radix-lucide.json`)
> or with `npx designfrom add button`.

## Install

```bash
npm i @designfrom/react
# plus your primitive library and icon set, for example:
npm i radix-ui lucide-react
```

The primitive libraries (`radix-ui`, `@base-ui/react`,
`react-aria-components`) and icon sets (`lucide-react`,
`@phosphor-icons/react`) are optional peer dependencies: install only the
ones you import.

## Import

The primitive comes first in the path, because a project picks it once:

```tsx
import "@designfrom/react/styles.css";

import { Button } from "@designfrom/react/radix/button";            // Radix + Lucide
import { Button } from "@designfrom/react/aria/button/phosphor";     // React Aria + Phosphor
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@designfrom/react/base/tooltip";
import { Badge } from "@designfrom/react/badge";                    // no primitive; Lucide
import { Badge } from "@designfrom/react/badge-subtle/phosphor";    // a style variant
import { Button } from "@designfrom/react/button";                  // the default variant
```

| Path | Meaning |
| --- | --- |
| `@designfrom/react/<primitive>/<component>[-<style>]` | Lucide icons (also `/lucide`) |
| `@designfrom/react/<primitive>/<component>[-<style>]/phosphor` | Phosphor icons |
| `@designfrom/react/<component>[-<style>]` | components without a primitive, and each component's default variant |
| `@designfrom/react/styles.css` | the Design From tokens and the utilities these components use (no reset) |

Tailwind CSS v4 projects can skip `styles.css` and scan the package instead:
`@source "../node_modules/@designfrom/react/dist";`, with the tokens from the
`designfrom-theme` registry item.

Only variants marked ready (implemented and tested) are included. The
package is generated from the same registry items the site and the shadcn
registry serve; see the [contract](https://github.com/Design-from-labs/labs/blob/main/docs/contract.md).

## License

MIT for Design From Labs code. Third-party components keep their own license;
see `NOTICE.md` and [labs.designfrom.com/credits](https://labs.designfrom.com/credits).

#!/usr/bin/env bash
# Installs published registry items into a fresh Next.js app with the real
# shadcn CLI, through both the URL form and the @designfrom namespace, then
# typechecks and builds the app. CI runs it against the built site served
# locally (LABS_SITE_URL=http://localhost:4321 pnpm build:site && pnpm preview).
#
#   scripts/registry-install-test.sh <registry base url> <work dir>
set -euo pipefail

BASE="${1:-http://localhost:4321}"
WORK="${2:-$(mktemp -d)}"
APP="$WORK/app"
export CI=1 NEXT_TELEMETRY_DISABLED=1

echo "registry-install: creating a Next.js app in $APP"
mkdir -p "$WORK"
npx --yes create-next-app@latest "$APP" --ts --tailwind --eslint --app --src-dir \
  --import-alias "@/*" --use-npm --yes --skip-install --disable-git >/dev/null
cd "$APP"
npm install --no-audit --no-fund --loglevel=error

echo "registry-install: shadcn init"
npx --yes shadcn@latest init --defaults --yes >/dev/null

# The @designfrom namespace, exactly as docs/registry.md tells users to add it.
node -e '
const fs = require("node:fs");
const config = JSON.parse(fs.readFileSync("components.json", "utf8"));
config.registries = { ...(config.registries || {}), "@designfrom": process.argv[1] + "/r/{name}.json" };
fs.writeFileSync("components.json", JSON.stringify(config, null, 2));
' "$BASE"

echo "registry-install: add by namespace"
npx --yes shadcn@latest add --yes --overwrite \
  @designfrom/button-radix-lucide \
  @designfrom/tooltip-aria \
  @designfrom/badge-subtle-phosphor \
  @designfrom/designfrom-theme \
  @designfrom/font-figtree \
  @designfrom/use-reduced-motion

echo "registry-install: add by URL"
npx --yes shadcn@latest add --yes --overwrite \
  "$BASE/r/compose-refs.json" \
  "$BASE/r/sidebar-phosphor.json"

# A page that renders every installed component, so the build proves the
# imports, the cssVars and the generated headers all compile together.
mkdir -p src/app/labs
cat > src/app/labs/page.tsx <<'TSX'
"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sidebar, SidebarGroup, SidebarItem } from "@/components/ui/sidebar";
import { Tooltip, TooltipTrigger } from "@/components/ui/tooltip";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { composeRefs } from "@/lib/compose-refs";

export default function Labs() {
  const reduced = useReducedMotion();
  return (
    <main ref={composeRefs<HTMLElement>(undefined)} className="flex gap-4 p-8">
      <Sidebar title="Labs">
        <SidebarGroup label="Pages">
          <SidebarItem href="/" active>
            Home
          </SidebarItem>
        </SidebarGroup>
      </Sidebar>
      <Button loading={reduced}>Save</Button>
      <Badge tone="success">Deployed</Badge>
      <TooltipTrigger>
        <button type="button">Share</button>
        <Tooltip>Copies a link</Tooltip>
      </TooltipTrigger>
    </main>
  );
}
TSX

grep -q "@dfl-header" src/components/ui/button.tsx
grep -q -- "--badge-success" src/app/globals.css
echo "registry-install: build and typecheck"
npx next build >/dev/null
npx tsc --noEmit
echo "registry-install: components ok ($APP)"

# The base item initializes a whole project: primitive style, icon library,
# theme, fonts, utilities and the @designfrom namespace.
BASE_APP="$WORK/base-app"
npx --yes create-next-app@latest "$BASE_APP" --ts --tailwind --eslint --app --src-dir \
  --import-alias "@/*" --use-npm --yes --skip-install --disable-git >/dev/null
cd "$BASE_APP"
npm install --no-audit --no-fund --loglevel=error
npx --yes shadcn@latest init "$BASE/r/designfrom-base-aria-phosphor.json" --yes
node -e '
const config = JSON.parse(require("node:fs").readFileSync("components.json", "utf8"));
const problems = [];
if (config.style !== "aria-nova") problems.push(`style ${config.style}`);
if (config.iconLibrary !== "phosphor") problems.push(`iconLibrary ${config.iconLibrary}`);
if (!config.registries?.["@designfrom"]) problems.push("no @designfrom registry");
if (problems.length) { console.error("registry-install: base init wrong:", problems.join(", ")); process.exit(1); }
'
test -f src/hooks/use-reduced-motion.ts
test -f src/lib/compose-refs.ts
grep -q -- "--primary" src/app/globals.css
npx next build >/dev/null
echo "registry-install: ok ($APP, $BASE_APP)"

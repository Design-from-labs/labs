#!/usr/bin/env bash
# Installs beta port items into a fresh Vite app made by the pinned shadcn CLI
# (`shadcn init -t vite`), renders each item's own demo, then runs the app's
# build (`tsc -b && vite build`). The Vite template turns on
# `verbatimModuleSyntax`, so a type imported without `import type` fails here
# (TS1484, and Vite keeps the import at runtime); the Next.js scenario in
# registry-install-test.sh cannot see that. CI runs it against a second local
# build that includes beta items (docs/decisions/0014):
#
#   LABS_INCLUDE_BETA=1 LABS_SITE_URL=http://localhost:4322 pnpm build:site
#   pnpm exec astro preview --port 4322 &
#   scripts/registry-install-vite-test.sh http://localhost:4322 <work dir>
#
# The CLI is the repository's pinned devDependency (decision 0010), and the
# template is read from the shadcn-ui/ui tag of that same release, not from
# the default branch, so an upstream template change cannot move this check.
set -euo pipefail

BASE="${1:-http://localhost:4322}"
WORK="${2:-$(mktemp -d)}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SHADCN="$ROOT/node_modules/.bin/shadcn"
VERSION="$("$SHADCN" --version)"
APP="$WORK/vite-app"
export CI=1

# Representative multi-file ports: the data-table trio (two items pull the
# first through a cross-item registry dependency) and a nested, non-shadcn
# port. The demo of each is the code its gallery page renders.
ITEMS=(
  data-table-radix-lucide
  data-table-sheet-radix-lucide
  data-table-filter-command-radix-lucide
  liveline
)
DEMOS=(
  data-table-filters/data-table
  data-table-filters/data-table-sheet
  data-table-filters/data-table-filter-command
  liveline/liveline
)

mkdir -p "$WORK"
echo "registry-install-vite: shadcn $VERSION vite template"
git -c advice.detachedHead=false clone --quiet --depth 1 --filter=blob:none \
  --sparse --branch "shadcn@$VERSION" https://github.com/shadcn-ui/ui.git \
  "$WORK/shadcn-ui"
git -C "$WORK/shadcn-ui" sparse-checkout set templates/vite-app

echo "registry-install-vite: shadcn init -t vite -b radix -p nova in $APP"
# npm, like a user following the shadcn docs, whatever runs this script.
env -u npm_config_user_agent SHADCN_TEMPLATE_DIR="$WORK/shadcn-ui/templates" \
  "$SHADCN" init --template vite --base radix --preset nova --name vite-app \
  --cwd "$WORK" --yes --no-monorepo >/dev/null
cd "$APP"
grep -q '"verbatimModuleSyntax": true' tsconfig.app.json
# Every template flag applies as shipped (strict, verbatimModuleSyntax,
# noUnusedLocals, noUnusedParameters): a user's fresh app must build.
grep -q '"noUnusedLocals": true' tsconfig.app.json
grep -q '"noUnusedParameters": true' tsconfig.app.json

node -e '
const fs = require("node:fs");
const config = JSON.parse(fs.readFileSync("components.json", "utf8"));
if (config.style !== "radix-nova" || config.iconLibrary !== "lucide") {
  console.error(`registry-install-vite: unexpected ${config.style}/${config.iconLibrary}`);
  process.exit(1);
}
config.registries = { ...(config.registries || {}), "@designfrom": process.argv[1] + "/r/{name}.json" };
fs.writeFileSync("components.json", JSON.stringify(config, null, 2));
' "$BASE"

echo "registry-install-vite: add ${ITEMS[*]}"
env -u npm_config_user_agent "$SHADCN" add --yes --overwrite "${ITEMS[@]/#/@designfrom/}" >/dev/null

# Every demo on one page, so `vite build` bundles each item's module graph
# (tsc -b checks all of src either way).
mkdir -p src/demos
imports=""
body=""
for i in "${!DEMOS[@]}"; do
  cp "$ROOT/content/components/${DEMOS[$i]}/demo.tsx" "src/demos/demo-$i.tsx"
  imports+="import Demo$i from \"./demos/demo-$i\";"$'\n'
  body+="      <Demo$i />"$'\n'
done
cat > src/App.tsx <<TSX
$imports
export function App() {
  return (
    <main className="flex flex-col gap-8 p-8">
$body    </main>
  );
}

export default App;
TSX

echo "registry-install-vite: tsc -b && vite build"
npm run build
echo "registry-install-vite: ok ($APP)"

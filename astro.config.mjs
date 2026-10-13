// @ts-check
// Static site: every page, /r/*.json, /llms.txt and /llms-full.txt are
// prerendered (docs/decisions/0002-astro-static-site.md). React is used only
// for component demos, hydrated as lazy islands.
import { existsSync, readFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

const ROOT = process.cwd();
const ITEMS = resolve(ROOT, ".generated/items");

/**
 * Resolves the `@/...` imports inside published items and demos the way an
 * installed project would: `@/lib/utils` to the site's own utils, any other
 * `@/` path to the file of the same item (so each variant's demo renders that
 * variant), else to the default variant that provides it.
 */
function itemAliases() {
  const depIndexPath = join(ROOT, ".generated/dep-index.json");
  return {
    name: "labs-item-aliases",
    enforce: /** @type {const} */ ("pre"),
    /**
     * @param {string} source
     * @param {string | undefined} importer
     */
    resolveId(source, importer) {
      if (!source.startsWith("@/") || !importer) {
        return null;
      }
      const sub = source.slice(2);
      if (sub === "lib/utils") {
        return resolve(ROOT, "src/lib/utils.ts");
      }
      const from = relative(ITEMS, importer.split("?")[0]);
      if (!from.startsWith("..")) {
        const item = from.split(sep)[0];
        // A file, or a directory's index module, as bundlers resolve it
        // (`@/components/liveline` -> components/liveline/index.ts).
        for (const base of [sub, `${sub}/index`]) {
          for (const ext of [".tsx", ".ts"]) {
            const own = join(ITEMS, item, base + ext);
            if (existsSync(own)) {
              return own;
            }
          }
        }
      }
      if (existsSync(depIndexPath)) {
        const index = JSON.parse(readFileSync(depIndexPath, "utf8"));
        const hit = index[sub] ?? index[`${sub}/index`];
        if (hit) {
          return resolve(ROOT, hit);
        }
      }
      return null;
    },
  };
}

export default defineConfig({
  site: process.env.LABS_SITE_URL || "https://labs.designfrom.com",
  output: "static",
  trailingSlash: "never",
  build: { format: "file" },
  integrations: [react()],
  vite: {
    plugins: [itemAliases(), tailwindcss()],
  },
  devToolbar: { enabled: false },
});

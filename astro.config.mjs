// @ts-check
// Static site: every page, /r/*.json, /llms.txt and /llms-full.txt are
// prerendered (docs/decisions/0002-astro-static-site.md). React is used only
// for component demos, hydrated as lazy islands.
import { existsSync, readFileSync, statSync } from "node:fs";
import { relative, resolve, sep } from "node:path";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import { GRAPH_FILE, resolveDemoImport } from "./scripts/lib/stock-shadcn.mjs";

const ROOT = process.cwd();

/**
 * Resolves the imports inside published items and demos the way an installed
 * project would (scripts/lib/stock-shadcn.mjs has the rules and tests):
 * `@/lib/utils` to the site's own utils; a stock shadcn name the item lists
 * (`@/components/ui/button` with `button` in registryDependencies) to the
 * vendored stock file of the variant's style family; any other `@/` path to
 * the file of the same item (so each variant's demo renders that variant),
 * then the Labs items it depends on, else the default variant that provides
 * it; and a relative import into a directory another item fills (items that
 * install into one `components/<name>/` root) through the same fallbacks.
 */
function itemAliases() {
  /** @type {Map<string, { mtime: number, data: unknown }>} */
  const cache = new Map();
  /** The generated JSON, reread only when prepare-content rewrote it. */
  const readJson = (/** @type {string} */ path) => {
    const abs = resolve(ROOT, path);
    if (!existsSync(abs)) {
      return null;
    }
    const mtime = statSync(abs).mtimeMs;
    const hit = cache.get(abs);
    if (hit?.mtime === mtime) {
      return hit.data;
    }
    const data = JSON.parse(readFileSync(abs, "utf8"));
    cache.set(abs, { mtime, data });
    return data;
  };
  /** @param {string} rel */
  const exists = (rel) => {
    const abs = resolve(ROOT, rel);
    return existsSync(abs) && statSync(abs).isFile();
  };
  return {
    name: "labs-item-aliases",
    enforce: /** @type {const} */ ("pre"),
    /**
     * @param {string} source
     * @param {string | undefined} importer
     */
    resolveId(source, importer) {
      if (!importer || !(source.startsWith("@/") || source.startsWith("."))) {
        return null;
      }
      const from = relative(ROOT, importer.split("?")[0]).split(sep).join("/");
      if (source.startsWith(".") && !from.startsWith(".generated/items/")) {
        return null;
      }
      const hit = resolveDemoImport(source, from, {
        graph: readJson(GRAPH_FILE),
        depIndex: readJson(".generated/dep-index.json"),
        exists,
      });
      return hit ? resolve(ROOT, hit) : null;
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
    // roughjs (Rough Annotation) ships ES modules whose internal imports have
    // no file extension, which Node's own resolver rejects: bundle it into the
    // server builds instead of leaving it external (docs/pitfalls.md). Astro
    // renders pages in its own `prerender` environment, which does not read
    // the top-level `ssr` option.
    environments: {
      ssr: { resolve: { noExternal: ["roughjs"] } },
      prerender: { resolve: { noExternal: ["roughjs"] } },
      astro: { resolve: { noExternal: ["roughjs"] } },
    },
  },
  devToolbar: { enabled: false },
});

// Stock shadcn/ui components for gallery demos (docs/decisions/0023).
//
// A registry item may name shadcn built-ins by their bare name in
// `registryDependencies` (`button`, `command`; docs/contract.md, section 2).
// A user who installs that item gets shadcn's own files for those names, in
// the style family of their project. The site has to render the demo the same
// way, so it vendors stock components per style family and icon library
// (`vendor/shadcn/<style>-<icons>/`, written by scripts/vendor-shadcn.mjs) and
// resolves `@/components/ui/<name>` to them only for items that list `<name>`.
//
// Pure functions with no file system access, so the Astro alias plugin, the
// content build and the tests share one definition. Callers pass `exists`.

/** The style family a Labs base item configures per primitive (designfrom-base). */
export const STYLE_FOR_PRIMITIVE = {
  radix: "radix-nova",
  base: "base-nova",
  aria: "aria-nova",
  none: "radix-nova",
};
export const STOCK_ICON_LIBRARIES = ["lucide", "phosphor"];
export const STOCK_KEYS = [
  ...new Set(Object.values(STYLE_FOR_PRIMITIVE)),
].flatMap((style) => STOCK_ICON_LIBRARIES.map((icons) => `${style}-${icons}`));

export const VENDOR_DIR = "vendor/shadcn";
export const GENERATED_STOCK_DIR = ".generated/stock";
export const GRAPH_FILE = ".generated/item-graph.json";

/** `<style>-<icons>`: the vendored set a variant's stock dependencies come from. */
export function stockKey({ primitive, iconSet }) {
  const style = STYLE_FOR_PRIMITIVE[primitive] ?? STYLE_FOR_PRIMITIVE.none;
  return `${style}-${iconSet === "phosphor" ? "phosphor" : "lucide"}`;
}

/**
 * Splits `registryDependencies` into shadcn built-ins (bare names, except
 * `utils`, which the site serves itself) and Labs items (`@designfrom/<name>`
 * or a bare Labs item name). URLs and other namespaces are neither.
 */
export function splitRegistryDeps(deps, labsNames) {
  const stock = [];
  const labs = [];
  for (const dep of deps ?? []) {
    if (dep.startsWith("@designfrom/")) {
      labs.push(dep.slice("@designfrom/".length));
    } else if (labsNames.has(dep)) {
      labs.push(dep);
    } else if (/^[a-z0-9-]+$/.test(dep) && dep !== "utils") {
      stock.push(dep);
    }
  }
  return { stock, labs };
}

/**
 * The vendored paths (without extension, `components/ui/button`) an item can
 * import: the files shadcn writes for each listed name, transitive ones
 * included (`command` also writes `dialog`), as recorded in the manifest.
 * Returns the names the vendored set lacks as `missing`.
 */
export function stockPaths(stock, set) {
  const paths = new Set();
  const missing = [];
  for (const name of stock) {
    const files = set?.items?.[name]?.files;
    if (!files) {
      missing.push(name);
      continue;
    }
    for (const file of files) {
      paths.add(file.replace(/\.(tsx?|css)$/, ""));
    }
  }
  return { paths: [...paths].sort(), missing };
}

const EXTENSIONS = [".tsx", ".ts"];

/** A file, or a directory's index module, as bundlers resolve it. */
function findModule(base, exists) {
  for (const candidate of [base, `${base}/index`]) {
    for (const ext of EXTENSIONS) {
      if (exists(candidate + ext)) {
        return candidate + ext;
      }
    }
  }
  return null;
}

/** POSIX path helpers (the graph and importers use `/` separators). */
function normalize(path) {
  const out = [];
  for (const part of path.split("/")) {
    if (part === "..") {
      out.pop();
    } else if (part && part !== ".") {
      out.push(part);
    }
  }
  return out.join("/");
}

/**
 * Where an import inside a generated demo source resolves. Paths are relative
 * to the repository root with `/` separators. Returns a path, or null to let
 * Vite resolve the import normally.
 *
 * - `@/lib/utils` is the site's own.
 * - In a vendored stock file (`.generated/stock/<key>/...`): `@/...` stays in
 *   the same set, as in the project the CLI wrote it into.
 * - In item X (`.generated/items/X/...`): `@/components/ui/<name>` for a stock
 *   name X lists goes to X's vendored set; any other `@/` path to X's own file,
 *   then the Labs items X depends on, then the dependency index (the default
 *   variant that provides it).
 * - A relative import that X does not contain (its files install into a
 *   directory another item fills, `../data-table-provider`) resolves through
 *   X's Labs dependencies, then the dependency index.
 */
export function resolveDemoImport(source, importer, ctx) {
  const { graph, depIndex, exists } = ctx;
  const itemsDir = ".generated/items/";
  const stockDir = `${GENERATED_STOCK_DIR}/`;
  if (source === "@/lib/utils") {
    return "src/lib/utils.ts";
  }
  if (importer.startsWith(stockDir)) {
    if (!source.startsWith("@/")) {
      return null;
    }
    const key = importer.slice(stockDir.length).split("/")[0];
    return findModule(`${stockDir}${key}/${source.slice(2)}`, exists);
  }
  if (!importer.startsWith(itemsDir)) {
    // Site code: the dependency index, as before stock components existed.
    if (!source.startsWith("@/")) {
      return null;
    }
    const sub = source.slice(2);
    return depIndex?.[sub] ?? depIndex?.[`${sub}/index`] ?? null;
  }
  const rest = importer.slice(itemsDir.length);
  const item = rest.split("/")[0];
  const facts = graph?.items?.[item];
  const fromDeps = (sub) => {
    for (const dep of facts?.labs ?? []) {
      const hit = findModule(`${itemsDir}${dep}/${sub}`, exists);
      if (hit) {
        return hit;
      }
    }
    const indexed = depIndex?.[sub] ?? depIndex?.[`${sub}/index`];
    return indexed ?? null;
  };
  if (source.startsWith("@/")) {
    const sub = source.slice(2);
    if (facts?.stock?.includes(sub)) {
      return findModule(`${stockDir}${facts.key}/${sub}`, exists);
    }
    return findModule(`${itemsDir}${item}/${sub}`, exists) ?? fromDeps(sub);
  }
  if (source.startsWith("./") || source.startsWith("../")) {
    const dir = rest.split("/").slice(1, -1).join("/");
    const sub = normalize(`${dir}/${source}`);
    if (
      findModule(`${itemsDir}${item}/${sub}`, exists) ||
      exists(`${itemsDir}${item}/${sub}`)
    ) {
      return null;
    }
    return fromDeps(sub);
  }
  return null;
}

/**
 * The CSS layer `shadcn init` adds to a project for these styles: the
 * tw-animate-css utilities (`animate-in`, `fade-in-0`) and shadcn's own
 * variants (`data-open:` matching Radix's `data-state="open"`) and keyframes.
 * Written only when a published item uses stock components, so builds
 * without them keep their CSS byte for byte.
 */
export const STOCK_CSS = `/* Generated by scripts/prepare-content.mjs: the CSS layer of the stock shadcn components in .generated/stock (decision 0023). */
@import "tw-animate-css";
@import "shadcn/tailwind.css";
`;

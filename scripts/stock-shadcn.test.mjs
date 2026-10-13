import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { loadComponents, ROOT } from "./lib/content.mjs";
import {
  resolveDemoImport,
  STOCK_KEYS,
  splitRegistryDeps,
  stockKey,
  stockPaths,
  VENDOR_DIR,
} from "./lib/stock-shadcn.mjs";

test("stockKey follows the Labs base item: style per primitive, icons per set", () => {
  assert.equal(
    stockKey({ primitive: "radix", iconSet: "lucide" }),
    "radix-nova-lucide",
  );
  assert.equal(
    stockKey({ primitive: "base", iconSet: "phosphor" }),
    "base-nova-phosphor",
  );
  assert.equal(
    stockKey({ primitive: "aria", iconSet: "none" }),
    "aria-nova-lucide",
  );
  assert.equal(
    stockKey({ primitive: "none", iconSet: "none" }),
    "radix-nova-lucide",
  );
  assert.equal(STOCK_KEYS.length, 6);
});

test("splitRegistryDeps: bare names are stock, Labs items and namespaced are Labs", () => {
  const labs = new Set(["data-table-radix-lucide", "compose-refs"]);
  assert.deepEqual(
    splitRegistryDeps(
      [
        "utils",
        "button",
        "@designfrom/data-table-radix-lucide",
        "compose-refs",
        "https://example.com/r/x.json",
        "@acme/thing",
      ],
      labs,
    ),
    { stock: ["button"], labs: ["data-table-radix-lucide", "compose-refs"] },
  );
  assert.deepEqual(splitRegistryDeps(undefined, labs), { stock: [], labs: [] });
});

test("stockPaths takes transitive files from the manifest and reports gaps", () => {
  const set = {
    items: {
      command: {
        files: ["components/ui/command.tsx", "components/ui/dialog.tsx"],
      },
      button: { files: ["components/ui/button.tsx"] },
    },
  };
  assert.deepEqual(stockPaths(["command", "button", "chart"], set), {
    paths: [
      "components/ui/button",
      "components/ui/command",
      "components/ui/dialog",
    ],
    missing: ["chart"],
  });
});

// A miniature .generated tree: data-table (stock button, its own provider),
// data-table-sheet (stock button, depends on the phosphor data-table) and a
// Labs item that ships its own ui/button and lists no stock names.
const files = new Set([
  ".generated/items/dt-lucide/components/data-table/data-table-provider.tsx",
  ".generated/items/dt-lucide/components/data-table/lib/store/index.ts",
  ".generated/items/dt-phosphor/components/data-table/data-table-provider.tsx",
  ".generated/items/dt-phosphor/components/data-table/lib/store/index.ts",
  ".generated/items/sheet-phosphor/components/data-table/data-table-sheet/details.tsx",
  ".generated/items/sheet-phosphor/__demo.tsx",
  ".generated/items/button-radix-lucide/components/ui/button.tsx",
  ".generated/items/button-radix-lucide/__demo.tsx",
  ".generated/stock/radix-nova-lucide/components/ui/button.tsx",
  ".generated/stock/radix-nova-phosphor/components/ui/button.tsx",
  ".generated/stock/radix-nova-phosphor/components/ui/dialog.tsx",
  ".generated/stock/radix-nova-phosphor/components/ui/command.tsx",
]);
const ctx = {
  exists: (p) => files.has(p),
  depIndex: {
    "components/data-table/data-table-provider":
      ".generated/items/dt-lucide/components/data-table/data-table-provider.tsx",
    "components/ui/button":
      ".generated/items/button-radix-lucide/components/ui/button.tsx",
  },
  graph: {
    items: {
      "dt-lucide": {
        key: "radix-nova-lucide",
        stock: ["components/ui/button"],
        labs: [],
      },
      "sheet-phosphor": {
        key: "radix-nova-phosphor",
        stock: [
          "components/ui/button",
          "components/ui/command",
          "components/ui/dialog",
        ],
        labs: ["dt-phosphor"],
      },
    },
  },
};
const resolve = (source, importer) => resolveDemoImport(source, importer, ctx);

test("@/lib/utils is always the site's own", () => {
  assert.equal(
    resolve(
      "@/lib/utils",
      ".generated/stock/radix-nova-lucide/components/ui/button.tsx",
    ),
    "src/lib/utils.ts",
  );
  assert.equal(
    resolve(
      "@/lib/utils",
      ".generated/items/dt-lucide/components/data-table/data-table-provider.tsx",
    ),
    "src/lib/utils.ts",
  );
});

test("a listed stock name resolves to the variant's vendored set", () => {
  assert.equal(
    resolve(
      "@/components/ui/button",
      ".generated/items/dt-lucide/components/data-table/data-table-provider.tsx",
    ),
    ".generated/stock/radix-nova-lucide/components/ui/button.tsx",
  );
  assert.equal(
    resolve(
      "@/components/ui/button",
      ".generated/items/sheet-phosphor/__demo.tsx",
    ),
    ".generated/stock/radix-nova-phosphor/components/ui/button.tsx",
  );
});

test("an item that does not list the name keeps the Labs resolution", () => {
  assert.equal(
    resolve(
      "@/components/ui/button",
      ".generated/items/button-radix-lucide/__demo.tsx",
    ),
    ".generated/items/button-radix-lucide/components/ui/button.tsx",
  );
});

test("imports inside a vendored file stay in its set", () => {
  assert.equal(
    resolve(
      "@/components/ui/dialog",
      ".generated/stock/radix-nova-phosphor/components/ui/command.tsx",
    ),
    ".generated/stock/radix-nova-phosphor/components/ui/dialog.tsx",
  );
  assert.equal(
    resolve(
      "react",
      ".generated/stock/radix-nova-phosphor/components/ui/command.tsx",
    ),
    null,
  );
});

test("cross-item imports prefer the matching variant over the dependency index", () => {
  // `@/` path the sheet's demo imports from data-table: the phosphor one.
  assert.equal(
    resolve(
      "@/components/data-table/data-table-provider",
      ".generated/items/sheet-phosphor/__demo.tsx",
    ),
    ".generated/items/dt-phosphor/components/data-table/data-table-provider.tsx",
  );
  // A relative import out of the sheet's directory, into data-table's.
  assert.equal(
    resolve(
      "../data-table-provider",
      ".generated/items/sheet-phosphor/components/data-table/data-table-sheet/details.tsx",
    ),
    ".generated/items/dt-phosphor/components/data-table/data-table-provider.tsx",
  );
  // A directory index.
  assert.equal(
    resolve(
      "../lib/store",
      ".generated/items/sheet-phosphor/components/data-table/data-table-sheet/details.tsx",
    ),
    ".generated/items/dt-phosphor/components/data-table/lib/store/index.ts",
  );
});

test("relative imports the item contains are left to Vite", () => {
  assert.equal(
    resolve(
      "./lib/store",
      ".generated/items/dt-lucide/components/data-table/data-table-provider.tsx",
    ),
    null,
  );
});

test("items without graph facts fall back to the dependency index", () => {
  assert.equal(
    resolve(
      "@/components/data-table/data-table-provider",
      ".generated/items/other/__demo.tsx",
    ),
    ".generated/items/dt-lucide/components/data-table/data-table-provider.tsx",
  );
  assert.equal(resolve("../missing", ".generated/items/other/x/y.tsx"), null);
  assert.equal(resolve("./x", "src/pages/index.astro"), null);
});

test("the vendored snapshot covers every stock name a Labs item lists", () => {
  const manifest = JSON.parse(
    readFileSync(join(ROOT, VENDOR_DIR, "manifest.json"), "utf8"),
  );
  const components = loadComponents();
  const labsNames = new Set(components.flatMap((c) => [...c.items.keys()]));
  for (const entry of components) {
    for (const variant of entry.meta?.variants ?? []) {
      const item = entry.items.get(variant.name);
      const { stock } = splitRegistryDeps(
        item?.registryDependencies,
        labsNames,
      );
      const key = stockKey(variant);
      const { paths, missing } = stockPaths(stock, manifest.sets[key]);
      assert.deepEqual(missing, [], `${variant.name}: ${key}`);
      for (const path of paths) {
        assert.ok(
          ["", ".tsx", ".ts"].some((ext) =>
            existsSync(join(ROOT, VENDOR_DIR, key, path + ext)),
          ),
          `${key}/${path}`,
        );
      }
    }
  }
});

test("vendored files import the site's utils, never the cn package or placeholders", () => {
  const manifest = JSON.parse(
    readFileSync(join(ROOT, VENDOR_DIR, "manifest.json"), "utf8"),
  );
  for (const [key, set] of Object.entries(manifest.sets)) {
    for (const { files: list } of Object.values(set.items)) {
      for (const file of list) {
        const text = readFileSync(join(ROOT, VENDOR_DIR, key, file), "utf8");
        assert.doesNotMatch(text, /from\s*["']cn["']/, `${key}/${file}`);
        assert.doesNotMatch(
          text,
          /IconPlaceholder|@\/registry\//,
          `${key}/${file}`,
        );
      }
    }
  }
});

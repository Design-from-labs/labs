#!/usr/bin/env node
// Vendors the stock shadcn/ui components that published items name in
// `registryDependencies`, for the gallery demos (docs/decisions/0023).
//
//   node scripts/vendor-shadcn.mjs            every name any item lists
//   node scripts/vendor-shadcn.mjs button     only these names (merged in)
//
// For each style family and icon library (scripts/lib/stock-shadcn.mjs), and
// each name, it runs the shadcn CLI pinned in devDependencies (`shadcn add`)
// in a fresh temporary project configured the way the Labs base item
// configures one (components.json style, iconLibrary, rtl off), and copies
// what the CLI wrote below `src/` into vendor/shadcn/<style>-<icons>/. The CLI
// resolves the registry's placeholders (icons, the `@/registry` paths); the
// raw registry JSON is never hand-copied. Package installs are not run: the
// temporary project's npm, pnpm, yarn and bun are stubs, and the packages the
// demos need are pinned in the root package.json instead.
//
// One rewrite: the registry now imports `cn` from shadcn's `cn` package (a
// drop-in for clsx + tailwind-merge). Vendored files import `@/lib/utils`,
// which the site serves with clsx + tailwind-merge, as projects did before.
//
// Needs network access (the CLI fetches ui.shadcn.com). Not part of the build:
// the output is committed, with vendor/shadcn/manifest.json and README.md.
import { spawn } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { loadComponents, ROOT } from "./lib/content.mjs";
import {
  STOCK_KEYS,
  splitRegistryDeps,
  VENDOR_DIR,
} from "./lib/stock-shadcn.mjs";

const OUT = join(ROOT, VENDOR_DIR);
const CLI = join(ROOT, "node_modules", "shadcn", "dist", "index.js");
const cliVersion = JSON.parse(
  readFileSync(join(ROOT, "node_modules", "shadcn", "package.json"), "utf8"),
).version;
const pinned = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"))
  .devDependencies.shadcn;
if (cliVersion !== pinned) {
  throw new Error(
    `node_modules has shadcn ${cliVersion}, package.json pins ${pinned}: run pnpm install first.`,
  );
}

/** Every bare shadcn name any item lists, or the names given. */
function wantedNames() {
  const args = process.argv.slice(2);
  if (args.length > 0) {
    return args;
  }
  const components = loadComponents();
  const labsNames = new Set(components.flatMap((c) => [...c.items.keys()]));
  const names = new Set();
  for (const entry of components) {
    for (const item of entry.items.values()) {
      for (const name of splitRegistryDeps(item.registryDependencies, labsNames)
        .stock) {
        names.add(name);
      }
    }
  }
  return [...names].sort();
}

const work = mkdtempSync(join(tmpdir(), "labs-vendor-shadcn-"));
const bin = join(work, "bin");
mkdirSync(bin);
for (const pm of ["npm", "pnpm", "yarn", "bun"]) {
  const stub = join(bin, pm);
  writeFileSync(stub, "#!/bin/sh\nexit 0\n");
  chmodSync(stub, 0o755);
}

const CSS = '@import "tailwindcss";\n';

function project(key) {
  const [style, icons] = [
    key.slice(0, key.lastIndexOf("-")),
    key.slice(key.lastIndexOf("-") + 1),
  ];
  const dir = mkdtempSync(join(work, `${key}-`));
  const files = {
    "package.json": JSON.stringify({
      name: "vendor-shadcn",
      private: true,
      type: "module",
      dependencies: { react: "19.3.0", "react-dom": "19.3.0" },
      devDependencies: { tailwindcss: "4.3.3", typescript: "6.0.3" },
    }),
    "tsconfig.json": JSON.stringify({
      compilerOptions: {
        baseUrl: ".",
        paths: { "@/*": ["./src/*"] },
        jsx: "react-jsx",
      },
    }),
    "components.json": JSON.stringify({
      $schema: "https://ui.shadcn.com/schema.json",
      style,
      rsc: true,
      tsx: true,
      tailwind: {
        config: "",
        css: "src/styles/globals.css",
        baseColor: "neutral",
        cssVariables: true,
        prefix: "",
      },
      iconLibrary: icons,
      rtl: false,
      aliases: {
        components: "@/components",
        utils: "@/lib/utils",
        ui: "@/components/ui",
        lib: "@/lib",
        hooks: "@/hooks",
      },
      registries: {},
    }),
    "src/styles/globals.css": CSS,
    "src/lib/utils.ts":
      'import { type ClassValue, clsx } from "clsx";\nimport { twMerge } from "tailwind-merge";\n\nexport function cn(...inputs: ClassValue[]) {\n  return twMerge(clsx(inputs));\n}\n',
  };
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), content);
  }
  return dir;
}

function walk(dir) {
  if (!existsSync(dir)) {
    return [];
  }
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
  );
}

function run(args, cwd) {
  return new Promise((done) => {
    const child = spawn(process.execPath, [CLI, ...args], {
      cwd,
      env: {
        ...process.env,
        PATH: `${bin}:${process.env.PATH}`,
        npm_config_user_agent: "npm",
        CI: "1",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    child.stdout.on("data", (d) => {
      output += d;
    });
    child.stderr.on("data", (d) => {
      output += d;
    });
    child.on("close", (code) => done({ code, output }));
  });
}

const IMPORT_RE = /(?:^|\n)\s*(?:import|export)[^"']*?from\s*["']([^"']+)["']/g;

/** Adds one name to one set; returns what the CLI wrote and asked to install. */
async function vendor(key, name) {
  const dir = project(key);
  const { code, output } = await run(
    ["add", name, "--yes", "--overwrite", "--silent"],
    dir,
  );
  const src = join(dir, "src");
  const files = {};
  for (const abs of walk(src)) {
    const rel = relative(src, abs).split("\\").join("/");
    if (rel === "lib/utils.ts" || rel === "styles/globals.css") {
      continue;
    }
    files[rel] = readFileSync(abs, "utf8").replace(
      /(from\s*)(["'])cn\2/g,
      "$1$2@/lib/utils$2",
    );
  }
  const css = readFileSync(join(src, "styles", "globals.css"), "utf8");
  // Packages the files import (the CLI's install request is incomplete: it
  // skips packages a style's init would have added, such as radix-ui).
  const dependencies = [
    ...new Set(
      Object.values(files).flatMap((content) =>
        [...content.matchAll(IMPORT_RE)]
          .map((m) => m[1])
          .filter((spec) => !spec.startsWith(".") && !spec.startsWith("@/"))
          .map((spec) =>
            spec
              .split("/")
              .slice(0, spec.startsWith("@") ? 2 : 1)
              .join("/"),
          )
          .filter((pkg) => pkg !== "react" && pkg !== "react-dom"),
      ),
    ),
  ].sort();
  rmSync(dir, { recursive: true, force: true });
  if (code !== 0 || Object.keys(files).length === 0) {
    return { name, key, missing: true, output: output.trim().slice(-400) };
  }
  for (const [path, content] of Object.entries(files)) {
    for (const match of content.matchAll(IMPORT_RE)) {
      const spec = match[1];
      const ok =
        spec.startsWith(".") ||
        /^@\/(components\/ui|hooks|lib)\/[a-z0-9-]+$/.test(spec) ||
        /^(@[a-z0-9-]+\/)?[a-z0-9.-]+(\/[a-z0-9./-]+)?$/.test(spec);
      if (!ok || spec.startsWith("@/app") || spec.startsWith("@/registry")) {
        throw new Error(`${key}/${path}: unexpected import "${spec}"`);
      }
    }
    if (/IconPlaceholder|@\/registry\//.test(content)) {
      throw new Error(`${key}/${path}: unresolved registry placeholder`);
    }
  }
  return {
    name,
    key,
    files,
    dependencies,
    css: css === CSS ? null : css.slice(CSS.length),
  };
}

function readme(manifest) {
  const rows = Object.entries(manifest.sets).map(
    ([key, set]) =>
      `| \`${key}\` | ${set.style} | ${set.iconLibrary} | ${Object.keys(set.items).length} | ${set.missing.length ? set.missing.join(", ") : "none"} |`,
  );
  return `# Stock shadcn/ui components (vendored)

Generated by \`node scripts/vendor-shadcn.mjs\`. Do not edit these files; rerun
the script. Decision: [0023](../../docs/decisions/0023-stock-shadcn-for-demos.md).

- What: the stock shadcn/ui components that Labs registry items name by bare
  name in \`registryDependencies\` (\`button\`, \`command\`), so the gallery
  renders those items' demos as a project that ran \`shadcn add\` would.
- Source: the shadcn registry (https://ui.shadcn.com), written by the shadcn
  CLI (\`${manifest.cli}\`, pinned in the root \`package.json\`), on
  ${manifest.date}. Every file is the CLI's output for a project configured as
  the Labs base item configures one: \`style\` per primitive (radix-nova,
  base-nova, aria-nova), \`iconLibrary\` per icon set, \`rsc: true\`,
  \`rtl: false\`.
- One rewrite: \`import { cn } from "cn"\` (shadcn's \`cn\` package, a drop-in for
  clsx and tailwind-merge) becomes \`import { cn } from "@/lib/utils"\`.
- License: MIT, Copyright (c) 2023 shadcn ([LICENSE](LICENSE)). Credit: S-004
  in docs/sources/registry.yaml.
- Used only by the site's demos on builds that show beta items: the content
  build copies the sets a published item needs to \`.generated/stock/\`. They
  are never published in \`/r\`, the CLI or the npm library, and Biome and
  Tailwind skip this directory.
- Per name: the files the CLI wrote (transitive ones included) and the
  packages they import are in [manifest.json](manifest.json).

| Set | Style | Icons | Names | Unavailable |
| --- | --- | --- | --- | --- |
${rows.join("\n")}
`;
}

async function pool(jobs, size) {
  const results = [];
  let next = 0;
  async function worker() {
    while (next < jobs.length) {
      const job = jobs[next++];
      results.push(await job());
    }
  }
  await Promise.all(Array.from({ length: size }, worker));
  return results;
}

async function main() {
  const names = wantedNames();
  const explicit = process.argv.length > 2;
  const manifestPath = join(OUT, "manifest.json");
  const previous =
    explicit && existsSync(manifestPath)
      ? JSON.parse(readFileSync(manifestPath, "utf8"))
      : null;
  process.stdout.write(
    `vendor-shadcn: shadcn ${cliVersion}, ${names.length} name(s) x ${STOCK_KEYS.length} sets: ${names.join(", ")}\n`,
  );
  const results = await pool(
    STOCK_KEYS.flatMap((key) => names.map((name) => () => vendor(key, name))),
    6,
  );
  const manifest = {
    note: "Generated by scripts/vendor-shadcn.mjs. Do not edit; rerun it.",
    source: "https://ui.shadcn.com (registry), via the shadcn CLI",
    cli: `shadcn@${cliVersion}`,
    date: new Date().toISOString().slice(0, 10),
    license: "MIT (shadcn), see LICENSE",
    config: { rtl: false, rsc: true, baseColor: "neutral" },
    rewrites: ['import { cn } from "cn" -> import { cn } from "@/lib/utils"'],
    sets: previous?.sets ?? {},
  };
  for (const key of STOCK_KEYS) {
    const [style, icons] = [
      key.slice(0, key.lastIndexOf("-")),
      key.slice(key.lastIndexOf("-") + 1),
    ];
    const set = manifest.sets[key] ?? { style, iconLibrary: icons, items: {} };
    set.missing = (set.missing ?? []).filter((n) => !names.includes(n));
    const written = {};
    for (const r of results.filter((x) => x.key === key)) {
      if (r.missing) {
        delete set.items[r.name];
        set.missing.push(r.name);
        process.stdout.write(`  ${key}: no ${r.name} (${r.output})\n`);
        continue;
      }
      for (const [path, content] of Object.entries(r.files)) {
        const before = written[path];
        if (before !== undefined && before !== content) {
          // The CLI keeps "use client" on some transitive installs only.
          const bare = (s) => s.replace(/^"use client"\n\n/, "");
          if (bare(before) !== bare(content)) {
            throw new Error(
              `${key}/${path}: two names wrote different content`,
            );
          }
          if (before.length > content.length) {
            continue;
          }
        }
        written[path] = content;
      }
      set.items[r.name] = {
        files: Object.keys(r.files).sort(),
        dependencies: r.dependencies,
        ...(r.css ? { css: r.css } : {}),
      };
    }
    if (!explicit) {
      rmSync(join(OUT, key), { recursive: true, force: true });
    }
    for (const [path, content] of Object.entries(written)) {
      const target = join(OUT, key, path);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, content);
    }
    set.missing = [...new Set(set.missing)].sort();
    set.items = Object.fromEntries(
      Object.entries(set.items).sort(([a], [b]) => a.localeCompare(b)),
    );
    manifest.sets[key] = set;
  }
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  // The shadcn CLI package carries the same MIT notice as shadcn/ui.
  writeFileSync(
    join(OUT, "LICENSE"),
    readFileSync(join(ROOT, "node_modules", "shadcn", "LICENSE.md"), "utf8"),
  );
  writeFileSync(join(OUT, "README.md"), readme(manifest));
  rmSync(work, { recursive: true, force: true });
  const counts = STOCK_KEYS.map(
    (k) => `${k} ${Object.keys(manifest.sets[k].items).length}`,
  ).join(", ");
  process.stdout.write(`vendor-shadcn: wrote ${VENDOR_DIR} (${counts}).\n`);
}

main().catch((error) => {
  rmSync(work, { recursive: true, force: true });
  process.stderr.write(`vendor-shadcn: ${error.stack ?? error}\n`);
  process.exitCode = 1;
});

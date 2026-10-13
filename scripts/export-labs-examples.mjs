#!/usr/bin/env node
// Exports the Labs examples (examples/) in the canonical format
// (docs/contract.md) to content/components/labs-examples/, exactly as an
// external source would deliver them. Each Phosphor variant is derived from
// the Lucide source with examples/icons.json.
//
//   node scripts/export-labs-examples.mjs           write the export
//   node scripts/export-labs-examples.mjs --check   fail when it is stale
//
// --check ignores `source.commit` and `date`, which follow the last commit
// that touched each example and so change after every commit.
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ICON_SETS,
  itemName,
  LABS_AUTHOR,
  NAMESPACE,
  PRIMITIVES,
  SHADCN_ITEM_SCHEMA,
  SITE_URL,
} from "./lib/naming.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const EXAMPLES = join(ROOT, "examples");
const SOURCE_ID = "labs-examples";
const OUT = join(ROOT, "content", "components", SOURCE_ID);
const REPO = "https://github.com/Design-from-labs/labs";
const ICON_MAP = JSON.parse(readFileSync(join(EXAMPLES, "icons.json"), "utf8"));
const TOKENS = JSON.parse(
  readFileSync(join(EXAMPLES, "designfrom-theme", "tokens.json"), "utf8"),
);
const FILE_TYPES = {
  "registry:ui": "registry:ui",
  "registry:block": "registry:component",
  "registry:hook": "registry:hook",
  "registry:lib": "registry:lib",
};

const json = (value) => `${JSON.stringify(value, null, 2)}\n`;

function git(args) {
  try {
    return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function provenance(name) {
  const commit =
    git(["log", "-1", "--format=%H", "--", `examples/${name}`]) ||
    git(["rev-parse", "HEAD"]);
  const date = commit
    ? git(["show", "-s", "--format=%cs", commit])
    : new Date().toISOString().slice(0, 10);
  return { commit, date };
}

/** Rewrites a Lucide-authored file to Phosphor (server-safe entry). */
export function toPhosphor(content, map = ICON_MAP) {
  const importLine = /import\s*\{([^}]*)\}\s*from\s*"lucide-react";/;
  const match = importLine.exec(content);
  if (!match) {
    return content;
  }
  const names = match[1]
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
  const mapped = names.map((name) => {
    if (!map[name]) {
      throw new Error(`examples/icons.json has no Phosphor icon for ${name}`);
    }
    return map[name];
  });
  let out = content.replace(
    importLine,
    `import { ${[...mapped].sort().join(", ")} } from "@phosphor-icons/react/ssr";`,
  );
  for (const [index, name] of names.entries()) {
    out = out.replace(new RegExp(`\\b${name}\\b`, "g"), mapped[index]);
  }
  return out;
}

function labelFor(primitive, iconSet, styleLabel) {
  return [
    styleLabel,
    primitive !== "none" ? PRIMITIVES[primitive].label : null,
    iconSet !== "none" ? ICON_SETS[iconSet].label : null,
  ]
    .filter(Boolean)
    .join(", ");
}

function baseItem(spec, primitive, iconSet) {
  return {
    config: {
      style: `${primitive}-nova`,
      iconLibrary: iconSet,
      tailwind: { baseColor: "neutral" },
      registries: { [NAMESPACE]: `${SITE_URL}/r/{name}.json` },
    },
    dependencies: [
      ...(spec.dependencies ?? []),
      `${ICON_SETS[iconSet].package}@${iconSet === "lucide" ? "^1" : "^2"}`,
      `${PRIMITIVES[primitive].package}@^1`,
    ],
    cssVars: { light: TOKENS.light, dark: TOKENS.dark },
    css: {
      "@layer base": {
        "*": { "@apply border-border outline-ring/50": {} },
        body: { "@apply bg-background text-foreground font-sans": {} },
      },
    },
  };
}

function buildItem(name, spec, variant, iconSet, dir) {
  const { primitive = "none", style } = variant;
  const label = labelFor(
    primitive,
    iconSet,
    variant.label && style ? variant.label : null,
  );
  const item = {
    $schema: SHADCN_ITEM_SCHEMA,
    name: itemName({ component: name, style, primitive, iconSet }),
    type: spec.type,
    title: label ? `${spec.title} (${label})` : spec.title,
    description: spec.description,
    author: LABS_AUTHOR,
    categories: [
      spec.category,
      ...(primitive !== "none" ? [primitive] : []),
      ...(iconSet !== "none" ? [iconSet] : []),
    ],
    docs: spec.docs,
  };
  if (spec.kind === "base") {
    Object.assign(item, baseItem(spec, primitive, iconSet));
    item.registryDependencies = spec.registryDependencies;
    return item;
  }
  if (spec.kind === "theme") {
    item.cssVars = { light: TOKENS.light, dark: TOKENS.dark };
    return item;
  }
  if (spec.kind === "font") {
    item.font = spec.font;
    return item;
  }
  const dependencies = [
    ...(spec.dependencies ?? []),
    ...(variant.dependencies ?? []),
  ];
  if (iconSet === "lucide") {
    dependencies.push("lucide-react@^1");
  } else if (iconSet === "phosphor") {
    dependencies.push("@phosphor-icons/react@^2");
  }
  if (dependencies.length > 0) {
    item.dependencies = dependencies;
  }
  if (spec.registryDependencies?.length) {
    item.registryDependencies = spec.registryDependencies;
  }
  item.files = variant.files.map((file) => {
    const raw = readFileSync(join(dir, file), "utf8");
    return {
      path: `registry/${item.name}/${basename(file)}`,
      type: FILE_TYPES[spec.type],
      content: iconSet === "phosphor" ? toPhosphor(raw) : raw,
    };
  });
  if (spec.cssVars) {
    item.cssVars = spec.cssVars;
  }
  return item;
}

function exportOne(name) {
  const dir = join(EXAMPLES, name);
  const spec = JSON.parse(readFileSync(join(dir, "component.json"), "utf8"));
  const out = {};
  const variants = [];
  for (const variant of spec.variants) {
    for (const iconSet of spec.iconSets) {
      const item = buildItem(name, spec, variant, iconSet, dir);
      out[`items/${item.name}.json`] = json(item);
      variants.push({
        name: item.name,
        primitive: variant.primitive ?? "none",
        iconSet,
        ...(variant.style ? { style: variant.style } : {}),
        ...(variant.label ? { label: variant.label } : {}),
        status: variant.status,
      });
    }
  }
  const demos =
    typeof spec.demo === "string"
      ? [spec.demo]
      : Object.values(spec.demo ?? {});
  for (const demo of new Set(demos)) {
    out[demo] = readFileSync(join(dir, demo), "utf8");
  }
  const { commit, date } = provenance(name);
  const meta = {
    $schema: `${SITE_URL}/schemas/meta.schema.json`,
    schemaVersion: 1,
    name,
    kind: spec.kind,
    title: spec.title,
    description: spec.description,
    status: spec.status ?? "ready",
    category: spec.category,
    label: "Labs examples",
    variants,
    defaultVariant: spec.defaultVariant,
    ...(spec.demo ? { demo: spec.demo, preview: "preview.webp" } : {}),
    source: { repo: REPO, commit, path: `examples/${name}` },
    author: LABS_AUTHOR,
    license: "MIT",
    credits: spec.credits,
    date,
    ...(spec.props ? { props: spec.props } : {}),
    ...(spec.a11y ? { a11y: spec.a11y } : {}),
    ...(spec.usage ? { usage: spec.usage } : {}),
    ...(spec.stage ? { stage: spec.stage } : {}),
    ...(spec.tile ? { tile: spec.tile } : {}),
    ...(spec.loop ? { loop: spec.loop } : {}),
  };
  out["meta.json"] = json(meta);
  return out;
}

const VOLATILE = /"(commit|date)": "[^"]*"/g;

function main() {
  const check = process.argv.includes("--check");
  const names = readdirSync(EXAMPLES, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => existsSync(join(EXAMPLES, name, "component.json")))
    .sort();
  const stale = [];
  for (const name of names) {
    const files = exportOne(name);
    const target = join(OUT, name);
    if (check) {
      for (const [file, content] of Object.entries(files)) {
        const path = join(target, file);
        const current = existsSync(path) ? readFileSync(path, "utf8") : null;
        if (
          current === null ||
          current.replace(VOLATILE, "") !== content.replace(VOLATILE, "")
        ) {
          stale.push(`content/components/${SOURCE_ID}/${name}/${file}`);
        }
      }
      continue;
    }
    // Keep generated previews; replace everything else.
    const preview = join(target, "preview.webp");
    const keep = existsSync(preview) ? readFileSync(preview) : null;
    rmSync(target, { recursive: true, force: true });
    for (const [file, content] of Object.entries(files)) {
      const path = join(target, file);
      mkdirSync(join(path, ".."), { recursive: true });
      writeFileSync(path, content);
    }
    if (keep) {
      writeFileSync(preview, keep);
    }
  }
  if (check) {
    if (stale.length > 0) {
      for (const path of stale) {
        process.stderr.write(`stale: ${path}\n`);
      }
      process.stderr.write(
        "export-labs-examples: the export is stale. Run `pnpm examples` and commit.\n",
      );
      process.exitCode = 1;
      return;
    }
    process.stdout.write(
      `export-labs-examples: up to date (${names.length} entries).\n`,
    );
    return;
  }
  process.stdout.write(
    `export-labs-examples: wrote ${names.length} entries.\n`,
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}

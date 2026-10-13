#!/usr/bin/env node
// Exports the hand-ported third-party components whose sources live in
// ports/<source-id>/<component>/ (an `in-repo` entry of the `oss` section of
// sources.yaml) in the canonical format
// (docs/contract.md) to content/components/<source-id>/<component>/, the same
// way scripts/export-labs-examples.mjs exports the Labs examples. Provenance
// (repo, pinned commit, author, license, attribution, credit) comes from
// sources.yaml, so it is written once. Every exported file ends with the
// upstream copyright and license notice (ports/<source-id>/LICENSE). A
// Phosphor variant is derived from the Lucide source with ports/icons.json.
//
//   node scripts/export-ports.mjs           write the export
//   node scripts/export-ports.mjs --check   fail when it is stale
//   node scripts/export-ports.mjs <name>... only these components
//
// Two component.json shapes (ports/README.md):
//   flat      `files: [{ file, type }]`, primitive-free, files at the top level
//   variants  `variants: [{ primitive, roots, status }]`: one item per primitive
//             (radix | base | aria | none) and icon set, built from source roots
//             overlaid file by file (`src/shared` then `src/radix`, ...), each
//             file keeping its relative path below `target` when one is set;
//             a variant may name a `style` (with a switcher `label`) and its
//             own `iconSets`, so one style can draw its own glyphs (icon set
//             none) while another uses an icon library
//
// --check ignores `date`, which follows the last commit that touched a port.
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { toPhosphor } from "./export-labs-examples.mjs";
import { loadSources } from "./lib/content.mjs";
import {
  ICON_SETS,
  itemName,
  PRIMITIVES,
  SHADCN_ITEM_SCHEMA,
  SITE_URL,
} from "./lib/naming.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const PORTS = join(ROOT, "ports");
const OUT = join(ROOT, "content", "components");
const ICON_MAP = JSON.parse(readFileSync(join(PORTS, "icons.json"), "utf8"));
const ICON_RANGES = {
  lucide: "lucide-react@^1",
  phosphor: "@phosphor-icons/react@^2",
};

const json = (value) => `${JSON.stringify(value, null, 2)}\n`;

function git(args) {
  try {
    return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function lastChanged(path) {
  const commit = git(["log", "-1", "--format=%H", "--", path]);
  return commit
    ? git(["show", "-s", "--format=%cs", commit])
    : new Date().toISOString().slice(0, 10);
}

/**
 * The footer for each exported file, by its path in the item. Every file gets
 * the upstream attribution and license text, plus the upstream NOTICE when
 * `ports/<source-id>/NOTICE` exists (Apache-2.0, section 4(d)) and the
 * component's `changeNotice` (Apache-2.0, section 4(b)). A component with
 * `licenseFile` carries the full text once, in that file; the others carry a
 * short notice that points to it (an Apache-2.0 port of many modules would
 * otherwise repeat 11 KB of license per file).
 */
export function portFooters(sourceId, source, spec) {
  const licenseText = readFileSync(join(PORTS, sourceId, "LICENSE"), "utf8");
  const noticePath = join(PORTS, sourceId, "NOTICE");
  const notice = existsSync(noticePath)
    ? readFileSync(noticePath, "utf8").replace(/\r\n?/g, "\n").trim()
    : null;
  const change = spec.changeNotice ? `\n\n${spec.changeNotice}` : "";
  const full = licenseFooter(
    source.attribution,
    [
      licenseText.replace(/\r\n?/g, "\n").trim(),
      ...(notice ? ["", "---- Upstream NOTICE ----", "", notice] : []),
    ].join("\n") + change,
  );
  if (!spec.licenseFile) {
    return () => full;
  }
  const short = licenseFooter(
    source.attribution,
    `Licensed under the ${source.license} license (the "License"); you may not use this file except in compliance with the License. The full License text${notice ? " and the upstream NOTICE" : ""} end ${spec.licenseFile}, installed next to this file. Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.${change}`,
  );
  return (rel) => (rel === spec.licenseFile ? full : short);
}

/** The upstream notice appended to every exported file. */
export function licenseFooter(attribution, licenseText) {
  // Upstream LICENSE files may use CRLF; a stray \r would end up inside
  // every exported file (P-046).
  const body = [
    attribution,
    "",
    ...licenseText.replace(/\r\n?/g, "\n").trim().split("\n"),
  ]
    .map((line) => (line ? ` * ${line}` : " *"))
    .join("\n");
  return `\n/*\n${body.replaceAll("*/", "* /")}\n */\n`;
}

function buildItem(name, spec, source, iconSet, dir, footer) {
  const item = {
    $schema: SHADCN_ITEM_SCHEMA,
    name: itemName({ component: name, primitive: "none", iconSet }),
    type: spec.type,
    title:
      iconSet === "none"
        ? spec.title
        : `${spec.title} (${ICON_SETS[iconSet].label})`,
    description: spec.description,
    author: source.author,
    categories: [spec.category, ...(iconSet !== "none" ? [iconSet] : [])],
    docs: spec.docs,
  };
  const dependencies = [
    ...(spec.dependencies ?? []),
    ...(iconSet !== "none" ? [ICON_RANGES[iconSet]] : []),
  ];
  if (dependencies.length > 0) {
    item.dependencies = dependencies;
  }
  if (spec.devDependencies?.length) {
    item.devDependencies = spec.devDependencies;
  }
  if (spec.registryDependencies?.length) {
    item.registryDependencies = spec.registryDependencies;
  }
  item.files = spec.files.map((file) => {
    const raw = readFileSync(join(dir, file.file), "utf8");
    const content = iconSet === "phosphor" ? toPhosphor(raw, ICON_MAP) : raw;
    return {
      path: `registry/${item.name}/${file.file}`,
      type: file.type,
      content: `${content.trimEnd()}\n${footer(file.file)}`,
    };
  });
  if (spec.cssVars) {
    item.cssVars = spec.cssVars;
  }
  return item;
}

/**
 * Rewrites Lucide imports to Phosphor (server-safe entry) with a name map.
 * Handles value and `import type` imports, aliases (`X as Y`) and the
 * `LucideIcon` / `LucideProps` types (mapped through the same map).
 */
export function toPhosphorTyped(content, map, where) {
  const importRe =
    /import\s+(type\s+)?\{([^}]*)\}\s*from\s*["']lucide-react["'];?/g;
  const renames = new Map();
  let out = content.replace(importRe, (_all, isType, list) => {
    const parts = list
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    const mapped = parts.map((part) => {
      const typeOnly = /^type\s+/.test(part);
      const clean = part.replace(/^type\s+/, "");
      const [imported, local] = clean.split(/\s+as\s+/).map((s) => s.trim());
      const target = map[imported];
      if (!target) {
        throw new Error(
          `${where}: icons.json has no Phosphor name for ${imported}`,
        );
      }
      if (local) {
        return `${typeOnly ? "type " : ""}${target} as ${local}`;
      }
      renames.set(imported, target);
      return `${typeOnly ? "type " : ""}${target}`;
    });
    return `import ${isType ? "type " : ""}{ ${mapped.join(", ")} } from "@phosphor-icons/react/ssr";`;
  });
  for (const [from, to] of renames) {
    if (from === to) {
      continue;
    }
    // Only identifiers outside the rewritten import lines.
    out = out
      .split("\n")
      .map((line) =>
        line.includes("@phosphor-icons/react/ssr")
          ? line
          : line.replace(new RegExp(`(?<![\\w.$-])${from}(?![\\w$])`, "g"), to),
      )
      .join("\n");
  }
  return out;
}

const FILE_TYPES = {
  "registry:ui": "registry:ui",
  "registry:block": "registry:component",
  "registry:hook": "registry:hook",
  "registry:lib": "registry:lib",
};
const SOURCE_EXT = /\.(tsx|ts|css)$/;

function walk(dir, base = dir) {
  if (!existsSync(dir)) {
    return [];
  }
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      return walk(path, base);
    }
    return SOURCE_EXT.test(entry.name) ? [relative(base, path)] : [];
  });
}

/** The files of one variant: later roots override earlier ones by path. */
function variantFiles(dir, variant) {
  const files = new Map();
  for (const root of variant.roots) {
    for (const rel of walk(join(dir, root))) {
      files.set(rel.split("\\").join("/"), join(dir, root, rel));
    }
  }
  for (const rel of variant.exclude ?? []) {
    files.delete(rel);
  }
  return [...files.entries()].sort(([a], [b]) => a.localeCompare(b));
}

function labelFor(primitive, iconSet) {
  return [
    primitive !== "none" ? PRIMITIVES[primitive].label : null,
    iconSet !== "none" ? ICON_SETS[iconSet].label : null,
  ]
    .filter(Boolean)
    .join(", ");
}

/** An item of a variants-shaped port (one primitive, one icon set). */
function buildVariantItem(
  name,
  spec,
  source,
  variant,
  iconSet,
  dir,
  footer,
  icons,
) {
  const primitive = variant.primitive ?? "none";
  const label = [variant.label ?? null, labelFor(primitive, iconSet) || null]
    .filter(Boolean)
    .join(", ");
  const item = {
    $schema: SHADCN_ITEM_SCHEMA,
    name: itemName({
      component: name,
      style: variant.style,
      primitive,
      iconSet,
    }),
    type: spec.type,
    title: label ? `${spec.title} (${label})` : spec.title,
    description: spec.description,
    author: source.author,
    categories: [
      spec.category,
      ...(primitive !== "none" ? [primitive] : []),
      ...(iconSet !== "none" ? [iconSet] : []),
    ],
    docs: spec.docs,
  };
  const dependencies = [
    ...(spec.dependencies ?? []),
    ...(variant.dependencies ?? []),
  ];
  const primitivePackage = PRIMITIVES[primitive]?.package;
  if (
    primitivePackage &&
    !dependencies.some(
      (d) => d.startsWith(`${primitivePackage}@`) || d === primitivePackage,
    )
  ) {
    dependencies.push(`${primitivePackage}@^1`);
  }
  if (iconSet !== "none") {
    dependencies.push(ICON_RANGES[iconSet]);
  }
  if (dependencies.length > 0) {
    item.dependencies = dependencies;
  }
  const registryDependencies = [
    ...(spec.registryDependencies ?? []),
    ...(variant.registryDependencies ?? []),
  ].map((dep) =>
    dep.replaceAll("{primitive}", primitive).replaceAll("{iconSet}", iconSet),
  );
  if (registryDependencies.length > 0) {
    item.registryDependencies = registryDependencies;
  }
  item.files = variantFiles(dir, variant).map(([rel, abs]) => {
    const raw = readFileSync(abs, "utf8");
    const content =
      iconSet === "phosphor"
        ? toPhosphorTyped(raw, icons, `${name}/${rel}`)
        : raw;
    const file = {
      path: `registry/${item.name}/${rel}`,
      type: FILE_TYPES[spec.type],
      content: `${content.trimEnd()}\n${footer(rel)}`,
    };
    if (spec.target) {
      file.target = `${spec.target}/${rel}`;
    }
    return file;
  });
  if (spec.cssVars) {
    item.cssVars = spec.cssVars;
  }
  if (spec.css) {
    item.css = spec.css;
  }
  return item;
}

export function exportPort(sourceId, name, source) {
  const dir = join(PORTS, sourceId, name);
  const spec = JSON.parse(readFileSync(join(dir, "component.json"), "utf8"));
  const footer = portFooters(sourceId, source, spec);
  const out = {};
  const variants = [];
  if (spec.variants) {
    const icons = {
      ...ICON_MAP,
      ...(existsSync(join(dir, "icons.json"))
        ? JSON.parse(readFileSync(join(dir, "icons.json"), "utf8"))
        : {}),
    };
    for (const variant of spec.variants) {
      for (const iconSet of variant.iconSets ?? spec.iconSets ?? ["none"]) {
        const item = buildVariantItem(
          name,
          spec,
          source,
          variant,
          iconSet,
          dir,
          footer,
          icons,
        );
        out[`items/${item.name}.json`] = json(item);
        variants.push({
          name: item.name,
          ...(variant.style ? { style: variant.style } : {}),
          ...(variant.label ? { label: variant.label } : {}),
          primitive: variant.primitive ?? "none",
          iconSet,
          status: variant.status ?? spec.status,
        });
      }
    }
  } else {
    for (const iconSet of spec.iconSets ?? ["none"]) {
      const item = buildItem(name, spec, source, iconSet, dir, footer);
      out[`items/${item.name}.json`] = json(item);
      variants.push({
        name: item.name,
        primitive: "none",
        iconSet,
        status: spec.status,
      });
    }
  }
  const demos =
    typeof spec.demo === "string" ? [spec.demo] : Object.values(spec.demo);
  for (const demo of new Set(demos)) {
    out[demo] = readFileSync(join(dir, demo), "utf8");
  }
  const meta = {
    $schema: `${SITE_URL}/schemas/meta.schema.json`,
    schemaVersion: 1,
    name,
    kind: "component",
    title: spec.title,
    description: spec.description,
    status: spec.status,
    category: spec.category,
    label: source.name,
    variants,
    defaultVariant: spec.defaultVariant ?? variants[0].name,
    demo: spec.demo,
    preview: "preview.webp",
    source: {
      repo: source.repo,
      commit: source.ref,
      ...((spec.upstreamPath ?? spec.sourcePath)
        ? { path: spec.upstreamPath ?? spec.sourcePath }
        : {}),
    },
    author: source.author,
    license: source.license,
    attribution: source.attribution,
    credits: [...new Set([source.credit, ...(spec.credits ?? [])])],
    date: lastChanged(`ports/${sourceId}/${name}`),
    ...(spec.stage ? { stage: spec.stage } : {}),
    ...(spec.tile ? { tile: spec.tile } : {}),
    ...(spec.loop ? { loop: spec.loop } : {}),
    ...(spec.tags ? { tags: spec.tags } : {}),
    ...(spec.props ? { props: spec.props } : {}),
    ...(spec.a11y ? { a11y: spec.a11y } : {}),
    ...(spec.usage ? { usage: spec.usage } : {}),
  };
  out["meta.json"] = json(meta);
  return out;
}

const VOLATILE = /"date": "[^"]*"/g;

function main() {
  const check = process.argv.includes("--check");
  const only = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const { oss } = loadSources();
  const ported = oss.filter(
    (s) => s.fetch === "in-repo" && existsSync(join(PORTS, s.id)),
  );
  const stale = [];
  let count = 0;
  for (const source of ported) {
    for (const component of source.components ?? []) {
      if (only.length > 0 && !only.includes(component.name)) {
        continue;
      }
      const dir = join(PORTS, source.id, component.name);
      if (!existsSync(join(dir, "component.json"))) {
        stale.push(
          `ports/${source.id}/${component.name}/component.json (missing)`,
        );
        continue;
      }
      count++;
      const files = exportPort(source.id, component.name, source);
      const target = join(OUT, source.id, component.name);
      if (check) {
        for (const [file, content] of Object.entries(files)) {
          const path = join(target, file);
          const current = existsSync(path) ? readFileSync(path, "utf8") : null;
          if (
            current === null ||
            current.replace(VOLATILE, "") !== content.replace(VOLATILE, "")
          ) {
            stale.push(
              `content/components/${source.id}/${component.name}/${file}`,
            );
          }
        }
        const itemsDir = join(target, "items");
        if (existsSync(itemsDir)) {
          for (const file of readdirSync(itemsDir)) {
            if (!files[`items/${file}`]) {
              stale.push(
                `content/components/${source.id}/${component.name}/items/${file} (not exported)`,
              );
            }
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
  }
  if (stale.length > 0) {
    for (const path of stale) {
      process.stderr.write(`stale: ${path}\n`);
    }
    process.stderr.write(
      "export-ports: the export is stale. Run `pnpm ports` and commit.\n",
    );
    process.exitCode = 1;
    return;
  }
  process.stdout.write(
    `export-ports: ${check ? "up to date" : "wrote"} (${count} entries).\n`,
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}

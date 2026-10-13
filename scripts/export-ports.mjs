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
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { toPhosphor } from "./export-labs-examples.mjs";
import { loadSources } from "./lib/content.mjs";
import {
  ICON_SETS,
  itemName,
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

/** The upstream notice appended to every exported file. */
export function licenseFooter(attribution, licenseText) {
  const body = [attribution, "", ...licenseText.trim().split("\n")]
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
  if (spec.registryDependencies?.length) {
    item.registryDependencies = spec.registryDependencies;
  }
  item.files = spec.files.map((file) => {
    const raw = readFileSync(join(dir, file.file), "utf8");
    const content = iconSet === "phosphor" ? toPhosphor(raw, ICON_MAP) : raw;
    return {
      path: `registry/${item.name}/${file.file}`,
      type: file.type,
      content: `${content.trimEnd()}\n${footer}`,
    };
  });
  if (spec.cssVars) {
    item.cssVars = spec.cssVars;
  }
  return item;
}

export function exportPort(sourceId, name, source) {
  const dir = join(PORTS, sourceId, name);
  const spec = JSON.parse(readFileSync(join(dir, "component.json"), "utf8"));
  const licenseText = readFileSync(join(PORTS, sourceId, "LICENSE"), "utf8");
  const footer = licenseFooter(source.attribution, licenseText);
  const out = {};
  const variants = [];
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
  out[spec.demo] = readFileSync(join(dir, spec.demo), "utf8");
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
      ...(spec.upstreamPath ? { path: spec.upstreamPath } : {}),
    },
    author: source.author,
    license: source.license,
    attribution: source.attribution,
    credits: [source.credit, ...(spec.credits ?? [])],
    date: lastChanged(`ports/${sourceId}/${name}`),
    ...(spec.stage ? { stage: spec.stage } : {}),
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
  const { oss } = loadSources();
  const ported = oss.filter(
    (s) => s.fetch === "in-repo" && existsSync(join(PORTS, s.id)),
  );
  const stale = [];
  let count = 0;
  for (const source of ported) {
    for (const component of source.components ?? []) {
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

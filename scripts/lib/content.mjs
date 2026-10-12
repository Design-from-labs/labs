// Reads the canonical content (docs/contract.md): sources.yaml, the citation
// registry and every content/components/<source>/<name>/ directory. Pure
// reading; validation lives in validate.mjs and outputs in publish.mjs.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { parseRegistry, REGISTRY_PATH } from "./registry.mjs";

export const ROOT = fileURLToPath(new URL("../..", import.meta.url));
export const CONTENT_DIR = "content/components";

export function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function loadSources(root = ROOT) {
  const doc = YAML.parse(readFileSync(join(root, "sources.yaml"), "utf8"));
  const first = (doc?.sources ?? []).map((s) => ({ ...s, section: "sources" }));
  const oss = (doc?.oss ?? []).map((s) => ({ ...s, section: "oss" }));
  const all = [...first, ...oss];
  return {
    version: doc?.version,
    sources: first,
    oss,
    all,
    byId: new Map(all.map((s) => [s.id, s])),
  };
}

export function loadCredits(root = ROOT) {
  const { sources } = parseRegistry(
    readFileSync(join(root, REGISTRY_PATH), "utf8"),
  );
  return new Map(sources.map((s) => [s.id, s]));
}

function dirs(path) {
  if (!existsSync(path)) {
    return [];
  }
  return readdirSync(path, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

/**
 * Every entry directory with its parsed meta and items. Problems reading a
 * file are collected (`readProblems`), never thrown, so the validator can
 * report them all at once.
 */
export function loadComponents(root = ROOT) {
  const components = [];
  for (const sourceId of dirs(join(root, CONTENT_DIR))) {
    for (const name of dirs(join(root, CONTENT_DIR, sourceId))) {
      const rel = `${CONTENT_DIR}/${sourceId}/${name}`;
      const dir = join(root, rel);
      const entry = {
        sourceId,
        name,
        dir,
        rel,
        meta: null,
        items: new Map(),
        readProblems: [],
      };
      try {
        entry.meta = readJson(join(dir, "meta.json"));
      } catch (error) {
        entry.readProblems.push(`${rel}/meta.json: ${error.message}`);
      }
      const itemsDir = join(dir, "items");
      if (existsSync(itemsDir)) {
        for (const file of readdirSync(itemsDir).sort()) {
          if (!file.endsWith(".json")) {
            entry.readProblems.push(`${rel}/items/${file}: not a .json file`);
            continue;
          }
          try {
            entry.items.set(file.slice(0, -5), readJson(join(itemsDir, file)));
          } catch (error) {
            entry.readProblems.push(`${rel}/items/${file}: ${error.message}`);
          }
        }
      }
      entry.files = readdirSync(dir).filter((f) =>
        statSync(join(dir, f)).isFile(),
      );
      components.push(entry);
    }
  }
  return components;
}

export const kindOf = (meta) => meta?.kind ?? "component";

/** A variant publishes when the entry and the variant are both ready. */
export function isPublished(meta, variant) {
  return meta?.status === "ready" && variant?.status === "ready";
}

/**
 * Whether this build also shows beta entries: Vercel preview deployments
 * (`VERCEL_ENV=preview`), or `LABS_INCLUDE_BETA=1` locally. The owner reviews
 * beta components there before promoting them to ready. Production builds and
 * CI never set either, so beta stays unpublished (decision 0005).
 */
export function includeBeta(env = process.env) {
  return env.LABS_INCLUDE_BETA === "1" || env.VERCEL_ENV === "preview";
}

const SHOWN = new Set(["ready", "beta"]);

/** Published, or beta on a build that shows beta entries. */
export function isShown(meta, variant, beta = includeBeta()) {
  if (isPublished(meta, variant)) {
    return true;
  }
  return beta && SHOWN.has(meta?.status) && SHOWN.has(variant?.status);
}

export function publishedVariants(meta) {
  return (meta?.variants ?? []).filter((v) => isPublished(meta, v));
}

/** The demo file for a variant: variant name, then primitive, then "*". */
export function demoFor(meta, variant) {
  const demo = meta?.demo;
  if (!demo) {
    return null;
  }
  if (typeof demo === "string") {
    return demo;
  }
  return demo[variant.name] ?? demo[variant.primitive] ?? demo["*"] ?? null;
}

export function loadProjects(root = ROOT) {
  const dir = join(root, "content", "projects");
  if (!existsSync(dir)) {
    return [];
  }
  return readdirSync(dir)
    .filter((f) => f.endsWith(".yaml"))
    .sort()
    .map((f) => ({
      file: `content/projects/${f}`,
      ...YAML.parse(readFileSync(join(dir, f), "utf8")),
    }));
}

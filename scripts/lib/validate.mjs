// Validates the canonical content against docs/contract.md. Returns
// `{ errors, warnings }` as `path: message` strings; never throws for bad
// content.
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import AjvDraft7 from "ajv";
import Ajv2020 from "ajv/dist/2020.js";
import { registryItemSchema } from "shadcn/schema";
import { demoFor, isPublished, kindOf, ROOT } from "./content.mjs";
import {
  DIMENSION_IMPORTS,
  ICON_ORDER,
  ICON_SETS,
  itemName,
  NAMESPACE,
  PRIMITIVES,
  packageName,
  SHADCN_ITEM_SCHEMA,
} from "./naming.mjs";

const PREVIEW_MAX_BYTES = 200 * 1024;
const KIND_TYPES = {
  component: ["registry:ui", "registry:block"],
  theme: ["registry:theme"],
  font: ["registry:font"],
  base: ["registry:base"],
  hook: ["registry:hook"],
  lib: ["registry:lib"],
};
/** shadcn's shared tokens: only theme and base items may define these. */
export const SHARED_TOKENS = new Set([
  "radius",
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "destructive",
  "destructive-foreground",
  "border",
  "input",
  "ring",
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
  "sidebar",
  "sidebar-foreground",
  "sidebar-primary",
  "sidebar-primary-foreground",
  "sidebar-accent",
  "sidebar-accent-foreground",
  "sidebar-border",
  "sidebar-ring",
]);
const ALWAYS_ALLOWED_IMPORTS = [
  /^react$/,
  /^react\/jsx-runtime$/,
  /^react-dom(\/.*)?$/,
];
const IMPORT_RE =
  /(?:^|\n)\s*(?:import|export)\s+(?:type\s+)?(?:[^'"`;]*?\s+from\s+)?["']([^"']+)["']/g;
const DYNAMIC_IMPORT_RE = /import\(\s*["']([^"']+)["']\s*\)/g;

let compiled;
function validators(root) {
  if (compiled) {
    return compiled;
  }
  const meta = JSON.parse(
    readFileSync(join(root, "schemas/meta.schema.json"), "utf8"),
  );
  const vendored = JSON.parse(
    readFileSync(
      join(root, "schemas/vendor/shadcn-registry-item.schema.json"),
      "utf8",
    ),
  );
  delete vendored.$schema;
  vendored.$id = SHADCN_ITEM_SCHEMA;
  const overlay = JSON.parse(
    readFileSync(join(root, "schemas/labs-registry-item.schema.json"), "utf8"),
  );
  delete overlay.$schema;
  const ajv2020 = new Ajv2020({ allErrors: true, strict: false });
  const ajv7 = new AjvDraft7({ allErrors: true, strict: false });
  ajv7.addSchema(vendored);
  compiled = { meta: ajv2020.compile(meta), item: ajv7.compile(overlay) };
  return compiled;
}

function ajvErrors(validate, where) {
  return (validate.errors ?? []).map(
    (e) => `${where}: ${e.instancePath || "(root)"} ${e.message}`,
  );
}

export function importsOf(content) {
  const found = new Set();
  for (const re of [IMPORT_RE, DYNAMIC_IMPORT_RE]) {
    for (const match of content.matchAll(re)) {
      found.add(match[1]);
    }
  }
  return [...found];
}

/** Lines importing from an icon library, and the local names they bind. */
function iconNormalized(content) {
  let out = content;
  const names = [];
  const re =
    /import\s*\{([^}]*)\}\s*from\s*["'](lucide-react|@phosphor-icons\/react(?:\/ssr)?)["'];?\n?/g;
  for (const match of content.matchAll(re)) {
    for (const part of match[1].split(",")) {
      const local = part
        .trim()
        .split(/\s+as\s+/)
        .pop()
        ?.trim();
      if (local) {
        names.push(local);
      }
    }
  }
  out = out.replace(re, "");
  for (const name of names) {
    out = out.replace(new RegExp(`\\b${name}\\b`, "g"), "__ICON__");
  }
  return out;
}

function checkCssVars(item, entryName, kind, where, errors) {
  const vars = item.cssVars;
  if (!vars) {
    return;
  }
  if (!(vars.light && vars.dark)) {
    errors.push(`${where}: cssVars must define both light and dark`);
  }
  if (kind === "theme" || kind === "base") {
    return;
  }
  // As shadcn does it: a component never redefines a shared token; it may
  // only add variables prefixed with its own name (like --sidebar-*).
  for (const mode of ["light", "dark"]) {
    for (const key of Object.keys(vars[mode] ?? {})) {
      if (SHARED_TOKENS.has(key)) {
        errors.push(
          `${where}: cssVars.${mode}.${key} redefines a shared token; only theme and base items may`,
        );
      } else if (!(key === entryName || key.startsWith(`${entryName}-`))) {
        errors.push(
          `${where}: cssVars.${mode}.${key} must be prefixed with the component name (${entryName}-)`,
        );
      }
    }
  }
  const themeKey = new RegExp(`^[a-z]+-${entryName}(-[a-z0-9-]+)?$`);
  for (const key of Object.keys(vars.theme ?? {})) {
    if (!themeKey.test(key)) {
      errors.push(
        `${where}: cssVars.theme.${key} must be <namespace>-${entryName}[-...], e.g. color-${entryName}-...`,
      );
    }
  }
}

/**
 * Environment reads in item files (decision 0018). Only `process.env.NODE_ENV`
 * is allowed: every bundler inlines it at build time, so a development-only
 * tool can default to off in production. Any other `process.env.*`, a
 * computed `process.env[...]`, a bare `process.env`, or `import.meta.env` is
 * app-specific configuration and is refused.
 */
export function envProblems(content) {
  const problems = [];
  const code = content
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
  for (const match of code.matchAll(
    /\bprocess\.env\b(\s*\.\s*([A-Za-z_$][\w$]*))?/g,
  )) {
    if (match[2] !== "NODE_ENV") {
      problems.push(
        match[2]
          ? `process.env.${match[2]}`
          : "process.env (other than .NODE_ENV)",
      );
    }
  }
  if (/\bimport\.meta\.env\b/.test(code)) {
    problems.push("import.meta.env");
  }
  return problems;
}

function checkImports(item, variant, where, errors, warnings) {
  const deps = new Set((item.dependencies ?? []).map(packageName));
  const regDeps = item.registryDependencies ?? [];
  const ownFiles = new Set(
    (item.files ?? []).map((f) =>
      f.path
        .split("/")
        .pop()
        .replace(/\.(tsx?|css)$/, ""),
    ),
  );
  const primitive = PRIMITIVES[variant.primitive] ?? PRIMITIVES.none;
  const icons = ICON_SETS[variant.iconSet] ?? ICON_SETS.none;
  let usesPrimitive = false;
  let usesIcons = false;
  for (const file of item.files ?? []) {
    const fileWhere = `${where} ${file.path}`;
    for (const problem of envProblems(file.content ?? "")) {
      errors.push(
        `${fileWhere}: reads ${problem}; item files may only read process.env.NODE_ENV (decision 0018)`,
      );
    }
    for (const spec of importsOf(file.content ?? "")) {
      if (/^@radix-ui\/react-/.test(spec)) {
        errors.push(
          `${fileWhere}: import "radix-ui" (the unified package), not ${spec}`,
        );
        continue;
      }
      if (DIMENSION_IMPORTS.some((re) => re.test(spec))) {
        const own = [...primitive.imports, ...icons.imports].some((re) =>
          re.test(spec),
        );
        if (!own) {
          errors.push(
            `${fileWhere}: imports ${spec}, which does not match primitive "${variant.primitive}" and icon set "${variant.iconSet}"`,
          );
          continue;
        }
        if (primitive.imports.some((re) => re.test(spec))) {
          usesPrimitive = true;
        }
        if (icons.imports.some((re) => re.test(spec))) {
          usesIcons = true;
        }
      }
      if (ALWAYS_ALLOWED_IMPORTS.some((re) => re.test(spec))) {
        continue;
      }
      if (spec.startsWith("./") || spec.startsWith("../")) {
        continue;
      }
      if (spec === "@/lib/utils") {
        if (!regDeps.includes("utils")) {
          errors.push(
            `${fileWhere}: imports @/lib/utils without "utils" in registryDependencies`,
          );
        }
        continue;
      }
      const alias =
        /^@\/(components\/ui|components|hooks|lib)\/([a-z0-9-]+)$/.exec(spec);
      if (alias) {
        if (!ownFiles.has(alias[2]) && regDeps.length === 0) {
          errors.push(
            `${fileWhere}: imports ${spec} but has no registryDependencies`,
          );
        }
        continue;
      }
      if (spec.startsWith("@/")) {
        errors.push(
          `${fileWhere}: alias ${spec} is not allowed (docs/contract.md, section 2)`,
        );
        continue;
      }
      const pkg = packageName(
        spec
          .split("/")
          .slice(0, spec.startsWith("@") ? 2 : 1)
          .join("/"),
      );
      if (!deps.has(pkg)) {
        errors.push(
          `${fileWhere}: imports ${spec} but ${pkg} is not in dependencies`,
        );
      }
    }
  }
  const hasFiles = (item.files ?? []).length > 0;
  if (hasFiles && variant.primitive !== "none" && !usesPrimitive) {
    warnings.push(
      `${where}: primitive "${variant.primitive}" but no import from ${primitive.package}`,
    );
  }
  if (hasFiles && variant.iconSet !== "none" && !usesIcons) {
    errors.push(
      `${where}: icon set "${variant.iconSet}" but no import from ${icons.package}`,
    );
  }
  if (variant.primitive !== "none" && !deps.has(primitive.package)) {
    errors.push(`${where}: dependencies must list ${primitive.package}`);
  }
  if (variant.iconSet !== "none" && !deps.has(icons.package)) {
    errors.push(`${where}: dependencies must list ${icons.package}`);
  }
}

function checkPreview(entry, meta, errors) {
  if (!meta.preview) {
    return;
  }
  const path = join(entry.dir, meta.preview);
  if (!existsSync(path)) {
    errors.push(
      `${entry.rel}/${meta.preview}: preview missing (run pnpm previews)`,
    );
    return;
  }
  const size = statSync(path).size;
  if (size > PREVIEW_MAX_BYTES) {
    errors.push(
      `${entry.rel}/${meta.preview}: ${Math.round(size / 1024)} KB; the limit is 200 KB`,
    );
  }
}

/**
 * @param components loadComponents() output
 * @param sources loadSources() output
 * @param credits loadCredits() output (Map)
 */
export function validateContent(
  components,
  sources,
  credits,
  { root = ROOT, previews = true } = {},
) {
  const errors = [];
  const warnings = [];
  const v = validators(root);
  const componentOwners = new Map();
  const itemOwners = new Map();
  const allItemNames = new Set(components.flatMap((c) => [...c.items.keys()]));

  for (const entry of components) {
    errors.push(...entry.readProblems);
    const { meta, rel } = entry;
    if (!meta) {
      continue;
    }
    if (!v.meta(meta)) {
      errors.push(...ajvErrors(v.meta, `${rel}/meta.json`));
      continue;
    }
    const kind = kindOf(meta);
    if (meta.name !== entry.name) {
      errors.push(
        `${rel}/meta.json: name "${meta.name}" must equal the directory name`,
      );
    }
    const source = sources.byId.get(entry.sourceId);
    if (!source) {
      errors.push(`${rel}: source "${entry.sourceId}" is not in sources.yaml`);
    } else if (source.status !== "active") {
      errors.push(`${rel}: source "${entry.sourceId}" is not active`);
    }
    if (componentOwners.has(meta.name)) {
      errors.push(
        `${rel}: name "${meta.name}" already used by ${componentOwners.get(meta.name)}`,
      );
    }
    componentOwners.set(meta.name, rel);
    for (const id of meta.credits) {
      if (!credits.has(id)) {
        errors.push(
          `${rel}/meta.json: credit ${id} is not in docs/sources/registry.yaml`,
        );
      }
    }

    const names = meta.variants.map((x) => x.name);
    if (!names.includes(meta.defaultVariant)) {
      errors.push(
        `${rel}/meta.json: defaultVariant ${meta.defaultVariant} is not a variant`,
      );
    } else if (
      meta.status === "ready" &&
      !isPublished(
        meta,
        meta.variants.find((x) => x.name === meta.defaultVariant),
      )
    ) {
      errors.push(
        `${rel}/meta.json: defaultVariant of a ready entry must itself be ready`,
      );
    }
    for (const item of entry.items.keys()) {
      if (!names.includes(item)) {
        errors.push(
          `${rel}/items/${item}.json: not declared in meta.json variants`,
        );
      }
    }

    // Both icon sets for every (style, primitive) that renders icons.
    const groups = new Map();
    for (const variant of meta.variants) {
      const key = `${variant.style ?? ""}|${variant.primitive}`;
      groups.set(key, [...(groups.get(key) ?? []), variant]);
    }
    for (const [key, group] of groups) {
      const sets = group.map((x) => x.iconSet);
      if (sets.includes("none") && sets.length > 1) {
        errors.push(
          `${rel}/meta.json: (${key}) mixes icon-free and icon variants`,
        );
      }
      if (!sets.includes("none")) {
        for (const set of ICON_ORDER) {
          if (!sets.includes(set)) {
            errors.push(
              `${rel}/meta.json: (${key}) has no ${set} variant; icon components ship both icon sets`,
            );
          }
        }
      }
      // A pair must differ only in its icon imports.
      const [a, b] = ICON_ORDER.map((set) =>
        entry.items.get(group.find((x) => x.iconSet === set)?.name),
      );
      if (a?.files && b?.files) {
        const left = a.files.map((f) => iconNormalized(f.content)).join("\n");
        const right = b.files.map((f) => iconNormalized(f.content)).join("\n");
        if (left !== right) {
          warnings.push(
            `${rel}: (${key}) the lucide and phosphor items differ beyond their icon imports`,
          );
        }
      }
    }

    for (const variant of meta.variants) {
      const where = `${rel}/items/${variant.name}.json`;
      const expected = itemName({
        component: meta.name,
        style: variant.style,
        primitive: variant.primitive,
        iconSet: variant.iconSet,
      });
      if (variant.name !== expected) {
        errors.push(
          `${rel}/meta.json: variant ${variant.name} should be named ${expected}`,
        );
      }
      if (itemOwners.has(variant.name)) {
        errors.push(
          `${where}: item name already used by ${itemOwners.get(variant.name)}`,
        );
      }
      itemOwners.set(variant.name, rel);
      const item = entry.items.get(variant.name);
      if (!item) {
        errors.push(`${where}: missing`);
        continue;
      }
      if (item.name !== variant.name) {
        errors.push(`${where}: name "${item.name}" must be "${variant.name}"`);
      }
      const zod = registryItemSchema.safeParse(item);
      if (!zod.success) {
        for (const issue of zod.error.issues) {
          errors.push(
            `${where}: shadcn schema: ${issue.path.join(".") || "(root)"} ${issue.message}`,
          );
        }
      }
      if (!v.item(item)) {
        errors.push(...ajvErrors(v.item, where));
      }
      if (!KIND_TYPES[kind].includes(item.type)) {
        errors.push(
          `${where}: type ${item.type} does not match kind "${kind}"`,
        );
      }
      checkCssVars(item, meta.name, kind, where, errors);
      checkImports(item, variant, where, errors, warnings);
      for (const dep of item.registryDependencies ?? []) {
        if (
          dep.startsWith(`${NAMESPACE}/`) &&
          !allItemNames.has(dep.slice(NAMESPACE.length + 1))
        ) {
          errors.push(
            `${where}: registry dependency ${dep} does not exist here`,
          );
        } else if (dep.startsWith("http") && !dep.startsWith("https://")) {
          errors.push(`${where}: registry dependency ${dep} must be https`);
        }
      }
      if (kind === "component") {
        const demo = demoFor(meta, variant);
        if (!demo) {
          errors.push(`${rel}/meta.json: no demo resolves for ${variant.name}`);
        } else if (!existsSync(join(entry.dir, demo))) {
          errors.push(`${rel}/${demo}: demo file missing`);
        } else {
          const demoImports = importsOf(
            readFileSync(join(entry.dir, demo), "utf8"),
          );
          const keyed =
            typeof meta.demo === "object" && meta.demo[variant.name] === demo;
          if (
            !keyed &&
            demoImports.some((s) =>
              [...ICON_SETS.lucide.imports, ...ICON_SETS.phosphor.imports].some(
                (re) => re.test(s),
              ),
            )
          ) {
            errors.push(
              `${rel}/${demo}: a shared demo must not import an icon library; key it by variant`,
            );
          }
        }
      }
    }
    // Previews are required once an entry is ready to publish; a scanner
    // import or a draft may arrive without one.
    if (previews && meta.status === "ready") {
      checkPreview(entry, meta, errors);
    } else if (meta.preview && !existsSync(join(entry.dir, meta.preview))) {
      warnings.push(
        `${rel}/${meta.preview}: preview missing (required before ready)`,
      );
    }
  }
  return { errors, warnings };
}

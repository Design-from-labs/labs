// Shared names and conventions (docs/contract.md). Plain ESM with no
// dependencies so the site, the scripts, the CLI tests and the package build
// all agree on one definition.

export const SITE_URL = (
  process.env.LABS_SITE_URL || "https://labs.designfrom.com"
).replace(/\/$/, "");
export const NAMESPACE = "@designfrom";
export const NPM_LIBRARY = "@designfrom/react";
export const CLI_NAME = "designfrom";
export const LABS_AUTHOR = "Design From Labs <https://labs.designfrom.com>";
export const SHADCN_ITEM_SCHEMA =
  "https://ui.shadcn.com/schema/registry-item.json";
export const SHADCN_REGISTRY_SCHEMA =
  "https://ui.shadcn.com/schema/registry.json";

export const PRIMITIVES = {
  radix: { label: "Radix", package: "radix-ui", imports: [/^radix-ui$/] },
  base: {
    label: "Base UI",
    package: "@base-ui/react",
    imports: [/^@base-ui\/react(\/[a-z0-9-]+)?$/],
  },
  aria: {
    label: "React Aria",
    package: "react-aria-components",
    imports: [/^react-aria-components$/],
  },
  none: { label: "None", package: null, imports: [] },
};
export const PRIMITIVE_ORDER = ["radix", "base", "aria"];

export const ICON_SETS = {
  lucide: {
    label: "Lucide",
    package: "lucide-react",
    imports: [/^lucide-react$/],
  },
  phosphor: {
    label: "Phosphor",
    package: "@phosphor-icons/react",
    imports: [/^@phosphor-icons\/react(\/ssr)?$/],
  },
  none: { label: "None", package: null, imports: [] },
};
export const ICON_ORDER = ["lucide", "phosphor"];

/** Every package that marks an item as primitive- or icon-specific. */
export const DIMENSION_IMPORTS = [
  ...Object.values(PRIMITIVES).flatMap((p) => p.imports),
  ...Object.values(ICON_SETS).flatMap((i) => i.imports),
];

/** `<component>[-<style>][-<primitive>][-<iconset>]` */
export function itemName({ component, style, primitive, iconSet }) {
  return [
    component,
    style || null,
    primitive && primitive !== "none" ? primitive : null,
    iconSet && iconSet !== "none" ? iconSet : null,
  ]
    .filter(Boolean)
    .join("-");
}

/** The npm package name of a dependency spec (`lucide-react@^1` -> `lucide-react`). */
export function packageName(spec) {
  const at = spec.indexOf("@", spec.startsWith("@") ? 1 : 0);
  return at === -1 ? spec : spec.slice(0, at);
}

export const itemUrl = (name, site = SITE_URL) => `${site}/r/${name}.json`;
export const pageUrl = (component, site = SITE_URL) =>
  `${site}/ui/${component}`;

/** The npm subpath of a variant (decision 0009). */
export function npmSubpath({ component, style, primitive, iconSet }) {
  const base = [
    primitive && primitive !== "none" ? primitive : null,
    style ? `${component}-${style}` : component,
  ]
    .filter(Boolean)
    .join("/");
  return iconSet === "phosphor" ? `${base}/phosphor` : base;
}

export function shadcnCommand(name, site = SITE_URL) {
  return `npx shadcn@latest add ${itemUrl(name, site)}`;
}

export function namespaceCommand(name) {
  return `npx shadcn@latest add ${NAMESPACE}/${name}`;
}

export function cliCommand({ component, style, primitive, iconSet }) {
  const parts = [`npx ${CLI_NAME} add ${component}`];
  if (primitive && primitive !== "none" && primitive !== "radix") {
    parts.push(`--primitive ${primitive}`);
  }
  if (iconSet === "phosphor") {
    parts.push("--icons phosphor");
  }
  if (style) {
    parts.push(`--style ${style}`);
  }
  return parts.join(" ");
}

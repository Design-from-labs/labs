// Typed access to .generated/site-data.json (scripts/prepare-content.mjs).
import raw from "../../.generated/site-data.json";
import type { StageMeta } from "./stage";
import type { LoopMeta, TileMeta } from "./tile";

export interface Credit {
  id: string;
  title: string;
  author: string;
  license: string;
  url: string | null;
  kind?: string;
}

export interface VariantFile {
  path: string;
  target: string;
  type: string;
  content: string;
}

export interface Commands {
  shadcn: string;
  namespace: string;
  cli?: string;
  npm?: string;
  importPath?: string;
  importLine?: string;
}

export interface Variant {
  name: string;
  primitive: "radix" | "base" | "aria" | "none";
  iconSet: "lucide" | "phosphor" | "none";
  style: string | null;
  label: string | null;
  status: string;
  published: boolean;
  demo?: string | null;
  commands?: Commands;
  exports?: string[];
  type?: string;
  dependencies?: string[];
  registryDependencies?: string[];
  docs?: string;
  files?: VariantFile[];
  font?: { family: string; variable: string; dependency?: string } | null;
  config?: Record<string, unknown> | null;
}

export interface Prop {
  name: string;
  type: string;
  default?: string;
  required?: boolean;
  description: string;
}

export interface Entry {
  name: string;
  sourceId: string;
  /** "beta" only on preview builds (scripts/lib/content.mjs, includeBeta). */
  status: "ready" | "beta";
  kind: "component" | "theme" | "font" | "base" | "hook" | "lib";
  title: string;
  description: string;
  category: string;
  label: string | null;
  tags: string[];
  author: string;
  license: string;
  attribution: string | null;
  source: { repo: string; commit: string; path?: string };
  date: string;
  props: Prop[];
  a11y: string[];
  usage: string | null;
  /** A layout part shown in a device frame and app shell (contract rev. 3). */
  stage: StageMeta | null;
  /** The tile on the /ui specimen wall (contract rev. 4). */
  tile: TileMeta | null;
  /** The tile's scripted loop (contract rev. 4). */
  loop: LoopMeta | null;
  preview: string | null;
  credits: Credit[];
  defaultVariant: string;
  dimensions: {
    styles: { value: string | null; label: string }[];
    primitives: string[];
    iconSets: string[];
  };
  variants: Variant[];
}

export interface Project {
  file: string;
  name: string;
  kind: "product" | "experiment";
  status: "active" | "past";
  summary: string;
  href?: string;
  started?: string;
  ended?: string;
  tags?: string[];
}

export interface SiteData {
  site: { url: string; npm: string; cli: string; namespace: string };
  labels: {
    primitives: Record<string, string>;
    iconSets: Record<string, string>;
  };
  entries: Entry[];
  credits: Credit[];
  projects: Project[];
}

export const data = raw as unknown as SiteData;
export const entries = data.entries;
export const components = entries.filter((e) => e.kind === "component");
export const foundations = entries.filter((e) => e.kind !== "component");

export const published = (entry: Entry) =>
  entry.variants.filter((v) => v.published);

export const defaultVariant = (entry: Entry) =>
  entry.variants.find((v) => v.name === entry.defaultVariant && v.published) ??
  published(entry)[0];

export const KIND_LABELS: Record<Entry["kind"], string> = {
  component: "Component",
  theme: "Theme",
  font: "Font",
  base: "Base",
  hook: "Hook",
  lib: "Utility",
};

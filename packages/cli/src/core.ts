import { parseArgs } from "node:util";

// Pure logic for the designfrom CLI. Nothing here touches the process, the
// filesystem, or the network unless a fetch implementation is passed in.

export const DEFAULT_REGISTRY_URL = "https://labs.designfrom.com";
export const PRIMITIVES = ["radix", "base", "aria"] as const;
export const ICON_SETS = ["lucide", "phosphor"] as const;
export const DEFAULT_PRIMITIVE: Primitive = "radix";
export const DEFAULT_ICONS: IconSet = "lucide";
export const DEFAULT_STYLE = "default";

export type Primitive = (typeof PRIMITIVES)[number];
export type IconSet = (typeof ICON_SETS)[number];

export interface RegistryMeta {
  component: string;
  kind: string;
  primitive: string;
  iconSet: string;
  style?: string;
  status?: string;
}

export interface RegistryItem {
  name: string;
  type?: string;
  title?: string;
  description?: string;
  meta: RegistryMeta;
}

export interface Wanted {
  primitive: Primitive;
  icons: IconSet;
  style?: string;
}

export type Command =
  | { kind: "help" }
  | { kind: "version" }
  | {
      kind: "add";
      components: string[];
      wanted: Wanted;
      registry: string;
      dryRun: boolean;
      extra: string[];
    }
  | { kind: "list"; json: boolean; registry: string };

export interface ComponentSummary {
  component: string;
  title: string;
  description: string;
  kind: string;
  primitives: string[];
  iconSets: string[];
  styles: string[];
  items: string[];
}

/** An expected failure: print the message, optionally the usage, and exit. */
export class CliError extends Error {
  readonly showUsage: boolean;
  readonly exitCode: number;

  constructor(message: string, options: { showUsage?: boolean } = {}) {
    super(message);
    this.name = "CliError";
    this.showUsage = options.showUsage ?? false;
    this.exitCode = 1;
  }
}

export const USAGE = `designfrom: add Design From Labs components with the shadcn CLI

Usage:
  designfrom add <component...> [options] [-- <extra shadcn args>]
  designfrom list [--json] [--registry <url>]
  designfrom --help
  designfrom --version

Options for add:
  --primitive <radix|base|aria>   Headless primitive library (default: radix)
  --icons <lucide|phosphor>       Icon set (default: lucide)
  --style <style>                 Component style, for example subtle
  --registry <url>                Registry base URL (default: ${DEFAULT_REGISTRY_URL})
  --dry-run                       Print the shadcn command instead of running it

Environment:
  DESIGNFROM_REGISTRY_URL         Registry base URL, overridden by --registry

Examples:
  npx designfrom add button
  npx designfrom add button --primitive aria --icons phosphor
  npx designfrom add badge --style subtle
  npx designfrom list
`;

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

/** Remove trailing slashes so URLs can be joined with "/r/...". */
export function normalizeRegistryUrl(url: string): string {
  const trimmed = url.trim().replace(/\/+$/, "");
  if (!/^https?:\/\/[^/\s]+/i.test(trimmed)) {
    throw new CliError(
      `Invalid registry URL "${url}". Use an http or https URL.`,
      { showUsage: true },
    );
  }
  return trimmed;
}

function oneOf<T extends string>(
  flag: string,
  value: string | undefined,
  allowed: readonly T[],
  fallback: T,
): T {
  if (value === undefined) return fallback;
  const match = allowed.find((candidate) => candidate === value);
  if (!match) {
    throw new CliError(
      `Invalid value "${value}" for ${flag}. Expected one of: ${allowed.join(", ")}.`,
      { showUsage: true },
    );
  }
  return match;
}

function resolveRegistry(
  flag: string | undefined,
  env: Record<string, string | undefined>,
): string {
  return normalizeRegistryUrl(
    flag ?? env.DESIGNFROM_REGISTRY_URL ?? DEFAULT_REGISTRY_URL,
  );
}

/** Wrap node:util parseArgs so bad flags become CliErrors. */
function parseFlags<T extends Parameters<typeof parseArgs>[0]>(options: T) {
  try {
    return parseArgs({ ...options, strict: true, allowPositionals: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new CliError(message.split("\n")[0] ?? message, { showUsage: true });
  }
}

/** Turn argv (without node and script) into a typed command. */
export function parseCli(
  argv: string[],
  env: Record<string, string | undefined> = {},
): Command {
  // Everything after a bare "--" belongs to shadcn, not to this CLI.
  const separator = argv.indexOf("--");
  const own = separator === -1 ? argv : argv.slice(0, separator);
  const extra = separator === -1 ? [] : argv.slice(separator + 1);

  if (own.length === 0) return { kind: "help" };
  if (own.includes("--help") || own.includes("-h")) return { kind: "help" };
  if (own.includes("--version") || own.includes("-v")) {
    return { kind: "version" };
  }

  const [command, ...rest] = own;
  if (command === "add") return parseAdd(rest, extra, env);
  if (command === "list") return parseList(rest, env);
  throw new CliError(`Unknown command "${command}".`, { showUsage: true });
}

function parseAdd(
  args: string[],
  extra: string[],
  env: Record<string, string | undefined>,
): Command {
  const { values, positionals } = parseFlags({
    args,
    options: {
      primitive: { type: "string" },
      icons: { type: "string" },
      style: { type: "string" },
      registry: { type: "string" },
      "dry-run": { type: "boolean" },
    },
  });
  if (positionals.length === 0) {
    throw new CliError("Missing component name. Try: designfrom add button", {
      showUsage: true,
    });
  }
  const style = values.style as string | undefined;
  if (style !== undefined && style.trim() === "") {
    throw new CliError("The --style flag needs a value.", { showUsage: true });
  }
  return {
    kind: "add",
    components: positionals,
    wanted: {
      primitive: oneOf(
        "--primitive",
        values.primitive as string | undefined,
        PRIMITIVES,
        DEFAULT_PRIMITIVE,
      ),
      icons: oneOf(
        "--icons",
        values.icons as string | undefined,
        ICON_SETS,
        DEFAULT_ICONS,
      ),
      style,
    },
    registry: resolveRegistry(values.registry as string | undefined, env),
    dryRun: values["dry-run"] === true,
    extra,
  };
}

function parseList(
  args: string[],
  env: Record<string, string | undefined>,
): Command {
  const { values, positionals } = parseFlags({
    args,
    options: {
      json: { type: "boolean" },
      registry: { type: "string" },
    },
  });
  if (positionals.length > 0) {
    throw new CliError(`Unexpected argument "${positionals[0]}" for list.`, {
      showUsage: true,
    });
  }
  return {
    kind: "list",
    json: values.json === true,
    registry: resolveRegistry(values.registry as string | undefined, env),
  };
}

// ---------------------------------------------------------------------------
// Registry access
// ---------------------------------------------------------------------------

export function indexUrl(base: string): string {
  return `${base}/r/registry.json`;
}

export function itemUrl(base: string, name: string): string {
  return `${base}/r/${name}.json`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Keep only well-formed index entries and normalize their meta. */
export function parseRegistry(data: unknown): RegistryItem[] {
  if (!isRecord(data) || !Array.isArray(data.items)) {
    throw new Error("missing an items array");
  }
  const items: RegistryItem[] = [];
  for (const raw of data.items) {
    if (!isRecord(raw) || typeof raw.name !== "string") continue;
    const meta = isRecord(raw.meta) ? raw.meta : {};
    const str = (value: unknown, fallback: string) =>
      typeof value === "string" ? value : fallback;
    items.push({
      name: raw.name,
      type: typeof raw.type === "string" ? raw.type : undefined,
      title: typeof raw.title === "string" ? raw.title : undefined,
      description:
        typeof raw.description === "string" ? raw.description : undefined,
      meta: {
        component: str(meta.component, raw.name),
        kind: str(meta.kind, "component"),
        primitive: str(meta.primitive, "none"),
        iconSet: str(meta.iconSet, "none"),
        style: typeof meta.style === "string" ? meta.style : undefined,
        status: typeof meta.status === "string" ? meta.status : undefined,
      },
    });
  }
  return items;
}

/** Fetch and parse the registry index, with errors that name the URL. */
export async function fetchRegistryIndex(
  base: string,
  fetchImpl: typeof fetch = fetch,
): Promise<RegistryItem[]> {
  const url = indexUrl(base);
  let response: Response;
  try {
    response = await fetchImpl(url, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    throw new CliError(
      `Could not reach the registry at ${url}: ${describeNetworkError(error)}. ` +
        "Check your connection or the --registry URL.",
    );
  }
  if (!response.ok) {
    throw new CliError(
      `The registry at ${url} responded with HTTP ${response.status}.`,
    );
  }
  try {
    return parseRegistry(await response.json());
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new CliError(
      `The registry at ${url} did not return a valid index (${reason}).`,
    );
  }
}

function describeNetworkError(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const cause = error.cause;
  if (isRecord(cause) && typeof cause.code === "string") return cause.code;
  if (error.name === "TimeoutError") return "request timed out";
  return error.message;
}

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

function styleOf(item: RegistryItem): string {
  return item.meta.style ?? DEFAULT_STYLE;
}

/** Short label for a variant, for example "radix+lucide" or "subtle+phosphor". */
function comboLabel(
  item: RegistryItem,
  axes: { primitive: boolean; icons: boolean; style: boolean },
): string {
  const parts: string[] = [];
  if (axes.style) parts.push(styleOf(item));
  if (axes.primitive) parts.push(item.meta.primitive);
  if (axes.icons) parts.push(item.meta.iconSet);
  return parts.length > 0 ? parts.join("+") : item.name;
}

/** Find the registry item for one requested component name. */
export function resolveComponent(
  items: RegistryItem[],
  query: string,
  wanted: Wanted,
): RegistryItem {
  // A full item name such as "button-radix-lucide" bypasses resolution,
  // unless it is also the component's name (an icon-free default item named
  // like its component), which resolves by style like any component.
  const exact = items.find(
    (item) => item.name === query && item.meta.component !== query,
  );
  if (exact) return exact;

  const candidates = items.filter((item) => item.meta.component === query);
  if (candidates.length === 0) {
    const names = [...new Set(items.map((item) => item.meta.component))];
    throw new CliError(
      `Unknown component "${query}". Available components: ${names.join(", ")}.`,
    );
  }

  // Ignore a flag when the requested style has nothing to choose along that
  // axis (a style may draw its own glyphs while another uses an icon set).
  const style = wanted.style ?? DEFAULT_STYLE;
  const inStyle = candidates.filter((item) => styleOf(item) === style);
  const pool = inStyle.length > 0 ? inStyle : candidates;
  const axes = {
    primitive: pool.some((item) => item.meta.primitive !== "none"),
    icons: pool.some((item) => item.meta.iconSet !== "none"),
    style: candidates.some((item) => item.meta.style !== undefined),
  };
  const match = candidates.find(
    (item) =>
      (!axes.primitive || item.meta.primitive === wanted.primitive) &&
      (!axes.icons || item.meta.iconSet === wanted.icons) &&
      styleOf(item) === style,
  );
  if (match) return match;

  const requested: string[] = [];
  if (axes.primitive) requested.push(`primitive ${wanted.primitive}`);
  if (axes.icons) requested.push(`icons ${wanted.icons}`);
  requested.push(`style ${style}`);
  const combos = [...new Set(candidates.map((item) => comboLabel(item, axes)))];
  throw new CliError(
    `No "${query}" variant matches ${requested.join(", ")}.\n` +
      `Available combinations for ${query}: ${combos.join(", ")}.\n` +
      `Pass a full item name, for example ${candidates[0]?.name}, to pick one directly.`,
  );
}

// ---------------------------------------------------------------------------
// Running shadcn
// ---------------------------------------------------------------------------

export interface ShadcnCommand {
  command: string;
  args: string[];
}

/** Build the npx invocation. Windows needs npx.cmd when no shell is used. */
export function buildShadcnCommand(
  urls: string[],
  extra: string[],
  platform: string = process.platform,
): ShadcnCommand {
  return {
    command: platform === "win32" ? "npx.cmd" : "npx",
    args: ["shadcn@latest", "add", ...urls, ...extra],
  };
}

/** Render a command for display, quoting anything a shell would split. */
export function formatCommand({ command, args }: ShadcnCommand): string {
  const display = command === "npx.cmd" ? "npx" : command;
  const quote = (arg: string) =>
    /^[\w@%+=:,./-]+$/.test(arg) ? arg : `'${arg.replace(/'/g, "'\\''")}'`;
  return [display, ...args].map(quote).join(" ");
}

// ---------------------------------------------------------------------------
// Listing
// ---------------------------------------------------------------------------

/** "Button (Radix, Lucide)" becomes "Button". */
function baseTitle(item: RegistryItem): string {
  const title = item.title ?? item.meta.component;
  return title.replace(/\s*\([^)]*\)\s*$/, "");
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

/** Group index items by component, in order of first appearance. */
export function summarizeComponents(items: RegistryItem[]): ComponentSummary[] {
  const groups = new Map<string, RegistryItem[]>();
  for (const item of items) {
    const group = groups.get(item.meta.component) ?? [];
    group.push(item);
    groups.set(item.meta.component, group);
  }
  return [...groups.entries()].map(([component, group]) => {
    const first = group[0] as RegistryItem;
    const hasStyles = group.some((item) => item.meta.style !== undefined);
    return {
      component,
      title: baseTitle(first),
      description: first.description ?? "",
      kind: first.meta.kind,
      primitives: unique(
        group.map((item) => item.meta.primitive).filter((v) => v !== "none"),
      ),
      iconSets: unique(
        group.map((item) => item.meta.iconSet).filter((v) => v !== "none"),
      ),
      styles: hasStyles ? unique(group.map(styleOf)) : [],
      items: group.map((item) => item.name),
    };
  });
}

function describeVariants(summary: ComponentSummary): string {
  const parts: string[] = [];
  if (summary.primitives.length > 0) {
    parts.push(`primitives: ${summary.primitives.join(", ")}`);
  }
  if (summary.iconSets.length > 0) {
    parts.push(`icons: ${summary.iconSets.join(", ")}`);
  }
  if (summary.styles.length > 0) {
    parts.push(`styles: ${summary.styles.join(", ")}`);
  }
  return parts.join(" | ");
}

function formatRows(rows: string[][]): string[] {
  const widths = rows[0]?.map((_, column) =>
    Math.max(...rows.map((row) => (row[column] ?? "").length)),
  );
  return rows.map((row) =>
    row
      .map((cell, column) => cell.padEnd(widths?.[column] ?? 0))
      .join("  ")
      .trimEnd(),
  );
}

/** Human-readable listing: components first, then foundations. */
export function formatList(summaries: ComponentSummary[]): string {
  const sorted = [...summaries].sort((a, b) =>
    a.component.localeCompare(b.component),
  );
  const components = sorted.filter((s) => s.kind === "component");
  const foundations = sorted.filter((s) => s.kind !== "component");

  const lines: string[] = ["Components"];
  lines.push(
    ...formatRows(
      components.map((s) => [
        `  ${s.component}`,
        s.title,
        describeVariants(s) || "-",
      ]),
    ),
  );
  lines.push("", "Foundations");
  lines.push(
    ...formatRows(
      foundations.map((s) => [
        `  ${s.component}`,
        s.title,
        [s.kind, describeVariants(s)].filter(Boolean).join(" | "),
      ]),
    ),
  );
  return `${lines.join("\n")}\n`;
}

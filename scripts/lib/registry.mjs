// The source registry (docs/sources/registry.yaml): a strict YAML subset read
// without dependencies, so the guards run before any install.
//
//   sources:
//     - id: S-001
//       title: "A title"
//       used-in: [docs/a.md, "#12"]
//
// Supported: `#` comment lines, one top-level `sources:` list, entries
// starting with `  - key: value`, continuation `    key: value`, values that
// are a double-quoted string (JSON escapes), a bare scalar, or an inline list
// `[a, "b"]`. Anything else is an error naming the line, so the format cannot
// drift into YAML this parser would misread.

export const REGISTRY_PATH = "docs/sources/registry.yaml";

export const KINDS = new Set([
  "ai-tool",
  "article",
  "brief",
  "dataset",
  "design-reference",
  "doc",
  "figma",
  "library",
  "model",
  "transcript",
]);
export const VISIBILITIES = new Set(["private-cited-only", "public"]);
export const SOURCE_ID = /^S-\d{3,}$/;
/** A source id anywhere in text. */
export const SOURCE_REF = /\bS-\d{3,}\b/g;

const REQUIRED = [
  "id",
  "title",
  "author",
  "kind",
  "license",
  "accessed",
  "visibility",
  "used-in",
];
const KNOWN = new Set([...REQUIRED, "url", "private-file", "package", "note"]);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ENTRY_START = /^ {2}- ([a-z][a-z-]*):(?: (.*))?$/;
const ENTRY_FIELD = /^ {4}([a-z][a-z-]*):(?: (.*))?$/;

function scalar(raw, where) {
  const value = raw.trim();
  if (value.startsWith('"')) {
    try {
      return JSON.parse(value);
    } catch {
      throw new Error(`${where}: malformed quoted string`);
    }
  }
  if (value.startsWith("'")) {
    throw new Error(`${where}: use double quotes`);
  }
  return value;
}

function splitList(inner, where) {
  const items = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < inner.length; i += 1) {
    const char = inner[i];
    if (char === '"' && inner[i - 1] !== "\\") {
      quoted = !quoted;
    }
    if (char === "," && !quoted) {
      items.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  if (quoted) {
    throw new Error(`${where}: unterminated string in list`);
  }
  items.push(current);
  return items
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => scalar(item, where));
}

function value(raw = "", where) {
  const text = raw.trim();
  if (text.startsWith("[")) {
    if (!text.endsWith("]")) {
      throw new Error(`${where}: an inline list must end on the same line`);
    }
    return splitList(text.slice(1, -1), where);
  }
  if (text === "") {
    throw new Error(`${where}: empty value`);
  }
  return scalar(text, where);
}

/** Parses the registry text into `{ sources: [...] }`. Throws on anything unexpected. */
export function parseRegistry(text, file = REGISTRY_PATH) {
  const sources = [];
  let seenHeader = false;
  let current = null;
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    const where = `${file}:${index + 1}`;
    if (line.trim() === "" || line.trimStart().startsWith("#")) {
      continue;
    }
    if (line === "sources:") {
      if (seenHeader) {
        throw new Error(`${where}: a second sources: list`);
      }
      seenHeader = true;
      continue;
    }
    if (!seenHeader) {
      throw new Error(`${where}: expected "sources:" first`);
    }
    const start = ENTRY_START.exec(line);
    const field = ENTRY_FIELD.exec(line);
    const match = start ?? field;
    if (!match) {
      throw new Error(
        `${where}: not a "key: value" line of the registry format`,
      );
    }
    if (start) {
      current = { line: index + 1 };
      sources.push(current);
    } else if (!current) {
      throw new Error(`${where}: a field before the first entry`);
    }
    const [, key, raw] = match;
    if (Object.hasOwn(current, key)) {
      throw new Error(`${where}: duplicate key ${key}`);
    }
    current[key] = value(raw, where);
  }
  return { sources };
}

/** Problems with the parsed registry, as `file:line: message`. */
export function validateRegistry({ sources }, file = REGISTRY_PATH) {
  const problems = [];
  const ids = new Set();
  for (const source of sources) {
    const where = `${file}:${source.line}`;
    for (const key of REQUIRED) {
      if (source[key] === undefined) {
        problems.push(`${where}: missing ${key}`);
      }
    }
    for (const key of Object.keys(source)) {
      if (key !== "line" && !KNOWN.has(key)) {
        problems.push(`${where}: unknown key ${key}`);
      }
    }
    if (source.id !== undefined) {
      if (!SOURCE_ID.test(source.id)) {
        problems.push(`${where}: id ${source.id} is not S-NNN`);
      } else if (ids.has(source.id)) {
        problems.push(`${where}: duplicate id ${source.id}`);
      }
      ids.add(source.id);
    }
    if (source.kind !== undefined && !KINDS.has(source.kind)) {
      problems.push(
        `${where}: kind ${source.kind} is not one of ${[...KINDS].join(", ")}`,
      );
    }
    if (
      source.visibility !== undefined &&
      !VISIBILITIES.has(source.visibility)
    ) {
      problems.push(
        `${where}: visibility must be public or private-cited-only`,
      );
    }
    const hasUrl = typeof source.url === "string";
    const hasFile = typeof source["private-file"] === "string";
    if (hasUrl === hasFile) {
      problems.push(`${where}: exactly one of url or private-file`);
    }
    if (source.visibility === "private-cited-only" && !hasFile) {
      problems.push(
        `${where}: a private-cited-only source names its private-file, not a url`,
      );
    }
    if (source.visibility === "public" && !hasUrl) {
      problems.push(`${where}: a public source needs a url`);
    }
    if (hasUrl && !/^https:\/\//.test(source.url)) {
      problems.push(`${where}: url must be https`);
    }
    if (
      source.accessed !== undefined &&
      !ISO_DATE.test(String(source.accessed))
    ) {
      problems.push(`${where}: accessed must be YYYY-MM-DD`);
    }
    if (source["used-in"] !== undefined && !Array.isArray(source["used-in"])) {
      problems.push(
        `${where}: used-in must be a list, e.g. [docs/a.md, "#12"]`,
      );
    }
    if (
      source.package !== undefined &&
      !(typeof source.note === "string" && source.note.trim())
    ) {
      problems.push(
        `${where}: a package entry needs a note explaining its license`,
      );
    }
  }
  if (sources.length === 0) {
    problems.push(`${file}: no sources`);
  }
  return problems;
}

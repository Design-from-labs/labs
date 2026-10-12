// "Cite everything we use as a resource" (docs/sources/README.md,
// docs/decisions/0004-cite-every-resource.md), enforced lightly:
//
// - the registry (docs/sources/registry.yaml) parses and every entry is
//   complete;
// - every decision record has a `- Sources:` line (ids, or `none: <reason>`);
// - every source id referenced in a tracked file exists in the registry;
// - with --pr-body, the pull request body has a `## Sources` section that
//   lists ids that exist, or says `none: <reason>`.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  parseRegistry,
  REGISTRY_PATH,
  SOURCE_REF,
  validateRegistry,
} from "./lib/registry.mjs";

const DECISION_FILE = /^docs\/decisions\/\d{4}-[^/]+\.md$/;
const DECISION_TEMPLATE = "docs/decisions/0000-template.md";
const SOURCES_LINE = /^- Sources: (.+)$/m;
const NONE_REASON = /^none: \S.{2,}$/;
const ID_LIST = /^S-\d{3,}(?:, S-\d{3,})*$/;
const HTML_COMMENT = /<!--[\s\S]*?-->/g;
const SOURCES_HEADING = /^#{2,3}\s+Sources\s*$/im;
const NEXT_HEADING = /^#{1,6}\s/m;
const BINARY_SNIFF_BYTES = 8000;
/** Files that hold example or fixture ids, not citations. */
const NOT_CITATIONS = [
  /\.test\.(?:mjs|ts)$/,
  /(?:^|\/)fixtures\//,
  /^scripts\/lib\/registry\.mjs$/,
  /^scripts\/check-sources-core\.mjs$/,
];

function git(cwd, args) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
}

/** Problems with one decision record's text. */
export function checkDecision(path, text) {
  const match = SOURCES_LINE.exec(text);
  if (!match) {
    return [`${path}: no "- Sources:" line (ids, or "none: <reason>")`];
  }
  const value = match[1].trim();
  if (!(ID_LIST.test(value) || NONE_REASON.test(value))) {
    return [`${path}: "- Sources:" must be "S-001, S-002" or "none: <reason>"`];
  }
  return [];
}

/** The ids cited in `text`, with 1-based lines. */
export function citedIds(text) {
  const found = [];
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    for (const [id] of line.matchAll(SOURCE_REF)) {
      found.push({ id, line: index + 1 });
    }
  }
  return found;
}

/** Problems with a pull request body's Sources section. */
export function checkPrBody(body, ids) {
  const text = (body ?? "").replace(HTML_COMMENT, "");
  const heading = SOURCES_HEADING.exec(text);
  if (!heading) {
    return [
      'PR body: no "## Sources" section (list registry ids, or "none: <reason>")',
    ];
  }
  const rest = text.slice(heading.index + heading[0].length);
  const next = NEXT_HEADING.exec(rest);
  const section = (next ? rest.slice(0, next.index) : rest).trim();
  const cited = [...section.matchAll(SOURCE_REF)].map(([id]) => id);
  if (cited.length === 0) {
    const plain = section.replace(/^[-*]\s+/gm, "").trim();
    return NONE_REASON.test(plain)
      ? []
      : ['PR body: the Sources section lists no ids and no "none: <reason>"'];
  }
  return cited
    .filter((id) => !ids.has(id))
    .map((id) => `PR body: ${id} is not in ${REGISTRY_PATH}`);
}

function readEventBody(env) {
  if (!env.GITHUB_EVENT_PATH) {
    throw new Error("GITHUB_EVENT_PATH is not set");
  }
  const event = JSON.parse(readFileSync(env.GITHUB_EVENT_PATH, "utf8"));
  return event?.pull_request?.body ?? "";
}

export function run({
  argv = process.argv.slice(2),
  cwd = process.cwd(),
  env = process.env,
  log = (line) => process.stdout.write(`${line}\n`),
  logError = (line) => process.stderr.write(`${line}\n`),
} = {}) {
  let prBody = null;
  let checkRepo = true;
  try {
    for (let i = 0; i < argv.length; i += 1) {
      if (argv[i] === "--pr-body") {
        prBody = readEventBody(env);
        checkRepo = false;
      } else if (argv[i] === "--pr-body-file" && argv[i + 1]) {
        i += 1;
        prBody = readFileSync(argv[i], "utf8");
        checkRepo = false;
      } else {
        throw new Error(`unknown or incomplete argument: ${argv[i]}`);
      }
    }
  } catch (error) {
    logError(`check-sources: ${error.message}`);
    return 2;
  }

  let root;
  let registry;
  const problems = [];
  try {
    root = git(cwd, ["rev-parse", "--show-toplevel"]).trim();
    registry = parseRegistry(readFileSync(join(root, REGISTRY_PATH), "utf8"));
  } catch (error) {
    logError(`check-sources: ${error.message}`);
    return 2;
  }
  problems.push(...validateRegistry(registry));
  const ids = new Set(registry.sources.map((source) => source.id));

  if (prBody !== null) {
    problems.push(...checkPrBody(prBody, ids));
  }
  let files = 0;
  if (checkRepo) {
    const tracked = git(root, ["ls-files", "-z"]).split("\0").filter(Boolean);
    for (const path of tracked) {
      if (path === REGISTRY_PATH || NOT_CITATIONS.some((re) => re.test(path))) {
        continue;
      }
      let buffer;
      try {
        buffer = readFileSync(join(root, path));
      } catch {
        continue;
      }
      if (buffer.subarray(0, BINARY_SNIFF_BYTES).includes(0)) {
        continue;
      }
      files += 1;
      const text = buffer.toString("utf8");
      if (DECISION_FILE.test(path) && path !== DECISION_TEMPLATE) {
        problems.push(...checkDecision(path, text));
      }
      for (const { id, line } of citedIds(text)) {
        if (!ids.has(id)) {
          problems.push(`${path}:${line}: ${id} is not in ${REGISTRY_PATH}`);
        }
      }
    }
  }

  if (problems.length === 0) {
    log(
      `check-sources: ok (${ids.size} sources${checkRepo ? `, ${files} files` : ", PR body"}).`,
    );
    return 0;
  }
  for (const problem of problems) {
    logError(problem);
  }
  logError(
    `check-sources: ${problems.length} problem(s). See docs/sources/README.md.`,
  );
  return 1;
}

#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

/**
 * Fails when tracked files, staged changes, a commit message, a PR title or
 * body, or commit messages in a range contain a banned pattern. The patterns
 * come from outside the repository, so the banned terms are never written
 * down anywhere in the tree:
 *
 *   EXTERNAL_REF_PATTERNS        the patterns themselves (a secret in CI)
 *   EXTERNAL_REF_PATTERNS_FILE   a file holding them; default
 *                                ~/.config/dfl/external-ref-patterns, read
 *                                only outside CI (the git hooks use it)
 *
 * Format: JavaScript regex sources separated by newlines or top-level commas.
 * Blank lines and lines starting with `#` are ignored. A line may end in
 * ` => Label`: the label is for the export scrubber (scripts/export) and is
 * ignored here. Patterns compile case-INSENSITIVE (flag `i`), so write word
 * boundaries into the source (`\bfoo\b`, `(?<![a-z0-9])foo(?![a-z])`) to keep
 * ordinary words from matching.
 *
 * Usage:
 *   node scripts/check-external-refs.mjs                 tracked files
 *   --staged                   staged paths and their staged content (pre-commit)
 *   --message-file PATH        a commit message file (commit-msg); git's comment
 *                              lines and anything below the scissors line are ignored
 *   --text LABEL=ENV_VAR       a string from the env (repeatable), e.g. a PR title
 *   --commits RANGE            commit messages in a git range (repeatable)
 *   --event-text LABEL=PATH    a string read from the GitHub event payload file
 *                              ($GITHUB_EVENT_PATH) at a dotted JSON path, e.g.
 *                              `PR title=pull_request.title`. Unlike step env, it
 *                              never appears in the Actions log.
 *   --files                    also scan tracked files when another input is given
 *   --require-patterns         fail (exit 1) instead of skipping when no patterns
 *                              are configured; CI and the git hooks use it
 *
 * Tracked file paths are tested against the patterns as well as their
 * contents.
 *
 * Output never contains the matched text or the line: only `file:line` (or
 * the label, or `commit <sha>`) and the zero-based pattern index, so the
 * terms cannot leak into CI logs. A path that itself matches a pattern is
 * never printed either: it is reported as `tracked file #N` (its zero-based
 * position in the scanned list) with the pattern index.
 * Exit codes: 0 clean or skipped, 1 findings or no usable patterns, 2 bad
 * pattern or argument. With no patterns configured the check skips and exits
 * 0 unless --require-patterns is given. A value that is set but parses to
 * zero patterns (for example `,,`) always fails, so a malformed secret
 * cannot silently turn the check off.
 */

export const PATTERNS_ENV = "EXTERNAL_REF_PATTERNS";
export const PATTERNS_FILE_ENV = "EXTERNAL_REF_PATTERNS_FILE";

/** The local patterns file: never tracked, never printed. */
export function defaultPatternsFile(env = process.env, home = homedir()) {
  const base = env.XDG_CONFIG_HOME || join(home, ".config");
  return join(base, "dfl", "external-ref-patterns");
}

/**
 * The raw patterns and where they came from: the environment first, then
 * (outside CI only) the local file. `{ raw: "", source: "none" }` when
 * neither is configured.
 */
export function loadPatterns(env = process.env, home = homedir()) {
  const fromEnv = env[PATTERNS_ENV];
  if (fromEnv?.trim()) {
    return { raw: fromEnv, source: PATTERNS_ENV };
  }
  if (env.CI === "true" || env.GITHUB_ACTIONS === "true") {
    return { raw: "", source: "none" };
  }
  const file = env[PATTERNS_FILE_ENV] || defaultPatternsFile(env, home);
  if (existsSync(file)) {
    return { raw: readFileSync(file, "utf8"), source: "file" };
  }
  return { raw: "", source: "none" };
}

/**
 * The scan root is the git top level of the directory the check is run from,
 * never the location of the script, so a copy of the script kept outside the
 * checkout (or reached through a symlink) still scans the right tree.
 */
export function repoRoot(from = process.cwd()) {
  return execFileSync("git", ["rev-parse", "--show-toplevel"], {
    cwd: from,
    encoding: "utf8",
  }).trim();
}
const BINARY_SNIFF_BYTES = 8000;
const LINE_BREAK = /\r?\n/;
const LEADING_NEWLINE = /^\n/;

// Third-party material kept verbatim: a match there is reported by a person,
// not rewritten here. Lockfiles and licences carry upstream text.
const SKIPPED_PATH = [
  /(^|\/)pnpm-lock\.yaml$/,
  /(^|\/)package-lock\.json$/,
  /(^|\/)(LICENSE|LICENCE|NOTICE)[^/]*$/i,
];

export function isSkippedPath(path) {
  return SKIPPED_PATH.some((pattern) => pattern.test(path));
}

const OPENERS = new Set(["(", "{"]);
const CLOSERS = new Set([")", "}"]);

/**
 * Advance the splitter over one character. State: `escaped` (after a
 * backslash), `inClass` (inside `[...]`) and `depth` (open groups and
 * quantifier braces). Returns true when the character is a top-level comma.
 */
function step(state, char) {
  if (state.escaped) {
    state.escaped = false;
  } else if (char === "\\") {
    state.escaped = true;
  } else if (state.inClass) {
    state.inClass = char !== "]";
  } else if (char === "[") {
    state.inClass = true;
  } else if (OPENERS.has(char)) {
    state.depth += 1;
  } else if (CLOSERS.has(char) && state.depth > 0) {
    state.depth -= 1;
  } else if (char === "," && state.depth === 0) {
    return true;
  }
  return false;
}

/** ` => Label` at the end of a line: for the export scrubber only. */
const LABEL_SUFFIX = /\s+=>\s+[^\n]*$/;

/** One line's sources, split on top-level commas. */
function splitLine(line) {
  const sources = [];
  const state = { depth: 0, escaped: false, inClass: false };
  let current = "";
  for (const char of line) {
    if (step(state, char)) {
      sources.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  sources.push(current);
  return sources;
}

/**
 * Split the configured patterns into regex sources: one or more per line
 * (top-level commas also separate them; commas inside a character class, a
 * group, a `{m,n}` quantifier or after a backslash stay part of the source).
 * Blank lines, `#` comment lines and ` => Label` suffixes are dropped.
 */
export function splitSources(raw) {
  return raw
    .split(LINE_BREAK)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .flatMap((line) => splitLine(line.replace(LABEL_SUFFIX, "")))
    .map((source) => source.trim())
    .filter(Boolean);
}

/**
 * The ` => Label` of each pattern line, in pattern order, or null. Only a
 * line holding exactly one source can carry a label.
 */
export function patternLabels(raw) {
  return raw
    .split(LINE_BREAK)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .flatMap((line) => {
      const label = LABEL_SUFFIX.exec(line)?.[0]
        .replace(/^\s+=>\s+/, "")
        .trim();
      const sources = splitLine(line.replace(LABEL_SUFFIX, ""))
        .map((source) => source.trim())
        .filter(Boolean);
      return sources.map(() => (sources.length === 1 && label ? label : null));
    });
}

/**
 * Compile the sources, case-insensitive. An invalid source throws an error
 * that names only its index, never its text.
 */
export function compilePatterns(raw) {
  return splitSources(raw ?? "").map((source, index) => {
    try {
      return new RegExp(source, "i");
    } catch (cause) {
      throw new Error(
        `${PATTERNS_ENV} pattern #${index} is not a valid regex`,
        {
          cause,
        },
      );
    }
  });
}

/**
 * The repository's allowlist: literal phrases this public repository may
 * name even though a shared pattern would match them (its own studio name and
 * domain). One phrase per line, `#` comments ignored, matched
 * case-insensitively. A phrase is replaced by a space before the patterns
 * run, so it can only ever remove a match, and only for that exact phrase.
 * The list is public by design: it names what is allowed, never what is not.
 */
export const ALLOW_FILE = "config/external-ref-allow.txt";
let activeAllow = [];

export function parseAllow(text) {
  return (text ?? "")
    .split(LINE_BREAK)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
}

export function setAllow(phrases) {
  activeAllow = phrases.map(
    (phrase) =>
      new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"),
  );
}

export function loadAllow(root) {
  const file = join(root, ALLOW_FILE);
  setAllow(existsSync(file) ? parseAllow(readFileSync(file, "utf8")) : []);
}

function neutralize(line) {
  let out = line;
  for (const phrase of activeAllow) {
    out = out.replace(phrase, " ");
  }
  return out;
}

/** One finding per (line, pattern): `{ line, index }`, line is 1-based. */
export function scanText(text, patterns) {
  const findings = [];
  const lines = text.split(LINE_BREAK);
  for (const [lineIndex, raw] of lines.entries()) {
    const line = neutralize(raw);
    for (const [index, pattern] of patterns.entries()) {
      if (pattern.test(line)) {
        findings.push({ index, line: lineIndex + 1 });
      }
    }
  }
  return findings;
}

function isBinary(buffer) {
  return buffer.subarray(0, BINARY_SNIFF_BYTES).includes(0);
}

export function trackedFiles(cwd = repoRoot()) {
  return execFileSync("git", ["ls-files", "-z"], {
    cwd,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  })
    .split("\0")
    .filter(Boolean);
}

/** Paths staged for commit (added, copied, modified, renamed). */
export function stagedFiles(cwd = repoRoot()) {
  return execFileSync(
    "git",
    ["diff", "--cached", "--name-only", "-z", "--diff-filter=ACMR"],
    { cwd, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  )
    .split("\0")
    .filter(Boolean);
}

/** A path's staged content (the index), not the working tree's. */
export function readStaged(cwd, path) {
  return execFileSync("git", ["show", `:${path}`], {
    cwd,
    maxBuffer: 64 * 1024 * 1024,
  });
}

export function scanFiles(
  patterns,
  {
    cwd = repoRoot(),
    files,
    read = (path) => readFileSync(resolve(cwd, path)),
  } = {},
) {
  const findings = [];
  for (const [position, path] of (files ?? trackedFiles(cwd)).entries()) {
    // A path that matches is never printed: report its list position.
    const pathMatches = new Set();
    for (const { index } of scanText(path, patterns)) {
      pathMatches.add(index);
    }
    for (const index of pathMatches) {
      findings.push({ index, where: `tracked file #${position} (path)` });
    }
    if (isSkippedPath(path)) {
      continue;
    }
    let buffer;
    try {
      buffer = read(path);
    } catch {
      continue; // listed but deleted in the working tree
    }
    if (isBinary(buffer)) {
      continue;
    }
    for (const { index, line } of scanText(buffer.toString("utf8"), patterns)) {
      findings.push({
        index,
        where:
          pathMatches.size > 0
            ? `tracked file #${position}:${line}`
            : `${path}:${line}`,
      });
    }
  }
  return findings;
}

export function scanCommits(patterns, range, { cwd = repoRoot() } = {}) {
  const log = execFileSync(
    "git",
    ["log", "--format=%H%x00%B%x1e", range, "--"],
    { cwd, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );
  const findings = [];
  for (const record of log.split("\x1e")) {
    const [sha, message = ""] = record.replace(LEADING_NEWLINE, "").split("\0");
    if (!sha) {
      continue;
    }
    const seen = new Set();
    for (const { index } of scanText(message, patterns)) {
      seen.add(index);
    }
    for (const index of seen) {
      findings.push({ index, where: `commit ${sha}` });
    }
  }
  return findings;
}

/** Read a dotted path from the event payload; a missing or null value is "". */
export function eventValue(eventPath, dotted) {
  let node = JSON.parse(readFileSync(eventPath, "utf8"));
  for (const key of dotted.split(".")) {
    node = node?.[key];
  }
  return node === undefined || node === null ? "" : String(node);
}

const SCISSORS = /^# -+ >8 -+$/m;

/**
 * A commit message file as git will record it: everything below the
 * scissors line (`git commit -v`) and git's `#` comment lines dropped.
 */
export function commitMessage(text) {
  const scissors = SCISSORS.exec(text);
  const kept = scissors ? text.slice(0, scissors.index) : text;
  return kept
    .split(LINE_BREAK)
    .filter((line) => !line.startsWith("#"))
    .join("\n");
}

export function scanLabelledText(patterns, entries) {
  const findings = [];
  for (const { label, value } of entries) {
    const seen = new Set();
    for (const { index } of scanText(value, patterns)) {
      seen.add(index);
    }
    for (const index of seen) {
      findings.push({ index, where: label });
    }
  }
  return findings;
}

export function parseArgs(argv) {
  const options = {
    commits: [],
    eventText: [],
    files: false,
    messageFiles: [],
    requirePatterns: false,
    staged: false,
    text: [],
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const value = argv[i + 1];
    if (arg === "--files") {
      options.files = true;
    } else if (arg === "--require-patterns") {
      options.requirePatterns = true;
    } else if (arg === "--staged") {
      options.staged = true;
    } else if (arg === "--message-file" && value) {
      options.messageFiles.push(value);
      i += 1;
    } else if (arg === "--commits" && value) {
      options.commits.push(value);
      i += 1;
    } else if (arg === "--event-text" && value?.includes("=")) {
      const split = value.indexOf("=");
      options.eventText.push({
        label: value.slice(0, split),
        path: value.slice(split + 1),
      });
      i += 1;
    } else if (arg === "--text" && value?.includes("=")) {
      const split = value.indexOf("=");
      options.text.push({
        label: value.slice(0, split),
        name: value.slice(split + 1),
      });
      i += 1;
    } else {
      throw new Error(`unknown or incomplete argument: ${arg}`);
    }
  }
  return options;
}

export function run({
  argv = process.argv.slice(2),
  cwd,
  env = process.env,
  home = homedir(),
  log = (line) => process.stdout.write(`${line}\n`),
  logError = (line) => process.stderr.write(`${line}\n`),
} = {}) {
  let options;
  try {
    options = parseArgs(argv);
  } catch (error) {
    logError(`check-external-refs: ${error.message}`);
    return 2;
  }
  let loaded;
  try {
    loaded = loadPatterns(env, home);
  } catch (error) {
    logError(`check-external-refs: cannot read the patterns: ${error.message}`);
    return 2;
  }
  const raw = loaded.raw.trim();
  if (!raw) {
    if (options.requirePatterns) {
      logError(
        `check-external-refs: no patterns are configured, and this check requires them. Set ${PATTERNS_ENV} (CI secret) or create the local patterns file (docs/CICD.md, "External references").`,
      );
      return 1;
    }
    log("check-external-refs: no patterns are configured; skipping.");
    return 0;
  }

  let patterns;
  try {
    patterns = compilePatterns(raw);
  } catch (error) {
    logError(`check-external-refs: ${error.message}`);
    return 2;
  }
  if (patterns.length === 0) {
    logError(
      "check-external-refs: the configured patterns contain no pattern; refusing to pass.",
    );
    return 1;
  }

  let root;
  const entries = options.text.map(({ label, name }) => ({
    label,
    value: env[name] ?? "",
  }));
  try {
    root = cwd ?? repoRoot();
    loadAllow(root);
    for (const { label, path } of options.eventText) {
      if (!env.GITHUB_EVENT_PATH) {
        throw new Error("GITHUB_EVENT_PATH is not set");
      }
      entries.push({ label, value: eventValue(env.GITHUB_EVENT_PATH, path) });
    }
    for (const path of options.messageFiles) {
      entries.push({
        label: "commit message",
        value: commitMessage(readFileSync(path, "utf8")),
      });
    }
  } catch (error) {
    logError(`check-external-refs: cannot read its inputs: ${error.message}`);
    return 2;
  }

  const findings = [];
  const otherInput =
    entries.length > 0 || options.commits.length > 0 || options.staged;
  findings.push(...scanLabelledText(patterns, entries));
  for (const range of options.commits) {
    findings.push(...scanCommits(patterns, range, { cwd: root }));
  }
  if (options.staged) {
    findings.push(
      ...scanFiles(patterns, {
        cwd: root,
        files: stagedFiles(root),
        read: (path) => readStaged(root, path),
      }).map((finding) => ({ ...finding, where: `staged ${finding.where}` })),
    );
  }
  if (!otherInput || options.files) {
    findings.push(...scanFiles(patterns, { cwd: root }));
  }

  if (findings.length === 0) {
    log(`check-external-refs: ok (${patterns.length} patterns).`);
    return 0;
  }
  for (const { where, index } of findings) {
    logError(`${where} matches pattern #${index}`);
  }
  logError(
    `check-external-refs: ${findings.length} finding(s). Rewrite the text to describe the behaviour itself, not another project or product.`,
  );
  return 1;
}

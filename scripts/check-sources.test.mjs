import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, test } from "node:test";
import { checkDecision, checkPrBody, run } from "./check-sources-core.mjs";
import { parseRegistry, validateRegistry } from "./lib/registry.mjs";

const ENTRY = (id, extra = "") => `  - id: ${id}
    title: "A library"
    author: "Someone"
    kind: library
    url: "https://example.org/${id}"
    license: "MIT"
    accessed: 2026-10-12
    visibility: public
    used-in: [package.json, "#3"]
${extra}`;
const REGISTRY = `# comment\nsources:\n${ENTRY("S-001")}${ENTRY("S-002")}`;
const IDS = new Set(["S-001", "S-002"]);

const cleanups = [];
after(() => {
  for (const dir of cleanups) {
    rmSync(dir, { force: true, recursive: true });
  }
});

function capture() {
  const out = [];
  const err = [];
  return { err, log: (l) => out.push(l), logError: (l) => err.push(l), out };
}

function tempRepo(files) {
  const dir = mkdtempSync(join(tmpdir(), "check-sources-"));
  cleanups.push(dir);
  execFileSync("git", ["init", "-q"], { cwd: dir });
  for (const [path, body] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), body);
  }
  execFileSync("git", ["add", "-A"], { cwd: dir });
  return dir;
}

test("the registry subset parses: strings, scalars, inline lists, comments", () => {
  const { sources } = parseRegistry(REGISTRY);
  assert.equal(sources.length, 2);
  assert.equal(sources[0].id, "S-001");
  assert.equal(sources[0].title, "A library");
  assert.deepEqual(sources[0]["used-in"], ["package.json", "#3"]);
  assert.deepEqual(validateRegistry({ sources }), []);
});

test("anything outside the format is an error naming the line", () => {
  for (const [text, message] of [
    ["  - id: S-001\n", /expected "sources:" first/],
    ["sources:\n    title: x\n", /before the first entry/],
    ["sources:\n  - id: S-001\n      nested: x\n", /not a "key: value" line/],
    ["sources:\n  - id: S-001\n    title: 'x'\n", /use double quotes/],
    ["sources:\n  - id: S-001\n    used-in: [a,\n", /same line/],
    ["sources:\n  - id: S-001\n    id: S-002\n", /duplicate key id/],
  ]) {
    assert.throws(() => parseRegistry(text, "r.yaml"), message, text);
  }
});

test("validation: ids, kinds, visibility, url or private file, dates, notes", () => {
  const problems = validateRegistry(
    parseRegistry(`sources:
  - id: S-1
    title: "x"
    author: "y"
    kind: blog
    url: "http://example.org"
    private-file: "also"
    license: "MIT"
    accessed: 12/10/2026
    visibility: secret
    used-in: docs/a.md
    package: left-pad
    colour: red
  - id: S-002
    title: "Private brief"
    author: "Owner"
    kind: brief
    url: "https://example.org/brief"
    license: "All rights reserved"
    accessed: 2026-10-12
    visibility: private-cited-only
    used-in: []
  - id: S-002
    title: "Duplicate"
    author: "z"
    kind: doc
    private-file: "somewhere"
    license: "MIT"
    accessed: 2026-10-12
    visibility: public
    used-in: []
`),
  );
  for (const expected of [
    /id S-1 is not S-NNN/,
    /kind blog/,
    /visibility must be/,
    /exactly one of url or private-file/,
    /url must be https/,
    /accessed must be YYYY-MM-DD/,
    /used-in must be a list/,
    /needs a note/,
    /unknown key colour/,
    /private-cited-only source names its private-file/,
    /duplicate id S-002/,
    /public source needs a url/,
  ]) {
    assert.ok(
      problems.some((problem) => expected.test(problem)),
      `${expected} in ${problems.join("\n")}`,
    );
  }
});

test("decision records need a Sources line of ids or none: <reason>", () => {
  const header = (line) =>
    `# 0009: X\n\n- Status: Accepted\n${line}\n\n## Context\n`;
  assert.deepEqual(
    checkDecision("d.md", header("- Sources: S-001, S-002")),
    [],
  );
  assert.deepEqual(
    checkDecision("d.md", header("- Sources: none: internal reasoning only")),
    [],
  );
  assert.match(checkDecision("d.md", header(""))[0], /no "- Sources:" line/);
  for (const bad of [
    "- Sources: S-001 and S-002",
    "- Sources: none",
    "- Sources: TBD",
  ]) {
    assert.match(checkDecision("d.md", header(bad))[0], /must be/, bad);
  }
});

test("PR body: a Sources section with known ids or none: <reason>", () => {
  const body = (section) =>
    `## What and why\n\nx\n\n${section}\n## Decisions\n\nnone\n`;
  assert.deepEqual(checkPrBody(body("## Sources\n\nS-001, S-002\n"), IDS), []);
  assert.deepEqual(
    checkPrBody(body("## Sources\n\n- S-001 (the library)\n"), IDS),
    [],
  );
  assert.deepEqual(
    checkPrBody(body("## Sources\n\nnone: a typo fix\n"), IDS),
    [],
  );
  assert.match(checkPrBody(body(""), IDS)[0], /no "## Sources" section/);
  assert.match(checkPrBody(null, IDS)[0], /no "## Sources" section/);
  // The template's comment alone is not an answer.
  assert.match(
    checkPrBody(body("## Sources\n\n<!-- e.g. S-001 -->\n"), IDS)[0],
    /lists no ids/,
  );
  assert.match(
    checkPrBody(body("## Sources\n\nsee above\n"), IDS)[0],
    /lists no ids/,
  );
  assert.deepEqual(checkPrBody(body("## Sources\n\nS-001, S-404\n"), IDS), [
    "PR body: S-404 is not in docs/sources/registry.yaml",
  ]);
});

test("run: registry, decisions and every referenced id across tracked files", () => {
  const good = tempRepo({
    "docs/decisions/0000-template.md": "- Sources: S-NNN or none: <reason>\n",
    "docs/decisions/0001-x.md": "# 0001\n\n- Sources: S-001\n",
    "docs/note.md": "Uses S-002.\n",
    "docs/sources/registry.yaml": REGISTRY,
    "scripts/a.test.mjs": "const fixture = 'S-999';\n",
  });
  const io = capture();
  assert.equal(run({ argv: [], cwd: good, ...io }), 0, io.err.join("\n"));
  assert.match(io.out[0], /ok \(2 sources, 3 files\)/);

  const bad = tempRepo({
    "docs/decisions/0001-x.md": "# 0001\n\nno sources line\n",
    "docs/note.md": "line\nUses S-404.\n",
    "docs/sources/registry.yaml": REGISTRY,
  });
  const badIo = capture();
  assert.equal(run({ argv: [], cwd: bad, ...badIo }), 1);
  assert.ok(
    badIo.err.includes(
      "docs/note.md:2: S-404 is not in docs/sources/registry.yaml",
    ),
  );
  assert.ok(
    badIo.err.some((line) => line.startsWith("docs/decisions/0001-x.md: no")),
  );

  const missing = tempRepo({ "README.md": "x\n" });
  assert.equal(run({ argv: [], cwd: missing, ...capture() }), 2);
});

test("run --pr-body reads the body from the event file", () => {
  const dir = tempRepo({ "docs/sources/registry.yaml": REGISTRY });
  const eventPath = join(dir, "event.json");
  const withBody = (body) => {
    writeFileSync(eventPath, JSON.stringify({ pull_request: { body } }));
    const io = capture();
    const code = run({
      argv: ["--pr-body"],
      cwd: dir,
      env: { GITHUB_EVENT_PATH: eventPath },
      ...io,
    });
    return { code, io };
  };
  assert.equal(withBody("## Sources\n\nS-001\n").code, 0);
  const none = withBody("## What\n\nx\n");
  assert.equal(none.code, 1);
  assert.match(none.io.err[0], /no "## Sources" section/);
  assert.equal(withBody(null).code, 1);
  assert.equal(
    run({ argv: ["--pr-body"], cwd: dir, env: {}, ...capture() }),
    2,
  );
  assert.equal(run({ argv: ["--nope"], cwd: dir, ...capture() }), 2);
});

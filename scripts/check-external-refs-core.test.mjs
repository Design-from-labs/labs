import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test, { after } from "node:test";
import {
  commitMessage,
  compilePatterns,
  defaultPatternsFile,
  isSkippedPath,
  loadPatterns,
  PATTERNS_ENV,
  PATTERNS_FILE_ENV,
  patternLabels,
  run as runCore,
  scanCommits,
  scanFiles,
  scanText,
  splitSources,
} from "./check-external-refs-core.mjs";

// Placeholder patterns only: the real terms never appear in the repository.
const INVALID_AT_1 = /pattern #1 is not a valid regex/;
const NOT_UNCLOSED = /unclosed/;
const SKIPPING = /skipping/;
const LEAKED = /notes-|baz-qux|FooBar|\.md|\.txt/;
const NO_PATTERNS = /contain no pattern/;
const REQUIRED = /no patterns are configured, and this check requires them/;
const AT_INDEX_0 = /pattern #0/;
const OK = /ok/;
const PLACEHOLDER = "foobar,baz-qux";

// A home directory with no patterns file, so no test ever reads the real
// one; tests that need the file write their own.
const EMPTY_HOME = mkdtempSync(join(tmpdir(), "external-refs-home-"));
after(() => rmSync(EMPTY_HOME, { force: true, recursive: true }));
const run = (options) => runCore({ home: EMPTY_HOME, ...options });

function capture() {
  const out = [];
  const err = [];
  return {
    err,
    log: (line) => out.push(line),
    logError: (line) => err.push(line),
    out,
  };
}

function git(cwd, ...args) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

function tempRepo() {
  const dir = mkdtempSync(join(tmpdir(), "external-refs-"));
  git(dir, "init", "-q");
  git(dir, "config", "user.email", "test@example.com");
  git(dir, "config", "user.name", "Test");
  git(dir, "config", "commit.gpgsign", "false");
  return dir;
}

test("splitSources keeps commas inside classes, groups and quantifiers", () => {
  assert.deepEqual(splitSources("a,b"), ["a", "b"]);
  assert.deepEqual(splitSources("x{1,3},y"), ["x{1,3}", "y"]);
  assert.deepEqual(splitSources("[a,b],(c,d)"), ["[a,b]", "(c,d)"]);
  assert.deepEqual(splitSources("a\\,b,c"), ["a\\,b", "c"]);
  assert.deepEqual(splitSources(" a , ,b "), ["a", "b"]);
});

test("patterns are case-insensitive", () => {
  const patterns = compilePatterns(PLACEHOLDER);
  assert.equal(scanText("a FooBar here", patterns).length, 1);
  assert.equal(scanText("a FOOBAR here", patterns).length, 1);
  assert.equal(scanText("a foobar here", patterns).length, 1);
  assert.equal(scanText("a foo bar here", patterns).length, 0);
});

test("newline-separated patterns, # comments and => labels", () => {
  const raw = "# a comment\n\nfoo\\b => Label A\n x{1,3} , y \nbar";
  assert.deepEqual(splitSources(raw), ["foo\\b", "x{1,3}", "y", "bar"]);
  assert.deepEqual(patternLabels(raw), ["Label A", null, null, null]);
});

test("word-ish boundaries keep longer words and an allowed suffix out", () => {
  const patterns = compilePatterns(
    "(?<![a-z0-9])zed(?![a-z])\nwidget[\\s_-]*works(?![\\s_-]*labs)",
  );
  assert.equal(scanText("Zed and zed_db", patterns).length, 1);
  assert.equal(scanText("zedonia, amazed", patterns).length, 0);
  assert.equal(scanText("Widget Works and widget-works", patterns).length, 1);
  assert.equal(scanText("org widget-works-labs only", patterns).length, 0);
});

test("scanText reports 1-based lines and the pattern index only", () => {
  const patterns = compilePatterns(PLACEHOLDER);
  assert.deepEqual(scanText("ok\r\nbaz-qux\nFooBar baz-qux", patterns), [
    { index: 1, line: 2 },
    { index: 0, line: 3 },
    { index: 1, line: 3 },
  ]);
});

test("an invalid pattern fails naming only its index", () => {
  assert.throws(
    () => compilePatterns("ok,(unclosed"),
    (error) => {
      assert.match(error.message, INVALID_AT_1);
      assert.doesNotMatch(error.message, NOT_UNCLOSED);
      return true;
    },
  );
});

test("vendored, lockfile and licence paths are skipped", () => {
  assert.equal(isSkippedPath("pnpm-lock.yaml"), true);
  assert.equal(isSkippedPath("packages/x/LICENSE.md"), true);
  assert.equal(isSkippedPath("docs/CICD.md"), false);
});

test("patterns load from the env first, then the local file, never the file in CI", () => {
  const home = mkdtempSync(join(tmpdir(), "external-refs-file-"));
  try {
    const file = defaultPatternsFile({}, home);
    assert.equal(file, join(home, ".config", "dfl", "external-ref-patterns"));
    assert.deepEqual(loadPatterns({}, home), { raw: "", source: "none" });
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, "foobar\n");
    assert.equal(loadPatterns({}, home).source, "file");
    assert.equal(
      loadPatterns({ [PATTERNS_ENV]: "x" }, home).source,
      PATTERNS_ENV,
    );
    assert.equal(loadPatterns({ CI: "true" }, home).source, "none");
    assert.equal(loadPatterns({ GITHUB_ACTIONS: "true" }, home).source, "none");
    const other = join(home, "elsewhere");
    writeFileSync(other, "y\n");
    assert.equal(loadPatterns({ [PATTERNS_FILE_ENV]: other }, home).raw, "y\n");

    // The file is a real source for run(), with --require-patterns too.
    const dir = tempRepo();
    try {
      writeFileSync(join(dir, "a.md"), "FooBar\n");
      git(dir, "add", "-A");
      const io = capture();
      assert.equal(
        runCore({
          argv: ["--require-patterns"],
          cwd: dir,
          env: {},
          home,
          ...io,
        }),
        1,
      );
      assert.equal(io.err[0], "a.md:1 matches pattern #0");
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  } finally {
    rmSync(home, { force: true, recursive: true });
  }
});

test("--staged scans the index, not the working tree", () => {
  const dir = tempRepo();
  try {
    writeFileSync(join(dir, "a.md"), "clean\n");
    writeFileSync(join(dir, "b.md"), "clean\n");
    git(dir, "add", "-A");
    git(dir, "commit", "-q", "-m", "first");
    // Staged: a violation. Then the working tree hides it again.
    writeFileSync(join(dir, "a.md"), "FooBar\n");
    git(dir, "add", "a.md");
    writeFileSync(join(dir, "a.md"), "clean again\n");
    // Unstaged: a violation that is not part of this commit.
    writeFileSync(join(dir, "b.md"), "FooBar\n");
    const io = capture();
    const env = { [PATTERNS_ENV]: PLACEHOLDER };
    assert.equal(run({ argv: ["--staged"], cwd: dir, env, ...io }), 1);
    assert.deepEqual(
      io.err.filter((line) => line.includes("matches")),
      ["staged a.md:1 matches pattern #0"],
    );
    git(dir, "add", "a.md");
    git(dir, "commit", "-q", "-m", "second");
    const clean = capture();
    assert.equal(run({ argv: ["--staged"], cwd: dir, env, ...clean }), 0);
  } finally {
    rmSync(dir, { force: true, recursive: true });
  }
});

test("--message-file ignores git's comments and the scissors part", () => {
  const dir = tempRepo();
  try {
    const message = join(dir, "MSG");
    const env = { [PATTERNS_ENV]: PLACEHOLDER };
    writeFileSync(
      message,
      "fine subject\n\n# FooBar in a comment\n# ------------------------ >8 ------------------------\nFooBar in the diff\n",
    );
    const clean = capture();
    assert.equal(
      run({ argv: ["--message-file", message], cwd: dir, env, ...clean }),
      0,
    );
    writeFileSync(message, "subject\n\nbody names FOOBAR\n");
    const bad = capture();
    assert.equal(
      run({ argv: ["--message-file", message], cwd: dir, env, ...bad }),
      1,
    );
    assert.equal(bad.err[0], "commit message matches pattern #0");
    assert.equal(commitMessage("a\n#b\nc"), "a\nc");
  } finally {
    rmSync(dir, { force: true, recursive: true });
  }
});

test("skips with a notice and exit 0 when the variable is unset or blank", () => {
  for (const env of [{}, { [PATTERNS_ENV]: "  " }]) {
    const io = capture();
    assert.equal(run({ argv: [], env, ...io }), 0);
    assert.equal(io.out.length, 1);
    assert.match(io.out[0], SKIPPING);
    assert.deepEqual(io.err, []);
  }
});

test("exit 2 on an invalid pattern", () => {
  const io = capture();
  assert.equal(run({ argv: [], env: { [PATTERNS_ENV]: "(" }, ...io }), 2);
  assert.match(io.err[0], AT_INDEX_0);
});

test("tracked files: finds matches, ignores untracked and binary files", () => {
  const dir = tempRepo();
  try {
    writeFileSync(join(dir, "clean.md"), "nothing here\n");
    writeFileSync(join(dir, "dirty.md"), "line one\nsee FooBar for more\n");
    writeFileSync(
      join(dir, "bin.dat"),
      Buffer.from([0, 70, 111, 111, 66, 97, 114]),
    );
    writeFileSync(join(dir, "pnpm-lock.yaml"), "FooBar\n");
    writeFileSync(join(dir, "untracked.md"), "FooBar\n");
    git(dir, "add", "clean.md", "dirty.md", "bin.dat", "pnpm-lock.yaml");

    const io = capture();
    const code = run({
      argv: [],
      cwd: dir,
      env: { [PATTERNS_ENV]: PLACEHOLDER },
      ...io,
    });
    assert.equal(code, 1);
    assert.deepEqual(io.err.slice(0, 1), ["dirty.md:2 matches pattern #0"]);
    assert.equal(io.err.filter((line) => line.includes("matches")).length, 1);
    // The matched text and the line content never reach the output.
    assert.ok(io.err.every((line) => !line.includes("FooBar")));
    assert.deepEqual(
      scanFiles(compilePatterns("none-of-these"), { cwd: dir }),
      [],
    );
  } finally {
    rmSync(dir, { force: true, recursive: true });
  }
});

test("commit messages: reports the sha and pattern index, never the text", () => {
  const dir = tempRepo();
  try {
    writeFileSync(join(dir, "a.txt"), "a\n");
    git(dir, "add", "a.txt");
    git(dir, "commit", "-q", "-m", "first");
    const base = git(dir, "rev-parse", "HEAD");
    writeFileSync(join(dir, "a.txt"), "b\n");
    git(dir, "commit", "-q", "-am", "second\n\nbody mentions baz-qux");
    const bad = git(dir, "rev-parse", "HEAD");
    writeFileSync(join(dir, "a.txt"), "c\n");
    git(dir, "commit", "-q", "-am", "third is fine");

    const patterns = compilePatterns(PLACEHOLDER);
    assert.deepEqual(scanCommits(patterns, `${base}..HEAD`, { cwd: dir }), [
      { index: 1, where: `commit ${bad}` },
    ]);
    assert.deepEqual(scanCommits(patterns, `${bad}..HEAD`, { cwd: dir }), []);

    const io = capture();
    const code = run({
      argv: ["--commits", `${base}..HEAD`],
      cwd: dir,
      env: { [PATTERNS_ENV]: PLACEHOLDER },
      ...io,
    });
    assert.equal(code, 1);
    assert.equal(io.err[0], `commit ${bad} matches pattern #1`);
  } finally {
    rmSync(dir, { force: true, recursive: true });
  }
});

test("labelled text: PR title and body, then files only with --files", () => {
  const dir = tempRepo();
  try {
    writeFileSync(join(dir, "dirty.md"), "FooBar\n");
    git(dir, "add", "dirty.md");
    const env = {
      [PATTERNS_ENV]: PLACEHOLDER,
      BODY: "all good",
      TITLE: "mentions FOOBAR",
    };

    const textOnly = capture();
    assert.equal(
      run({
        argv: ["--text", "PR title=TITLE", "--text", "PR body=BODY"],
        cwd: dir,
        env,
        ...textOnly,
      }),
      1,
    );
    assert.equal(textOnly.err[0], "PR title matches pattern #0");
    assert.ok(textOnly.err.every((line) => !line.startsWith("dirty.md")));

    const withFiles = capture();
    run({
      argv: ["--text", "PR body=BODY", "--files"],
      cwd: dir,
      env,
      ...withFiles,
    });
    assert.equal(withFiles.err[0], "dirty.md:1 matches pattern #0");
  } finally {
    rmSync(dir, { force: true, recursive: true });
  }
});

test("clean input passes", () => {
  const io = capture();
  assert.equal(
    run({
      argv: ["--text", "PR title=TITLE"],
      env: { [PATTERNS_ENV]: PLACEHOLDER, TITLE: "fine" },
      ...io,
    }),
    0,
  );
  assert.match(io.out[0], OK);
});

test("a file whose NAME matches fails, and the path is never printed", () => {
  const dir = tempRepo();
  try {
    writeFileSync(join(dir, "clean.md"), "nothing here\n");
    writeFileSync(join(dir, "notes-FooBar.md"), "harmless body\n");
    writeFileSync(join(dir, "baz-qux.txt"), "FooBar inside\nsecond line\n");
    git(dir, "add", "-A");

    const listed = git(dir, "ls-files").split("\n");
    const io = capture();
    const code = run({
      argv: [],
      cwd: dir,
      env: { [PATTERNS_ENV]: PLACEHOLDER },
      ...io,
    });
    assert.equal(code, 1);

    const nameOnly = listed.indexOf("notes-FooBar.md");
    const both = listed.indexOf("baz-qux.txt");
    assert.ok(
      io.err.includes(`tracked file #${nameOnly} (path) matches pattern #0`),
    );
    assert.ok(
      io.err.includes(`tracked file #${both} (path) matches pattern #1`),
    );
    // Content hits inside a matching path are redacted too.
    assert.ok(io.err.includes(`tracked file #${both}:1 matches pattern #0`));
    // Neither the path text nor the matched text reaches the output.
    for (const line of io.err) {
      assert.doesNotMatch(line, LEAKED);
    }
  } finally {
    rmSync(dir, { force: true, recursive: true });
  }
});

test("a path that does not match keeps file:line output", () => {
  const dir = tempRepo();
  try {
    writeFileSync(join(dir, "ordinary.md"), "ok\nFooBar\n");
    git(dir, "add", "-A");
    const io = capture();
    run({ argv: [], cwd: dir, env: { [PATTERNS_ENV]: PLACEHOLDER }, ...io });
    assert.equal(io.err[0], "ordinary.md:2 matches pattern #0");
  } finally {
    rmSync(dir, { force: true, recursive: true });
  }
});

test("a set value that parses to zero patterns fails instead of passing", () => {
  for (const value of [",,", " , ", ",\n,"]) {
    const io = capture();
    assert.equal(run({ argv: [], env: { [PATTERNS_ENV]: value }, ...io }), 1);
    assert.deepEqual(io.out, []);
    assert.match(io.err[0], NO_PATTERNS);
  }
});

test("--require-patterns fails closed when the variable is unset or blank", () => {
  for (const env of [{}, { [PATTERNS_ENV]: "" }, { [PATTERNS_ENV]: "  " }]) {
    const io = capture();
    assert.equal(run({ argv: ["--require-patterns"], env, ...io }), 1);
    assert.deepEqual(io.out, []);
    assert.match(io.err[0], REQUIRED);
  }
});

test("--require-patterns does not change a run that has patterns", () => {
  const io = capture();
  assert.equal(
    run({
      argv: ["--require-patterns", "--text", "PR title=TITLE"],
      env: { [PATTERNS_ENV]: PLACEHOLDER, TITLE: "fine" },
      ...io,
    }),
    0,
  );
});

test("an unknown argument exits 2", () => {
  const io = capture();
  assert.equal(
    run({ argv: ["--nope"], env: { [PATTERNS_ENV]: PLACEHOLDER }, ...io }),
    2,
  );
});

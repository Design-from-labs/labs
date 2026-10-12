import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// The command-line entry, run as a real process. Placeholder patterns only.
const HERE = dirname(fileURLToPath(import.meta.url));
const CLI = join(HERE, "check-external-refs.mjs");
const CORE = join(HERE, "check-external-refs-core.mjs");
const PATTERNS = "foobar";
const EMPTY_HOME = mkdtempSync(join(tmpdir(), "external-refs-cli-home-"));
test.after(() => rmSync(EMPTY_HOME, { force: true, recursive: true }));
const LEAKED = /FooBar/;
const CONTENT_HIT = /a\.md:1 matches pattern #0/;
const OK_ONE_PATTERN = /ok \(1 patterns\)/;
const TITLE_HIT = /^PR title matches pattern #0$/m;
const BODY_HIT = /^PR body matches pattern #0$/m;
const OK = /ok/;

function tempRepo(files) {
  const dir = mkdtempSync(join(tmpdir(), "external-refs-cli-"));
  execFileSync("git", ["init", "-q"], { cwd: dir });
  for (const [name, body] of Object.entries(files)) {
    writeFileSync(join(dir, name), body);
  }
  execFileSync("git", ["add", "-A"], { cwd: dir });
  return dir;
}

function cli(entry, cwd, { args = [], env = {} } = {}) {
  const result = spawnSync(process.execPath, [entry, ...args], {
    cwd,
    encoding: "utf8",
    // A HOME without a patterns file: the real one is never read here.
    env: { HOME: EMPTY_HOME, PATH: process.env.PATH, ...env },
  });
  return { code: result.status, err: result.stderr, out: result.stdout };
}

function cleanup(...dirs) {
  for (const dir of dirs) {
    rmSync(dir, { force: true, recursive: true });
  }
}

test("run directly: a match fails, a clean tree passes with a verdict", () => {
  const dirty = tempRepo({ "a.md": "FooBar\n" });
  const clean = tempRepo({ "a.md": "fine\n" });
  try {
    const bad = cli(CLI, dirty, { env: { EXTERNAL_REF_PATTERNS: PATTERNS } });
    assert.equal(bad.code, 1);
    assert.match(bad.err, CONTENT_HIT);
    assert.doesNotMatch(bad.err, LEAKED);

    const good = cli(CLI, clean, { env: { EXTERNAL_REF_PATTERNS: PATTERNS } });
    assert.equal(good.code, 0);
    assert.match(good.out, OK_ONE_PATTERN);
  } finally {
    cleanup(dirty, clean);
  }
});

test("run through a symlink: it still runs and still fails on a match", () => {
  const dirty = tempRepo({ "a.md": "FooBar\n" });
  const links = mkdtempSync(join(tmpdir(), "external-refs-link-"));
  try {
    const link = join(links, "check.mjs");
    symlinkSync(CLI, link);
    const result = cli(link, dirty, {
      env: { EXTERNAL_REF_PATTERNS: PATTERNS },
    });
    assert.equal(result.code, 1);
    assert.match(result.err, CONTENT_HIT);
  } finally {
    cleanup(dirty, links);
  }
});

test("a copy kept outside the checkout scans the checkout it runs in", () => {
  const dirty = tempRepo({ "a.md": "FooBar\n" });
  const copy = mkdtempSync(join(tmpdir(), "external-refs-copy-"));
  try {
    mkdirSync(copy, { recursive: true });
    copyFileSync(CLI, join(copy, "check-external-refs.mjs"));
    copyFileSync(CORE, join(copy, "check-external-refs-core.mjs"));
    const result = cli(join(copy, "check-external-refs.mjs"), dirty, {
      env: { EXTERNAL_REF_PATTERNS: PATTERNS },
    });
    assert.equal(result.code, 1);
    assert.match(result.err, CONTENT_HIT);
  } finally {
    cleanup(dirty, copy);
  }
});

test("a subdirectory run still scans from the git top level", () => {
  const dirty = tempRepo({ "a.md": "FooBar\n" });
  try {
    mkdirSync(join(dirty, "sub"));
    const result = cli(CLI, join(dirty, "sub"), {
      env: { EXTERNAL_REF_PATTERNS: PATTERNS },
    });
    assert.equal(result.code, 1);
  } finally {
    cleanup(dirty);
  }
});

test("with patterns set, exit 0 always comes with a verdict", () => {
  const clean = tempRepo({ "a.md": "fine\n" });
  try {
    for (const args of [[], ["--files"], ["--require-patterns"]]) {
      const result = cli(CLI, clean, {
        args,
        env: { EXTERNAL_REF_PATTERNS: PATTERNS },
      });
      assert.equal(result.code, 0);
      assert.ok(result.out.trim().length > 0, `silent pass for ${args}`);
    }
  } finally {
    cleanup(clean);
  }
});

test("outside a git checkout it fails instead of passing", () => {
  const plain = mkdtempSync(join(tmpdir(), "external-refs-plain-"));
  try {
    const result = cli(CLI, plain, {
      env: { EXTERNAL_REF_PATTERNS: PATTERNS },
    });
    assert.equal(result.code, 2);
  } finally {
    cleanup(plain);
  }
});

test("--event-text reads the PR title and body from the event file", () => {
  const clean = tempRepo({ "a.md": "fine\n" });
  const events = mkdtempSync(join(tmpdir(), "external-refs-event-"));
  try {
    const eventPath = join(events, "event.json");
    const runWith = (event, flags) => {
      writeFileSync(eventPath, JSON.stringify(event));
      return cli(CLI, clean, {
        args: flags,
        env: { EXTERNAL_REF_PATTERNS: PATTERNS, GITHUB_EVENT_PATH: eventPath },
      });
    };
    const args = [
      "--event-text",
      "PR title=pull_request.title",
      "--event-text",
      "PR body=pull_request.body",
    ];

    const bad = runWith(
      { pull_request: { body: "x", title: "about FooBar" } },
      args,
    );
    assert.equal(bad.code, 1);
    assert.match(bad.err, TITLE_HIT);
    assert.doesNotMatch(bad.err, LEAKED);

    const badBody = runWith(
      { pull_request: { body: "FooBar", title: "x" } },
      args,
    );
    assert.match(badBody.err, BODY_HIT);

    // A null body (an empty PR description) is not an error.
    const good = runWith({ pull_request: { body: null, title: "fine" } }, args);
    assert.equal(good.code, 0);
    assert.match(good.out, OK);

    const missing = cli(CLI, clean, {
      args,
      env: { EXTERNAL_REF_PATTERNS: PATTERNS },
    });
    assert.equal(missing.code, 2);
  } finally {
    cleanup(clean, events);
  }
});

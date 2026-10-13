import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { after, before, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const cliPath = fileURLToPath(new URL("../dist/index.js", import.meta.url));
const fixturePath = new URL("./fixtures/registry.json", import.meta.url);
const pkg = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8"),
);

let server;
let base;
let fixture;

before(async () => {
  fixture = await readFile(fixturePath, "utf8");
  server = createServer((request, response) => {
    if (request.url === "/r/registry.json") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(fixture);
      return;
    }
    response.writeHead(404);
    response.end("not found");
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server.close();
});

/** Run the built CLI and capture output without throwing on a nonzero exit. */
function cli(args, env = {}) {
  return new Promise((resolve) => {
    execFile(
      process.execPath,
      [cliPath, ...args],
      { env: { ...process.env, DESIGNFROM_REGISTRY_URL: base, ...env } },
      (error, stdout, stderr) => {
        resolve({ code: error ? error.code : 0, stdout, stderr });
      },
    );
  });
}

const shadcn = (...names) =>
  `npx shadcn@latest add ${names.map((name) => `${base}/r/${name}.json`).join(" ")}\n`;

describe("designfrom add (dry run)", () => {
  it("defaults to radix and lucide", async () => {
    const result = await cli(["add", "button", "--dry-run"]);
    assert.equal(result.code, 0);
    assert.equal(result.stdout, shadcn("button-radix-lucide"));
  });

  it("honors --primitive and --icons", async () => {
    const result = await cli([
      "add",
      "button",
      "--primitive",
      "aria",
      "--icons",
      "phosphor",
      "--dry-run",
    ]);
    assert.equal(result.code, 0);
    assert.equal(result.stdout, shadcn("button-aria-phosphor"));
  });

  it("selects a style and ignores --primitive for primitive-free components", async () => {
    const result = await cli([
      "add",
      "badge",
      "--style",
      "subtle",
      "--icons",
      "phosphor",
      "--primitive",
      "aria",
      "--dry-run",
    ]);
    assert.equal(result.code, 0);
    assert.equal(result.stdout, shadcn("badge-subtle-phosphor"));
  });

  it("uses the unstyled item when no style is given", async () => {
    const result = await cli(["add", "badge", "--dry-run"]);
    assert.equal(result.stdout, shadcn("badge-lucide"));
  });

  it("resolves the icon axis within the requested style", async () => {
    const plain = await cli(["add", "player", "--dry-run"]);
    assert.equal(plain.code, 0);
    assert.equal(plain.stdout, shadcn("player"));
    const styled = await cli([
      "add",
      "player",
      "--style",
      "icons",
      "--dry-run",
    ]);
    assert.equal(styled.stdout, shadcn("player-icons-lucide"));
    const phosphor = await cli([
      "add",
      "player",
      "--style",
      "icons",
      "--icons",
      "phosphor",
      "--dry-run",
    ]);
    assert.equal(phosphor.stdout, shadcn("player-icons-phosphor"));
  });

  it("ignores --icons for icon-free components", async () => {
    const result = await cli([
      "add",
      "tooltip",
      "--primitive",
      "base",
      "--icons",
      "phosphor",
      "--dry-run",
    ]);
    assert.equal(result.code, 0);
    assert.equal(result.stdout, shadcn("tooltip-base"));
  });

  it("accepts a full item name", async () => {
    const result = await cli([
      "add",
      "button-base-phosphor",
      "--primitive",
      "aria",
      "--dry-run",
    ]);
    assert.equal(result.code, 0);
    assert.equal(result.stdout, shadcn("button-base-phosphor"));
  });

  it("adds foundations by name", async () => {
    const result = await cli(["add", "designfrom-theme", "--dry-run"]);
    assert.equal(result.stdout, shadcn("designfrom-theme"));
  });

  it("resolves several components in one call", async () => {
    const result = await cli([
      "add",
      "button",
      "badge",
      "tooltip",
      "--dry-run",
    ]);
    assert.equal(result.code, 0);
    assert.equal(
      result.stdout,
      shadcn("button-radix-lucide", "badge-lucide", "tooltip-radix"),
    );
  });

  it("passes extra arguments after --", async () => {
    const result = await cli([
      "add",
      "button",
      "--dry-run",
      "--",
      "--yes",
      "-o",
    ]);
    assert.equal(result.code, 0);
    assert.equal(
      result.stdout,
      `${shadcn("button-radix-lucide").trim()} --yes -o\n`,
    );
  });

  it("prefers --registry over the environment variable", async () => {
    const result = await cli(
      ["add", "button", "--dry-run", "--registry", `${base}/`],
      { DESIGNFROM_REGISTRY_URL: "http://127.0.0.1:1" },
    );
    assert.equal(result.code, 0);
    assert.equal(result.stdout, shadcn("button-radix-lucide"));
  });

  it("fails for an unknown component and lists the known ones", async () => {
    const result = await cli(["add", "carousel", "--dry-run"]);
    assert.equal(result.code, 1);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /Unknown component "carousel"/);
    for (const name of ["badge", "button", "tooltip", "designfrom-theme"]) {
      assert.ok(result.stderr.includes(name), `lists ${name}`);
    }
  });

  it("fails for an unavailable combination and lists the options", async () => {
    const result = await cli([
      "add",
      "button",
      "--style",
      "subtle",
      "--dry-run",
    ]);
    assert.equal(result.code, 1);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /No "button" variant matches/);
    assert.match(result.stderr, /radix\+lucide/);
    assert.match(result.stderr, /aria\+phosphor/);
    assert.match(result.stderr, /button-radix-lucide/);
  });

  it("lists style combinations for a styled component", async () => {
    const result = await cli(["add", "badge", "--style", "bold", "--dry-run"]);
    assert.equal(result.code, 1);
    assert.match(result.stderr, /default\+lucide/);
    assert.match(result.stderr, /subtle\+phosphor/);
  });
});

describe("designfrom add (execution)", {
  skip: process.platform === "win32",
}, () => {
  it("runs npx and passes its exit code through", async () => {
    const dir = await mkdtemp(join(tmpdir(), "designfrom-npx-"));
    try {
      const script = join(dir, "npx");
      await writeFile(script, '#!/bin/sh\necho "fake npx: $@"\nexit 3\n');
      await chmod(script, 0o755);
      const result = await cli(["add", "button"], {
        PATH: `${dir}${delimiter}${process.env.PATH}`,
      });
      assert.equal(result.code, 3);
      assert.equal(
        result.stdout,
        `fake npx: shadcn@latest add ${base}/r/button-radix-lucide.json\n`,
      );
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe("designfrom list", () => {
  it("prints components and foundations", async () => {
    const result = await cli(["list"]);
    assert.equal(result.code, 0);
    const lines = result.stdout.split("\n");
    assert.ok(lines.indexOf("Components") < lines.indexOf("Foundations"));
    const [components, foundations] = result.stdout.split("Foundations");
    assert.match(
      components,
      /badge\s+Badge\s+icons: lucide, phosphor \| styles: default, subtle/,
    );
    assert.match(
      components,
      /button\s+Button\s+primitives: radix, base, aria \| icons: lucide, phosphor/,
    );
    assert.match(
      components,
      /tooltip\s+Tooltip\s+primitives: radix, base, aria\n/,
    );
    assert.match(foundations, /designfrom-theme\s+Design From theme\s+theme/);
    assert.ok(!foundations.includes("button"));
  });

  it("prints machine-readable JSON with --json", async () => {
    const result = await cli(["list", "--json"]);
    assert.equal(result.code, 0);
    const data = JSON.parse(result.stdout);
    assert.ok(Array.isArray(data));
    const byName = Object.fromEntries(
      data.map((entry) => [entry.component, entry]),
    );
    assert.deepEqual(Object.keys(byName).sort(), [
      "badge",
      "button",
      "designfrom-theme",
      "player",
      "tooltip",
    ]);
    assert.deepEqual(byName.button.primitives, ["radix", "base", "aria"]);
    assert.deepEqual(byName.button.iconSets, ["lucide", "phosphor"]);
    assert.deepEqual(byName.button.styles, []);
    assert.equal(byName.button.items.length, 6);
    assert.deepEqual(byName.badge.styles, ["default", "subtle"]);
    assert.deepEqual(byName.tooltip.iconSets, []);
    assert.equal(byName["designfrom-theme"].kind, "theme");
  });
});

describe("designfrom meta commands and errors", () => {
  it("prints the package version", async () => {
    for (const flag of ["--version", "-v"]) {
      const result = await cli([flag]);
      assert.equal(result.code, 0);
      assert.equal(result.stdout.trim(), pkg.version);
    }
  });

  it("prints help", async () => {
    for (const flag of ["--help", "-h"]) {
      const result = await cli([flag]);
      assert.equal(result.code, 0);
      assert.match(result.stdout, /Usage:/);
      assert.match(result.stdout, /designfrom add <component\.\.\.>/);
      assert.match(result.stdout, /designfrom list/);
    }
  });

  it("rejects an unknown command with usage", async () => {
    const result = await cli(["frobnicate"]);
    assert.equal(result.code, 1);
    assert.match(result.stderr, /Unknown command "frobnicate"/);
    assert.match(result.stderr, /Usage:/);
  });

  it("rejects a bad flag value with usage", async () => {
    const result = await cli([
      "add",
      "button",
      "--primitive",
      "vue",
      "--dry-run",
    ]);
    assert.equal(result.code, 1);
    assert.match(result.stderr, /Invalid value "vue" for --primitive/);
    assert.match(result.stderr, /Usage:/);
  });

  it("rejects an unknown flag with usage", async () => {
    const result = await cli(["add", "button", "--nope"]);
    assert.equal(result.code, 1);
    assert.match(result.stderr, /nope/);
    assert.match(result.stderr, /Usage:/);
  });

  it("requires a component name", async () => {
    const result = await cli(["add"]);
    assert.equal(result.code, 1);
    assert.match(result.stderr, /Missing component name/);
  });

  it("reports an unreachable registry with its URL", async () => {
    const dead = "http://127.0.0.1:1";
    const result = await cli(["list"], { DESIGNFROM_REGISTRY_URL: dead });
    assert.equal(result.code, 1);
    assert.ok(result.stderr.includes(`${dead}/r/registry.json`));
    assert.match(result.stderr, /Could not reach the registry/);
  });

  it("reports an HTTP error from the registry", async () => {
    const result = await cli(["list"], {
      DESIGNFROM_REGISTRY_URL: `${base}/missing`,
    });
    assert.equal(result.code, 1);
    assert.match(result.stderr, /HTTP 404/);
  });
});

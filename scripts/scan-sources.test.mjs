import assert from "node:assert/strict";
import { test } from "node:test";
import { exportScopeProblems, ossMeta, rawUrl } from "./scan-sources.mjs";

test("rawUrl pins a public GitHub file to a commit", () => {
  assert.equal(
    rawUrl("https://github.com/acme/ui", "a".repeat(40), "public/r/x.json"),
    `https://raw.githubusercontent.com/acme/ui/${"a".repeat(40)}/public/r/x.json`,
  );
  assert.throws(() => rawUrl("https://gitlab.com/acme/ui", "x", "y"), /GitHub/);
});

test("ossMeta carries author, license, attribution and credit from sources.yaml", () => {
  const source = {
    name: "Acme",
    repo: "https://github.com/acme/ui",
    ref: "b".repeat(40),
    author: "Acme <https://acme.example>",
    license: "MIT",
    attribution: "Copyright (c) 2025 Acme. MIT License.",
    credit: "S-099",
  };
  const component = {
    name: "spinner",
    category: "feedback",
    items: [
      {
        variant: "spinner-radix-lucide",
        primitive: "radix",
        iconSet: "lucide",
        path: "a",
      },
      {
        variant: "spinner-radix-phosphor",
        primitive: "radix",
        iconSet: "phosphor",
        path: "b",
      },
    ],
  };
  const meta = ossMeta(
    source,
    component,
    {
      "spinner-radix-lucide": {
        title: "Spinner",
        description: "A spinner for loading states.",
      },
    },
    "2026-10-12",
  );
  assert.equal(meta.status, "beta");
  assert.equal(meta.variants[1].status, "beta");
  assert.equal(meta.source.commit, source.ref);
  assert.deepEqual(meta.credits, ["S-099"]);
  assert.equal(meta.attribution, source.attribution);
  assert.equal(meta.defaultVariant, "spinner-radix-lucide");
});

test("an export may only touch its own content and the citation registry", () => {
  assert.deepEqual(
    exportScopeProblems("design-from-app", [
      "content/components/design-from-app/card/meta.json",
      "docs/sources/registry.yaml",
    ]),
    [],
  );
  assert.equal(
    exportScopeProblems("design-from-app", [
      ".github/workflows/ci.yml",
      "content/components/labs-examples/x/meta.json",
    ]).length,
    2,
  );
});

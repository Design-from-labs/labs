// The optional `stage` field of meta.json (contract revision 3,
// docs/decisions/0015-layout-stages.md): additive, so revision-2 sidecars
// stay valid, and strict about its values.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import Ajv2020 from "ajv/dist/2020.js";

const schema = JSON.parse(
  readFileSync(new URL("../schemas/meta.schema.json", import.meta.url), "utf8"),
);
const validate = new Ajv2020({ allErrors: true, strict: false }).compile(
  schema,
);

const base = {
  schemaVersion: 1,
  name: "sidebar",
  title: "Sidebar",
  description: "App navigation for a shell.",
  status: "ready",
  category: "navigation",
  variants: [
    {
      name: "sidebar-lucide",
      primitive: "none",
      iconSet: "lucide",
      status: "ready",
    },
  ],
  defaultVariant: "sidebar-lucide",
  demo: "demo.tsx",
  preview: "preview.webp",
  source: { repo: "private source", commit: "a".repeat(40) },
  author: "Design From Labs <https://labs.designfrom.com>",
  license: "MIT",
  credits: ["S-003"],
  date: "2026-10-12",
};

test("a sidecar without a stage is still valid (revision 2)", () => {
  assert.equal(validate(base), true, JSON.stringify(validate.errors));
});

test("a full stage is valid", () => {
  const meta = {
    ...base,
    stage: {
      device: "laptop",
      slot: "sidebar-start",
      shell: "docs",
      height: 640,
    },
  };
  assert.equal(validate(meta), true, JSON.stringify(validate.errors));
});

test("device and slot are required, and only known values pass", () => {
  for (const stage of [
    { device: "laptop" },
    { slot: "header" },
    { device: "watch", slot: "header" },
    { device: "phone", slot: "left" },
    { device: "phone", slot: "header", shell: "blog" },
    { device: "phone", slot: "header", height: 100 },
    { device: "phone", slot: "header", height: 640.5 },
    { device: "phone", slot: "header", theme: "dark" },
  ]) {
    assert.equal(validate({ ...base, stage }), false, JSON.stringify(stage));
  }
});

test("only components may be staged", () => {
  const meta = {
    ...base,
    kind: "hook",
    stage: { device: "phone", slot: "inline" },
  };
  assert.equal(validate(meta), false);
});

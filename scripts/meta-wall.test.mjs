// The optional `tile` and `loop` fields of meta.json (contract revision 4,
// docs/decisions/0019-specimen-wall.md and 0020-specimen-loops.md).
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
  name: "button",
  title: "Button",
  description: "A button with variants.",
  status: "ready",
  category: "actions",
  variants: [
    {
      name: "button-radix-lucide",
      primitive: "radix",
      iconSet: "lucide",
      status: "ready",
    },
  ],
  defaultVariant: "button-radix-lucide",
  demo: "demo.tsx",
  preview: "preview.webp",
  source: { repo: "private source", commit: "a".repeat(40) },
  author: "Design From Labs <https://labs.designfrom.com>",
  license: "MIT",
  credits: ["S-003"],
  date: "2026-10-12",
};
const ok = (meta) =>
  validate(meta) || assert.fail(JSON.stringify(validate.errors));

test("tile and loop are optional (revision 3 sidecars stay valid)", () => {
  ok(base);
});

test("valid tiles and loops pass", () => {
  ok({ ...base, tile: { span: 2, rows: 3, surface: "dark" } });
  ok({ ...base, tile: {} });
  ok({
    ...base,
    loop: { script: "hover[4] → press[4] → release[4] → idle", duration: 5600 },
  });
  ok({ ...base, loop: { script: "click -> wait -> click[2]", hydrate: true } });
  ok({ ...base, loop: { hydrate: true } });
});

test("unknown sizes, surfaces and steps fail", () => {
  for (const extra of [
    { tile: { span: 3 } },
    { tile: { rows: 4 } },
    { tile: { surface: "blue" } },
    { tile: { width: 2 } },
    { loop: { script: "hover → jump" } },
    { loop: { script: "hover[123]" } },
    { loop: { script: "" } },
    { loop: { duration: 100 } },
    { loop: { duration: 60000 } },
    { loop: { script: "hover", repeat: 3 } },
  ]) {
    assert.equal(validate({ ...base, ...extra }), false, JSON.stringify(extra));
  }
});

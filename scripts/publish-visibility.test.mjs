import assert from "node:assert/strict";
import { test } from "node:test";
import { includeBeta, isShown } from "./lib/content.mjs";
import { siteData } from "./lib/publish.mjs";

const meta = (status, variantStatus = status) => ({
  schemaVersion: 1,
  name: "thing",
  title: "Thing",
  description: "A thing for the visibility tests.",
  status,
  category: "feedback",
  variants: [
    {
      name: "thing",
      primitive: "none",
      iconSet: "none",
      status: variantStatus,
    },
  ],
  defaultVariant: "thing",
  demo: "demo.tsx",
  source: { repo: "private source", commit: "a".repeat(40) },
  author: "Tester <https://example.com>",
  license: "MIT",
  credits: [],
  date: "2026-10-12",
});
const entry = (m) => ({
  sourceId: "labs-examples",
  name: m.name,
  rel: `content/components/labs-examples/${m.name}`,
  meta: m,
  items: new Map([
    [
      "thing",
      {
        name: "thing",
        type: "registry:ui",
        docs: "Installed Thing.",
        files: [
          {
            path: "registry/thing/thing.tsx",
            type: "registry:ui",
            content: "export function Thing() {\n  return null;\n}\n",
          },
        ],
      },
    ],
  ]),
});

test("includeBeta: Vercel preview deployments and the local flag only", () => {
  assert.equal(includeBeta({}), false);
  assert.equal(includeBeta({ VERCEL_ENV: "production" }), false);
  assert.equal(includeBeta({ VERCEL_ENV: "preview" }), true);
  assert.equal(includeBeta({ LABS_INCLUDE_BETA: "1" }), true);
  assert.equal(includeBeta({ LABS_INCLUDE_BETA: "true" }), false);
});

test("isShown: ready always, beta only when asked, never draft", () => {
  const ready = meta("ready");
  assert.equal(isShown(ready, ready.variants[0], false), true);
  const beta = meta("beta");
  assert.equal(isShown(beta, beta.variants[0], false), false);
  assert.equal(isShown(beta, beta.variants[0], true), true);
  const draft = meta("draft");
  assert.equal(isShown(draft, draft.variants[0], true), false);
  const mixed = meta("ready", "draft");
  assert.equal(isShown(mixed, mixed.variants[0], true), false);
});

test("siteData: a beta entry appears, labeled, only on a beta build", () => {
  const components = [entry(meta("beta"))];
  const off = siteData(components, new Map(), [], false);
  assert.equal(off.entries.length, 0);
  assert.equal(off.published.length, 0);
  const on = siteData(components, new Map(), [], true);
  assert.equal(on.entries.length, 1);
  assert.equal(on.entries[0].status, "beta");
  assert.equal(on.published.length, 1);
  assert.equal(on.published[0].item.meta.status, "beta");
});

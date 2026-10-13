// Guards for the canvas effects of decision 0021: Holo Sticker, Holo Foil,
// Lenticular and Iridescent Ribbon draw through the shared render-loop helper
// and keep a static fallback; any item that imports the helper declares it;
// the helper keeps its lifecycle duties.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { loadComponents, ROOT } from "./lib/content.mjs";

const EFFECTS = [
  "holo-sticker",
  "holo-foil",
  "lenticular",
  "iridescent-ribbon",
];
const items = loadComponents().flatMap((entry) =>
  [...entry.items.values()].map((item) => ({
    component: entry.meta?.name,
    item,
    source: (item.files ?? []).map((file) => file.content ?? "").join("\n"),
  })),
);

for (const name of EFFECTS) {
  const found = items.filter((i) => i.component === name);

  test(`${name}: exists`, () => {
    assert.ok(found.length > 0);
  });

  for (const { item, source } of found) {
    test(`${item.name}: draws through the render-loop helper`, () => {
      assert.ok(item.registryDependencies?.includes("render-loop"));
      assert.match(source, /from "@\/lib\/render-loop"/);
      assert.match(source, /useRenderLoop</);
    });

    test(`${item.name}: has a fallback and reports its status`, () => {
      assert.match(source, /data-status=\{/);
      assert.match(source, /fallback/);
    });
  }
}

for (const { item, source } of items) {
  if (/from "@\/lib\/render-loop"/.test(source)) {
    test(`${item.name}: lists render-loop in registryDependencies`, () => {
      assert.ok(item.registryDependencies?.includes("render-loop"));
    });
  }
}

test("render-loop: pixel ratio cap, observers, visibility and context loss", () => {
  const helper = readFileSync(
    join(ROOT, "examples", "render-loop", "render-loop.ts"),
    "utf8",
  );
  assert.match(helper, /maxDpr = 2/);
  assert.match(helper, /new ResizeObserver/);
  assert.match(helper, /new IntersectionObserver/);
  assert.match(helper, /"visibilitychange"/);
  assert.match(helper, /"webglcontextlost"/);
  assert.match(helper, /"webglcontextrestored"/);
  assert.match(helper, /useReducedMotion\(\)/);
});

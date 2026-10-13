// Guards for components that ship their own CSS keyframes (for example the
// yui540/css-animations ports): keyframe names and custom properties carry
// the component's name, and every such file has a reduced-motion fallback.
import assert from "node:assert/strict";
import { test } from "node:test";
import { loadComponents } from "./lib/content.mjs";

// A keyframes rule whose frames never change anything moves nothing, so it
// needs no reduced-motion fallback: Glimm's View Transition "hold" keeps a
// snapshot pair alive for the length of the sweep (opacity 1 to opacity 1).
// Glimm's own reduced-motion handling is in its provider (`reducedMotion`).
const STATIC_HOLDS = ["glimm-snapshot-hold"];
const moves = (content) =>
  [...content.matchAll(/@keyframes\s+([\w-]+)/g)].some(
    ([, name]) => !STATIC_HOLDS.includes(name),
  );

const withKeyframes = loadComponents().flatMap((entry) =>
  [...entry.items.values()].flatMap((item) =>
    (item.files ?? [])
      .filter((file) => moves(file.content ?? ""))
      .map((file) => ({ component: entry.meta?.name, item, file })),
  ),
);

test("keyframe items exist", () => {
  assert.ok(withKeyframes.length > 0);
});

for (const { component, item, file } of withKeyframes) {
  test(`${item.name}: keyframes and variables are prefixed with ${component}`, () => {
    for (const [, name] of file.content.matchAll(/@keyframes\s+([\w-]+)/g)) {
      assert.ok(
        name.startsWith(`${component}-`),
        `@keyframes ${name} must start with ${component}-`,
      );
    }
    for (const [, name] of file.content.matchAll(/var\(--([\w-]+)/g)) {
      assert.ok(
        name.startsWith(`${component}-`),
        `--${name} must start with ${component}-`,
      );
    }
  });

  test(`${item.name}: has a prefers-reduced-motion fallback`, () => {
    assert.match(file.content, /@media \(prefers-reduced-motion: reduce\)/);
  });
}

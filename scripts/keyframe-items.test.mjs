// Guards for components that ship their own CSS keyframes (for example the
// yui540/css-animations ports): keyframe names and custom properties carry
// the component's name, and every such file has a reduced-motion fallback.
import assert from "node:assert/strict";
import { test } from "node:test";
import { loadComponents } from "./lib/content.mjs";

const withKeyframes = loadComponents().flatMap((entry) =>
  [...entry.items.values()].flatMap((item) =>
    (item.files ?? [])
      .filter((file) => /@keyframes\s/.test(file.content ?? ""))
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

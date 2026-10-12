import assert from "node:assert/strict";
import { test } from "node:test";
import { parseAllow, scanText, setAllow } from "./check-external-refs-core.mjs";

// Synthetic patterns only: the real ones are never written in the tree.
const PATTERNS = [/\bacme\b/i, /acme\.example/i, /\bwidgetco\b/i];
const hits = (text) => scanText(text, PATTERNS).map(({ index }) => index);

test("parseAllow drops comments and blank lines", () => {
  assert.deepEqual(parseAllow("# c\n\nacme\n  acme labs  \n"), [
    "acme",
    "acme labs",
  ]);
});

test("an allowed phrase is neutralized case-insensitively", () => {
  setAllow(["acme"]);
  assert.deepEqual(hits("Install ACME today"), []);
  assert.deepEqual(hits("npx acme add button"), []);
  setAllow([]);
});

test("an allowed phrase never hides a domain or a longer word", () => {
  setAllow(["acme"]);
  assert.deepEqual(hits("mail me at a@acme.example"), [0, 1]);
  assert.deepEqual(hits("www.acme.example"), [0, 1]);
  setAllow([]);
});

test("other patterns still match on the same line", () => {
  setAllow(["acme"]);
  assert.deepEqual(hits("acme and widgetco"), [2]);
  setAllow([]);
});

test("a longer allowed phrase covers a domain explicitly", () => {
  setAllow(["labs.acme.example"]);
  assert.deepEqual(hits("https://labs.acme.example/r/x.json"), []);
  assert.deepEqual(hits("https://acme.example"), [0, 1]);
  setAllow([]);
});

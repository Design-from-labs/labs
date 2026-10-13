import assert from "node:assert/strict";
import { test } from "node:test";
import { envProblems } from "./lib/validate.mjs";

test("envProblems allows only process.env.NODE_ENV", () => {
  assert.deepEqual(
    envProblems('const dev = process.env.NODE_ENV !== "production";'),
    [],
  );
  assert.deepEqual(envProblems("if (process.env . NODE_ENV) {}"), []);
});

test("envProblems refuses every other environment read", () => {
  assert.deepEqual(envProblems("const k = process.env.API_KEY;"), [
    "process.env.API_KEY",
  ]);
  assert.deepEqual(envProblems("const all = process.env;"), [
    "process.env (other than .NODE_ENV)",
  ]);
  assert.deepEqual(envProblems('const x = process.env["NODE_ENV"];'), [
    "process.env (other than .NODE_ENV)",
  ]);
  assert.deepEqual(envProblems("const { A } = process.env;"), [
    "process.env (other than .NODE_ENV)",
  ]);
  assert.deepEqual(envProblems("const m = import.meta.env.MODE;"), [
    "import.meta.env",
  ]);
});

test("envProblems ignores comments", () => {
  assert.deepEqual(
    envProblems("// process.env.SECRET\n/* import.meta.env */\nconst a = 1;"),
    [],
  );
});

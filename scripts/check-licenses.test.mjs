import assert from "node:assert/strict";
import { test } from "node:test";
import {
  checkEntryLicense,
  checkOssSources,
  licenseAllowed,
} from "./lib/licenses.mjs";

const credits = new Map([
  ["S-001", { id: "S-001", url: "https://example.com" }],
  ["S-002", { id: "S-002" }],
]);
const oss = {
  id: "acme",
  name: "Acme",
  repo: "https://github.com/acme/ui",
  visibility: "public",
  status: "active",
  fetch: "pinned-git",
  ref: "a".repeat(40),
  author: "Acme <https://acme.example>",
  license: "MIT",
  attribution: "Copyright (c) 2025 Acme. MIT License.",
  credit: "S-001",
  components: [],
  section: "oss",
};
const sources = (extra = []) => {
  const all = [
    { id: "mine", visibility: "public", status: "active", section: "sources" },
    { id: "priv", visibility: "private", status: "active", section: "sources" },
    oss,
    ...extra,
  ];
  return {
    oss: all.filter((s) => s.section === "oss"),
    byId: new Map(all.map((s) => [s.id, s])),
  };
};
const entry = (sourceId, meta) => ({
  sourceId,
  rel: `content/components/${sourceId}/x`,
  meta,
});
const okMeta = {
  license: "MIT",
  credits: ["S-001"],
  source: { repo: "https://github.com/x/y", commit: "b".repeat(40) },
};

test("licenseAllowed follows the allowlist and SPDX OR/AND", () => {
  assert.equal(licenseAllowed("MIT"), true);
  assert.equal(licenseAllowed("MIT OR GPL-3.0"), true);
  assert.equal(licenseAllowed("MIT AND GPL-3.0"), false);
  assert.equal(licenseAllowed("GPL-3.0-only"), false);
  assert.equal(licenseAllowed("CC-BY-NC-4.0"), false);
  assert.equal(licenseAllowed("Apache-2.0 WITH LLVM-exception"), false);
  assert.equal(licenseAllowed(""), false);
  assert.equal(licenseAllowed(undefined), false);
});

test("a first-party MIT component passes", () => {
  assert.deepEqual(
    checkEntryLicense(entry("mine", okMeta), sources(), credits),
    [],
  );
});

test("a refused license or unknown credit fails", () => {
  const problems = checkEntryLicense(
    entry("mine", { ...okMeta, license: "GPL-3.0-only", credits: ["S-404"] }),
    sources(),
    credits,
  );
  assert.equal(problems.length, 2);
});

test("a private source must say private source", () => {
  assert.match(
    checkEntryLicense(entry("priv", okMeta), sources(), credits)[0],
    /private source/,
  );
});

test("a third-party component without attribution or pinned commit fails", () => {
  const meta = {
    ...okMeta,
    author: "Acme",
    source: { repo: oss.repo, commit: "c".repeat(40) },
  };
  const problems = checkEntryLicense(
    entry("acme", meta),
    sources(),
    credits,
  ).join("\n");
  assert.match(problems, /author must include a link/);
  assert.match(problems, /attribution notice/);
  assert.match(problems, /pinned ref/);
});

test("a complete third-party component passes", () => {
  const meta = {
    ...okMeta,
    author: oss.author,
    attribution: oss.attribution,
    source: { repo: oss.repo, commit: oss.ref },
  };
  assert.deepEqual(
    checkEntryLicense(entry("acme", meta), sources(), credits),
    [],
  );
});

test("oss entries need a pinned SHA, an allowed license and a linked credit", () => {
  const bad = {
    ...oss,
    id: "bad",
    ref: "main",
    license: "AGPL-3.0",
    credit: "S-002",
  };
  const problems = checkOssSources({ oss: [oss, bad] }, credits).join("\n");
  assert.match(problems, /full commit SHA/);
  assert.match(problems, /AGPL-3.0/);
  assert.match(problems, /with a url/);
  assert.equal(checkOssSources({ oss: [oss] }, credits).length, 0);
});

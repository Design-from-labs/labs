import assert from "node:assert/strict";
import { test } from "node:test";
import { exportPort, licenseFooter } from "./export-ports.mjs";
import { loadSources } from "./lib/content.mjs";

const source = (id) => loadSources().oss.find((s) => s.id === id);

test("licenseFooter: attribution and license text in one closed comment", () => {
  const footer = licenseFooter(
    "Copyright (c) 2025 Acme. MIT License.",
    "MIT License\n\nPermission is granted */ even here.\n",
  );
  assert.match(
    footer,
    /^\n\/\*\n \* Copyright \(c\) 2025 Acme\. MIT License\.\n \*\n/,
  );
  assert.match(footer, / \* Permission is granted \* \/ even here\./);
  assert.equal(footer.match(/\*\//g).length, 1, "only the closing */");
  assert.ok(footer.endsWith(" */\n"));
});

test("exportPort: provenance comes from sources.yaml and every file ends with the notice", () => {
  const torph = source("torph");
  const files = exportPort("torph", "text-morph", torph);
  const meta = JSON.parse(files["meta.json"]);
  assert.equal(meta.source.repo, torph.repo);
  assert.equal(meta.source.commit, torph.ref);
  assert.equal(meta.license, torph.license);
  assert.equal(meta.attribution, torph.attribution);
  assert.equal(meta.credits[0], torph.credit);
  assert.equal(meta.status, "beta");
  const item = JSON.parse(files["items/text-morph.json"]);
  assert.ok(item.files.length >= 2);
  for (const file of item.files) {
    assert.ok(
      file.content.includes(torph.attribution),
      `${file.path} has the attribution`,
    );
    assert.ok(
      file.content.includes("Permission is hereby granted"),
      `${file.path} has the license text`,
    );
  }
});

test("exportPort: the Phosphor item differs only in its icon imports", () => {
  const files = exportPort("goey-toast", "gooey-toast", source("goey-toast"));
  const lucide = JSON.parse(files["items/gooey-toast-lucide.json"]);
  const phosphor = JSON.parse(files["items/gooey-toast-phosphor.json"]);
  assert.ok(phosphor.dependencies.includes("@phosphor-icons/react@^2"));
  assert.ok(!phosphor.dependencies.some((d) => d.startsWith("lucide-react")));
  const byName = (item) =>
    Object.fromEntries(
      item.files.map((f) => [f.path.split("/").pop(), f.content]),
    );
  const a = byName(lucide);
  const b = byName(phosphor);
  for (const name of Object.keys(a)) {
    if (name === "gooey-toast-icons.tsx") {
      assert.match(b[name], /from "@phosphor-icons\/react\/ssr"/);
      assert.doesNotMatch(b[name], /lucide-react/);
    } else {
      assert.equal(a[name], b[name], `${name} is shared`);
    }
  }
});

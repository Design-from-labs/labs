import assert from "node:assert/strict";
import { test } from "node:test";
import {
  exportPort,
  licenseFooter,
  portFooters,
  toPhosphorTyped,
} from "./export-ports.mjs";
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

// The variants shape (primitive overlays, nested targets) uses a type-aware
// Lucide -> Phosphor rewrite.
const MAP = {
  ChevronDown: "CaretDownIcon",
  X: "XIcon",
  LucideIcon: "Icon",
  LucideProps: "IconProps",
};

test("toPhosphorTyped rewrites value imports and their uses", () => {
  const out = toPhosphorTyped(
    'import { ChevronDown, X } from "lucide-react";\nconst a = <ChevronDown />;\nconst b = <X className="x" />;\n',
    MAP,
    "t",
  );
  assert.match(
    out,
    /import \{ CaretDownIcon, XIcon \} from "@phosphor-icons\/react\/ssr";/,
  );
  assert.match(out, /<CaretDownIcon \/>/);
  assert.match(out, /<XIcon className="x" \/>/);
  assert.doesNotMatch(out, /lucide-react/);
});

test("toPhosphorTyped maps type imports, inline type specifiers and aliases", () => {
  const out = toPhosphorTyped(
    'import type { LucideIcon } from "lucide-react";\nimport { type LucideProps, X as Close } from "lucide-react";\ntype A = { icon: LucideIcon; p: LucideProps };\nconst c = <Close />;\n',
    MAP,
    "t",
  );
  assert.match(
    out,
    /import type \{ Icon \} from "@phosphor-icons\/react\/ssr";/,
  );
  assert.match(out, /import \{ type IconProps, XIcon as Close \}/);
  assert.match(out, /icon: Icon; p: IconProps/);
  assert.match(out, /<Close \/>/);
});

test("toPhosphorTyped leaves longer identifiers and member access alone", () => {
  const out = toPhosphorTyped(
    'import { X } from "lucide-react";\nconst Xylophone = 1;\nobj.X = 2;\n<X />;\n',
    MAP,
    "t",
  );
  assert.match(out, /const Xylophone = 1;/);
  assert.match(out, /obj\.X = 2;/);
  assert.match(out, /<XIcon \/>/);
});

test("toPhosphorTyped refuses an icon missing from the map", () => {
  assert.throws(
    () =>
      toPhosphorTyped(
        'import { Bell } from "lucide-react";',
        MAP,
        "item/x.tsx",
      ),
    /item\/x\.tsx: icons\.json has no Phosphor name for Bell/,
  );
});

test("exportPort (variants): an item per icon set, nested targets, the notice in every file", () => {
  const lifeline = source("lifeline");
  const files = exportPort("lifeline", "lifeline", lifeline);
  const meta = JSON.parse(files["meta.json"]);
  assert.deepEqual(
    meta.variants.map((v) => v.name),
    ["lifeline-lucide", "lifeline-phosphor"],
  );
  const item = JSON.parse(files["items/lifeline-phosphor.json"]);
  assert.ok(item.dependencies.includes("@phosphor-icons/react@^2"));
  for (const file of item.files) {
    assert.ok(file.target.startsWith("components/lifeline/"), file.path);
    assert.ok(
      file.content.includes(lifeline.attribution),
      `${file.path} has the attribution`,
    );
    assert.doesNotMatch(file.content, /from "lucide-react"/);
  }
});

test("licenseFooter normalises CRLF license text", () => {
  const footer = licenseFooter(
    "Copyright (c) 2025 Acme.",
    "MIT License\r\n\r\nText\r\n",
  );
  assert.doesNotMatch(footer, /\r/);
  assert.match(footer, / \* MIT License\n \*\n \* Text\n/);
});

test("exportPort (variants): a style with its own icon sets beside an icon-free default", () => {
  const files = exportPort(
    "simpleplayer",
    "video-player",
    source("simpleplayer"),
  );
  const meta = JSON.parse(files["meta.json"]);
  assert.deepEqual(
    meta.variants.map((v) => [v.name, v.style ?? null, v.iconSet]),
    [
      ["video-player", null, "none"],
      ["video-player-icons-lucide", "icons", "lucide"],
      ["video-player-icons-phosphor", "icons", "phosphor"],
    ],
  );
  assert.equal(meta.defaultVariant, "video-player");
  assert.equal(meta.variants[1].label, "Icon library");
  const plain = JSON.parse(files["items/video-player.json"]);
  assert.ok(!plain.dependencies?.some((d) => d.startsWith("lucide-react")));
  const lucide = JSON.parse(files["items/video-player-icons-lucide.json"]);
  assert.equal(lucide.title, "Video Player (Icon library, Lucide)");
  assert.ok(lucide.dependencies.includes("lucide-react@^1"));
test("portFooters: an upstream NOTICE and change notice travel; licenseFile carries the full text once", () => {
  const source = {
    attribution: "Copyright 2026 Noor Mtir. Apache License 2.0.",
    license: "Apache-2.0",
  };
  const every = portFooters("paperlab", source, {
    changeNotice: "Modified by Design From Labs.",
  });
  assert.match(every("a.ts"), /Apache License/);
  assert.match(every("a.ts"), / \* ---- Upstream NOTICE ----/);
  assert.match(every("a.ts"), /Modified by Design From Labs\./);
  const once = portFooters("paperlab", source, {
    licenseFile: "paper.tsx",
    changeNotice: "Modified by Design From Labs.",
  });
  assert.match(once("paper.tsx"), /TERMS AND CONDITIONS FOR USE/);
  assert.match(once("paper.tsx"), /Upstream NOTICE/);
  assert.doesNotMatch(once("paper-mesh.tsx"), /TERMS AND CONDITIONS FOR USE/);
  assert.match(once("paper-mesh.tsx"), /the upstream NOTICE end paper\.tsx/);
  assert.match(once("paper-mesh.tsx"), /Modified by Design From Labs\./);
  assert.equal(once("paper-mesh.tsx").match(/\*\//g).length, 1);
});

test("exportPort: MessageActions keeps upstream's glyphs by default and offers an icon-library style", () => {
  const files = exportPort("aicss", "message-actions", source("aicss"));
  const meta = JSON.parse(files["meta.json"]);
  assert.equal(meta.defaultVariant, "message-actions-base");
  assert.deepEqual(meta.variants.map((v) => v.name).sort(), [
    "message-actions-aria",
    "message-actions-base",
    "message-actions-icons-aria-lucide",
    "message-actions-icons-aria-phosphor",
    "message-actions-icons-base-lucide",
    "message-actions-icons-base-phosphor",
    "message-actions-icons-radix-lucide",
    "message-actions-icons-radix-phosphor",
    "message-actions-radix",
  ]);
  for (const variant of meta.variants) {
    const item = JSON.parse(files[`items/${variant.name}.json`]);
    // The variant's own file plus the shared ones, flattened.
    assert.deepEqual(item.files.map((f) => f.path.split("/").pop()).sort(), [
      "message-actions-emojis.ts",
      "message-actions-icons.tsx",
      "message-actions-shared.tsx",
      "message-actions-styles.ts",
      "message-actions.tsx",
    ]);
    const pkg = {
      radix: "radix-ui",
      base: "@base-ui/react",
      aria: "react-aria-components",
    }[variant.primitive];
    assert.ok(item.dependencies.some((d) => d.startsWith(pkg)));
    const icons = item.files.find((f) => f.path.endsWith("-icons.tsx"));
    if (variant.iconSet === "none") {
      assert.doesNotMatch(
        icons.content,
        /from "(lucide-react|@phosphor-icons)/,
      );
      assert.match(icons.content, /mouthHappy/);
    } else if (variant.iconSet === "phosphor") {
      assert.match(icons.content, /from "@phosphor-icons\/react\/ssr"/);
      assert.doesNotMatch(icons.content, /lucide-react/);
    } else {
      assert.match(icons.content, /from "lucide-react"/);
    }
  }
});

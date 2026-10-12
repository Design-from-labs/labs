import { readFileSync } from "node:fs";
import { defineConfig } from "tsdown";

// Entry points come from the published registry items
// (scripts/prepare-content.mjs writes src/generated/entries.json).
const entries: string[] = JSON.parse(
  readFileSync(
    new URL("./src/generated/entries.json", import.meta.url),
    "utf8",
  ),
);

export default defineConfig({
  entry: Object.fromEntries(
    entries.map((subpath) => [
      `${subpath}/index`,
      `src/generated/${subpath}/index.ts`,
    ]),
  ),
  format: "esm",
  platform: "neutral",
  target: "es2022",
  // One output file per source module keeps each "use client" directive on
  // the module that needs it (scripts/after-build.mjs verifies it).
  unbundle: true,
  dts: true,
  hash: false,
  fixedExtension: false,
  clean: true,
  sourcemap: false,
});

import { defineConfig } from "tsdown";

// Single ESM bundle for Node. The shebang in src/index.ts is preserved.
export default defineConfig({
  entry: ["src/index.ts"],
  format: "esm",
  platform: "node",
  target: "node20",
  dts: false,
  // Emit dist/index.js (the package is type: module) instead of index.mjs.
  fixedExtension: false,
  clean: true,
  sourcemap: false,
});

// After tsdown: every emitted module whose source starts with "use client"
// must start with it too (React Server Components need the directive on the
// module itself). Fails the build if one is missing, instead of shipping a
// library that breaks in a server component.
import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join, relative } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const src = join(root, "src", "generated");
const dist = join(root, "dist");

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

let fixed = 0;
for (const file of walk(src)) {
  if (!/\.(tsx?)$/.test(file)) {
    continue;
  }
  const text = readFileSync(file, "utf8");
  const body = text.replace(/^\/\*\*[\s\S]*?\*\/\s*/, "");
  if (!body.startsWith('"use client"')) {
    continue;
  }
  const out = join(dist, "generated", relative(src, file)).replace(
    /\.tsx?$/,
    ".js",
  );
  const alt = join(dist, relative(src, file)).replace(/\.tsx?$/, ".js");
  const target = existsSync(out) ? out : alt;
  if (!existsSync(target)) {
    throw new Error(`after-build: no output for ${relative(root, file)}`);
  }
  const js = readFileSync(target, "utf8");
  if (!js.trimStart().startsWith('"use client"')) {
    writeFileSync(target, `"use client";\n${js}`);
    fixed += 1;
  }
}
process.stdout.write(`after-build: "use client" verified (${fixed} added).\n`);

#!/usr/bin/env node
// Regenerates the gallery stills (meta.json `preview`) from each entry's
// default-variant demo: a 1200x750 screenshot of /preview/<item>, encoded as
// WebP with sharp (S-024) and kept under the 200 KB contract limit.
//
//   pnpm build:site && pnpm preview &   (or any server for dist/)
//   node scripts/previews.mjs [--base http://localhost:4321] [--source labs-examples] [--all]
//
// By default only the Labs examples are regenerated; previews of other
// sources come with their export.
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";
import sharp from "sharp";
import { loadComponents, publishedVariants } from "./lib/content.mjs";

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const index = args.indexOf(name);
  return index === -1 ? fallback : args[index + 1];
};
const base = flag("--base", "http://localhost:4321");
const all = args.includes("--all");
const source = flag("--source", "labs-examples");
const MAX = 200 * 1024;

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1200, height: 750 },
  deviceScaleFactor: 1,
  colorScheme: "light",
  reducedMotion: "reduce",
});
let count = 0;
for (const entry of loadComponents()) {
  const { meta } = entry;
  if (
    !meta?.preview ||
    meta.status !== "ready" ||
    (!all && entry.sourceId !== source)
  ) {
    continue;
  }
  const variant = publishedVariants(meta).find(
    (v) => v.name === meta.defaultVariant,
  );
  if (!variant) {
    continue;
  }
  await page.goto(`${base}/preview/${variant.name}`, {
    waitUntil: "networkidle",
  });
  await page.evaluate(() => document.fonts.ready);
  const png = await page.locator("[data-preview]").screenshot({ type: "png" });
  let quality = 80;
  let webp = await sharp(png).webp({ quality, effort: 6 }).toBuffer();
  while (webp.length > MAX && quality > 40) {
    quality -= 10;
    webp = await sharp(png).webp({ quality, effort: 6 }).toBuffer();
  }
  writeFileSync(join(entry.dir, meta.preview), webp);
  process.stdout.write(
    `${entry.rel}/${meta.preview}: ${Math.round(webp.length / 1024)} KB (q${quality})\n`,
  );
  count += 1;
}
await browser.close();
process.stdout.write(`previews: ${count} written.\n`);

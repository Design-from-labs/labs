// vercel.json headers: the site may never be framed by another origin, but
// the stage documents (/stage/*) must be framable by the site itself, or every
// device frame is blank on Vercel (docs/pitfalls.md, P-032). The local preview
// does not apply vercel.json, so only this test sees it before deployment.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const config = JSON.parse(
  readFileSync(new URL("../vercel.json", import.meta.url), "utf8"),
);

/** The headers Vercel sends for `path` (later rules override earlier ones). */
function headersFor(path) {
  const out = {};
  for (const rule of config.headers) {
    // The sources here are regex groups in path-to-regexp syntax, which read
    // the same as an anchored regular expression.
    if (new RegExp(`^${rule.source}$`).test(path)) {
      for (const { key, value } of rule.headers) {
        out[key.toLowerCase()] = value;
      }
    }
  }
  return out;
}

test("site pages refuse to be framed", () => {
  for (const path of ["/", "/ui", "/ui/sidebar", "/credits", "/stagecraft"]) {
    assert.equal(headersFor(path)["x-frame-options"], "DENY", path);
  }
});

test("stage documents can be framed by the site only", () => {
  for (const path of [
    "/stage/live/sidebar-lucide",
    "/stage/still/sidebar-phosphor",
  ]) {
    const headers = headersFor(path);
    assert.equal(headers["x-frame-options"], "SAMEORIGIN", path);
    assert.equal(headers["content-security-policy"], "frame-ancestors 'self'");
    assert.equal(headers["x-content-type-options"], "nosniff");
  }
});

#!/usr/bin/env node
// Link check on credits: every public url in docs/sources/registry.yaml,
// every link in a component's author, source and third-party sources.
// A link passes on 2xx/3xx. 401/403/429 count as reachable but guarded
// (some hosts refuse automated requests) and are reported as warnings.
// Exit 0 ok, 1 broken links.
import { loadComponents, loadCredits, loadSources } from "./lib/content.mjs";

const TIMEOUT_MS = 15_000;
const RETRIES = 2;
const GUARDED = new Set([401, 403, 429]);

function collect() {
  const urls = new Map();
  // The site's own domain is not a credit, and it is not live before the
  // owner approves DNS; its pages are covered by the smoke tests instead.
  const add = (url, where) => {
    if (
      url &&
      /^https:\/\//.test(url) &&
      !url.startsWith("https://labs.designfrom.com")
    ) {
      urls.set(url, [...(urls.get(url) ?? []), where]);
    }
  };
  for (const credit of loadCredits().values()) {
    add(credit.url, `docs/sources/registry.yaml ${credit.id}`);
  }
  for (const source of loadSources().oss) {
    add(source.repo, `sources.yaml ${source.id}`);
  }
  for (const entry of loadComponents()) {
    const meta = entry.meta;
    if (!meta) {
      continue;
    }
    add(/<(https:[^>]+)>/.exec(meta.author ?? "")?.[1], `${entry.rel} author`);
    if (meta.source?.repo !== "private source") {
      add(meta.source?.repo, `${entry.rel} source`);
    }
  }
  return urls;
}

async function probe(url) {
  let last = "";
  for (let attempt = 0; attempt <= RETRIES; attempt += 1) {
    for (const method of ["HEAD", "GET"]) {
      try {
        const response = await fetch(url, {
          method,
          redirect: "follow",
          signal: AbortSignal.timeout(TIMEOUT_MS),
          headers: {
            "user-agent":
              "design-from-labs-link-check (+https://labs.designfrom.com/credits)",
          },
        });
        if (response.ok) {
          return { ok: true, status: response.status };
        }
        if (GUARDED.has(response.status)) {
          return { ok: true, guarded: true, status: response.status };
        }
        last = `HTTP ${response.status}`;
        if (method === "GET" && response.status < 500) {
          return { ok: false, status: last };
        }
      } catch (error) {
        last = error.name === "TimeoutError" ? "timeout" : error.message;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
  }
  return { ok: false, status: last };
}

const urls = collect();
const results = await Promise.all(
  [...urls.keys()].map(async (url) => ({ url, ...(await probe(url)) })),
);
let broken = 0;
for (const result of results.sort((a, b) => a.url.localeCompare(b.url))) {
  if (!result.ok) {
    broken += 1;
    process.stderr.write(
      `broken: ${result.url} (${result.status}) in ${urls.get(result.url).join(", ")}\n`,
    );
  } else if (result.guarded) {
    process.stdout.write(
      `warning: ${result.url} answered ${result.status} (reachable, refuses automated requests)\n`,
    );
  }
}
if (broken > 0) {
  process.stderr.write(`check-links: ${broken} broken of ${urls.size}.\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`check-links: ok (${urls.size} links).\n`);
}

#!/usr/bin/env node
// Refuses components whose license does not allow redistribution, or that
// lack attribution (docs/contract.md, section 6). Exit 0 clean, 1 problems.
import { loadComponents, loadCredits, loadSources } from "./lib/content.mjs";
import { checkEntryLicense, checkOssSources } from "./lib/licenses.mjs";

const sources = loadSources();
const credits = loadCredits();
const components = loadComponents();
const problems = [
  ...checkOssSources(sources, credits),
  ...components.flatMap((entry) => checkEntryLicense(entry, sources, credits)),
];
for (const problem of problems) {
  process.stderr.write(`${problem}\n`);
}
if (problems.length > 0) {
  process.stderr.write(`check-licenses: ${problems.length} problem(s).\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(
    `check-licenses: ok (${components.length} entries, ${sources.oss.length} third-party sources).\n`,
  );
}

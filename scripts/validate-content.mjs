#!/usr/bin/env node
// Validates content/components/** against docs/contract.md.
//   node scripts/validate-content.mjs                  previews required
//   node scripts/validate-content.mjs --no-previews    previews may be missing
// Exit 0 valid (warnings allowed), 1 errors.
import { loadComponents, loadCredits, loadSources } from "./lib/content.mjs";
import { validateContent } from "./lib/validate.mjs";

const previews = !process.argv.includes("--no-previews");
const components = loadComponents();
const { errors, warnings } = validateContent(
  components,
  loadSources(),
  loadCredits(),
  { previews },
);
for (const warning of warnings) {
  process.stdout.write(`warning: ${warning}\n`);
}
for (const error of errors) {
  process.stderr.write(`error: ${error}\n`);
}
const items = components.reduce((n, c) => n + c.items.size, 0);
if (errors.length > 0) {
  process.stderr.write(
    `validate-content: ${errors.length} error(s) in ${components.length} entries.\n`,
  );
  process.exitCode = 1;
} else {
  process.stdout.write(
    `validate-content: ok (${components.length} entries, ${items} items, ${warnings.length} warning(s)).\n`,
  );
}

// /llms.txt and /llms-full.txt (format: S-026). Plain text for coding
// assistants: what exists, how to install it, and (full) every source file.
import { data, type Entry, entries, published } from "./data";

const site = data.site.url;

function install(): string {
  return [
    "## Install",
    "",
    `- shadcn, by URL: \`npx shadcn@latest add ${site}/r/<item>.json\``,
    `- shadcn, by namespace: add \`"registries": { "${data.site.namespace}": "${site}/r/{name}.json" }\` to components.json, then \`npx shadcn@latest add ${data.site.namespace}/<item>\``,
    `- CLI: \`npx ${data.site.cli} add <component> [--primitive radix|base|aria] [--icons lucide|phosphor] [--style <style>]\` (defaults: radix, lucide); \`npx ${data.site.cli} list\``,
    `- npm: \`npm i ${data.site.npm}\`, then \`import { Button } from "${data.site.npm}/radix/button"\` (Phosphor: \`.../radix/button/phosphor\`); styles: \`${data.site.npm}/styles.css\``,
    "- Item names: `<component>[-<style>][-<primitive>][-<iconset>]`, e.g. `button-radix-lucide`, `badge-subtle-phosphor`, `tooltip-aria`.",
    "",
  ].join("\n");
}

function line(entry: Entry): string {
  const items = published(entry)
    .map((v) => `[${v.name}](${site}/r/${v.name}.json)`)
    .join(", ");
  return `- [${entry.title}](${site}/ui/${entry.name}): ${entry.description} Items: ${items}`;
}

export function llmsTxt(): string {
  const components = entries.filter((e) => e.kind === "component");
  const foundations = entries.filter((e) => e.kind !== "component");
  return [
    "# Design From Labs",
    "",
    "> Experiments and production-ready React components from Design From Labs. Each component ships on three headless primitive libraries (Radix, Base UI, React Aria) and two icon sets (Lucide, Phosphor), as a shadcn registry, a CLI and an npm library. Only tested variants are published.",
    "",
    install(),
    "## Components",
    "",
    ...components.map(line),
    "",
    "## Foundations",
    "",
    ...foundations.map(line),
    "",
    "## Optional",
    "",
    `- [Full source of every published item](${site}/llms-full.txt)`,
    `- [Registry index (shadcn registry.json)](${site}/r/registry.json)`,
    `- [Credits and licenses](${site}/credits)`,
    `- [Export contract](https://github.com/Design-from-labs/labs/blob/main/docs/contract.md)`,
    "",
  ].join("\n");
}

export function llmsFullTxt(): string {
  const parts = [
    "# Design From Labs: full registry source",
    "",
    "> Every published item with its install commands, props, accessibility notes and complete source. Generated at build time from the canonical registry items.",
    "",
    install(),
  ];
  for (const entry of entries) {
    parts.push(`## ${entry.title} (${entry.name})`, "", entry.description, "");
    parts.push(
      `Page: ${site}/ui/${entry.name}. License: ${entry.license}. Author: ${entry.author}.`,
      "",
    );
    if (entry.usage) {
      parts.push("Usage:", "", "```tsx", entry.usage, "```", "");
    }
    if (entry.props.length) {
      parts.push("Props:", "");
      for (const p of entry.props) {
        parts.push(
          `- \`${p.name}\` (\`${p.type}\`${p.default ? `, default \`${p.default}\`` : ""}): ${p.description}`,
        );
      }
      parts.push("");
    }
    if (entry.a11y.length) {
      parts.push("Accessibility:", "", ...entry.a11y.map((a) => `- ${a}`), "");
    }
    for (const v of published(entry)) {
      parts.push(
        `### ${v.name}`,
        "",
        `- ${v.commands?.shadcn}`,
        `- ${v.commands?.namespace}`,
      );
      if (v.commands?.cli) {
        parts.push(`- ${v.commands.cli}`);
      }
      if (v.commands?.importLine) {
        parts.push(`- ${v.commands.npm}; ${v.commands.importLine}`);
      }
      parts.push("");
      for (const f of v.files ?? []) {
        const lang = f.target.endsWith(".ts") ? "ts" : "tsx";
        parts.push(
          `File \`${f.target}\`:`,
          "",
          `\`\`\`${lang}`,
          f.content.trimEnd(),
          "```",
          "",
        );
      }
    }
  }
  return parts.join("\n");
}

#!/usr/bin/env node
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import {
  buildShadcnCommand,
  CliError,
  type Command,
  fetchRegistryIndex,
  formatCommand,
  formatList,
  itemUrl,
  parseCli,
  resolveComponent,
  summarizeComponents,
  USAGE,
} from "./core.js";

// package.json sits one level above both src/ and dist/.
const require = createRequire(import.meta.url);
const { version } = require("../package.json") as { version: string };

/** Run a command with inherited stdio and resolve with its exit code. */
function run(command: string, args: string[]): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: "inherit", shell: false });
    child.on("error", (error) => {
      process.stderr.write(
        `Could not run ${command}: ${error.message}\n` +
          `Run it yourself instead: ${formatCommand({ command, args })}\n`,
      );
      resolve(1);
    });
    child.on("close", (code) => resolve(code ?? 1));
  });
}

async function runAdd(command: Extract<Command, { kind: "add" }>) {
  const items = await fetchRegistryIndex(command.registry);
  // Resolve everything first so a typo does not leave a half-finished install.
  const urls = command.components.map((component) => {
    const item = resolveComponent(items, component, command.wanted);
    return itemUrl(command.registry, item.name);
  });
  const shadcn = buildShadcnCommand(urls, command.extra);
  if (command.dryRun) {
    process.stdout.write(`${formatCommand(shadcn)}\n`);
    return 0;
  }
  return run(shadcn.command, shadcn.args);
}

async function runList(command: Extract<Command, { kind: "list" }>) {
  const summaries = summarizeComponents(
    await fetchRegistryIndex(command.registry),
  );
  process.stdout.write(
    command.json
      ? `${JSON.stringify(summaries, null, 2)}\n`
      : formatList(summaries),
  );
  return 0;
}

async function main(argv: string[]): Promise<number> {
  try {
    const command = parseCli(argv, process.env);
    switch (command.kind) {
      case "help":
        process.stdout.write(USAGE);
        return 0;
      case "version":
        process.stdout.write(`${version}\n`);
        return 0;
      case "add":
        return await runAdd(command);
      case "list":
        return await runList(command);
    }
  } catch (error) {
    if (!(error instanceof CliError)) throw error;
    process.stderr.write(`Error: ${error.message}\n`);
    if (error.showUsage) process.stderr.write(`\n${USAGE}`);
    return error.exitCode;
  }
}

process.exitCode = await main(process.argv.slice(2));

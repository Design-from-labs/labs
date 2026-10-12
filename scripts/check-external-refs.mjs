#!/usr/bin/env node
import { run } from "./check-external-refs-core.mjs";

// The command-line entry. It always runs: there is no "is this the main
// module" guard to defeat (a symlink, a copy elsewhere, a different loader).
// A run that reports success must also have said something, so a check that
// silently did nothing cannot read as a pass.
let printed = false;
const say = (stream) => (line) => {
  printed = true;
  stream.write(`${line}\n`);
};

let code;
try {
  code = run({ log: say(process.stdout), logError: say(process.stderr) });
} catch (error) {
  process.stderr.write(`check-external-refs: crashed: ${error.message}\n`);
  code = 2;
}
if (code === 0 && !printed) {
  process.stderr.write("check-external-refs: finished without a verdict.\n");
  code = 1;
}
process.exitCode = code;

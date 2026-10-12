#!/usr/bin/env node
// Citation guard (scripts/check-sources-core.mjs, docs/sources/README.md).
//
//   node scripts/check-sources.mjs                      registry, decisions, references
//   node scripts/check-sources.mjs --pr-body            the PR body from $GITHUB_EVENT_PATH
//   node scripts/check-sources.mjs --pr-body-file PATH  a PR body from a file
//
// Exit 0 clean, 1 problems, 2 unusable input.
import { run } from "./check-sources-core.mjs";

process.exitCode = run();

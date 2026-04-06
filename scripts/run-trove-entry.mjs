#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const packageRoot = path.join(repoRoot, "packages", "trove-cli");
const tsxFileName = process.platform === "win32" ? "tsx.cmd" : "tsx";
const tsxCandidates = [
  path.join(packageRoot, "node_modules", ".bin", tsxFileName),
  path.join(repoRoot, "node_modules", ".bin", tsxFileName),
];
const tsxPath = tsxCandidates.find((candidate) => fs.existsSync(candidate));

const [entryPath, ...rawArgs] = process.argv.slice(2);

if (!entryPath) {
  console.error("Missing entry path.");
  process.exit(1);
}

if (!tsxPath) {
  console.error("Could not find the tsx executable. Run `pnpm install` first.");
  process.exit(1);
}

const forwardedArgs = rawArgs[0] === "--" ? rawArgs.slice(1) : rawArgs;
const existingNodeOptions = process.env.NODE_OPTIONS?.trim();
const result = spawnSync(tsxPath, [path.join(packageRoot, entryPath), ...forwardedArgs], {
  cwd: process.cwd(),
  stdio: "inherit",
  env: {
    ...process.env,
    NODE_OPTIONS: existingNodeOptions
      ? `${existingNodeOptions} --conditions=development`
      : "--conditions=development",
  },
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);

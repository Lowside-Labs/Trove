#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const desktopRoot = path.resolve(scriptDir, "..");
const repoRoot = path.resolve(desktopRoot, "..", "..");
const sandboxRoot = path.join(repoRoot, ".tmp", "local-dev");
const workspaceRoot = path.join(sandboxRoot, "workspace");
const configHome = path.join(sandboxRoot, "config");
const forwardedArgs = process.argv.slice(2);

if (forwardedArgs.includes("--reset")) {
  fs.rmSync(sandboxRoot, { recursive: true, force: true });
  console.log(`Removed desktop dev sandbox at ${sandboxRoot}`);
  process.exit(0);
}

if (forwardedArgs.includes("--where")) {
  console.log(`Desktop root:     ${desktopRoot}`);
  console.log(`Repo root:        ${repoRoot}`);
  console.log(`Dev sandbox:      ${sandboxRoot}`);
  console.log(`Dev workspace:    ${workspaceRoot}`);
  console.log(`XDG_CONFIG_HOME:  ${configHome}`);
  console.log(`Real HOME:        ${process.env.HOME ?? "(unset)"}`);
  process.exit(0);
}

fs.mkdirSync(sandboxRoot, { recursive: true });
fs.mkdirSync(configHome, { recursive: true });

const env = {
  ...process.env,
  TROVE_HOME: workspaceRoot,
  XDG_CONFIG_HOME: configHome,
};

const result = spawnSync("electron-vite", ["dev", "--outDir", "dist"], {
  cwd: desktopRoot,
  env,
  stdio: "inherit",
  shell: true,
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);

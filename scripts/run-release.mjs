#!/usr/bin/env node

import { execFileSync, spawnSync } from "node:child_process";

const forwardedArgs = process.argv.slice(2);
const releaseSpecifier = forwardedArgs.find((arg) => !arg.startsWith("-"));
const isDryRun = forwardedArgs.includes("--dry-run");

if (!releaseSpecifier) {
  console.error("Usage: pnpm release <patch|minor|major|version> [--dry-run]");
  process.exit(1);
}

const env = { ...process.env };

if (!isDryRun && !env.GITHUB_TOKEN && !env.GH_TOKEN) {
  try {
    const token = execFileSync("gh", ["auth", "token"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "inherit"],
    }).trim();

    if (!token) {
      throw new Error("Empty GitHub token.");
    }

    env.GITHUB_TOKEN = token;
    env.GH_TOKEN = token;
  } catch {
    console.error(
      "Could not read a GitHub token. Run `gh auth login` or set `GITHUB_TOKEN` before releasing.",
    );
    process.exit(1);
  }
}

if (isDryRun) {
  env.TROVE_RELEASE_DRY_RUN = "1";
}

const result = spawnSync(
  "pnpm",
  ["exec", "release-it", "--config", ".release-it.json", "--ci", ...forwardedArgs],
  {
    stdio: "inherit",
    env,
  },
);

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);

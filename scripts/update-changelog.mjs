#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

if (process.env.TROVE_RELEASE_DRY_RUN === "1") {
  process.exit(0);
}

const version = process.argv[2];

if (!version) {
  console.error("Missing version argument.");
  process.exit(1);
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const changelogPath = path.join(repoRoot, "CHANGELOG.md");
const releaseHeading = `## v${version} - ${new Date().toISOString().slice(0, 10)}`;

const current = fs.readFileSync(changelogPath, "utf8");

if (current.includes(releaseHeading)) {
  process.exit(0);
}

const previousTag = getPreviousTag();
const commits = getCommitsSince(previousTag);
const body =
  commits.length > 0
    ? commits.map((commit) => `- ${commit}`).join("\n")
    : "- No user-facing changes recorded.";

const next = current.replace("## Unreleased\n", `## Unreleased\n\n${releaseHeading}\n\n${body}\n`);

fs.writeFileSync(changelogPath, next, "utf8");

function getPreviousTag() {
  try {
    return execFileSync("git", ["describe", "--tags", "--abbrev=0"], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

function getCommitsSince(tag) {
  const range = tag ? `${tag}..HEAD` : "HEAD";
  const output = execFileSync("git", ["log", "--reverse", "--pretty=format:%s", range], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();

  if (!output) {
    return [];
  }

  return output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("Release v"));
}

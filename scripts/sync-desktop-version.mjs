#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const version = process.argv[2];

if (!version) {
  console.error("Missing version argument.");
  process.exit(1);
}

const dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(dirname, "..");
const desktopPackageJsonPath = path.join(repoRoot, "apps/desktop/package.json");
const desktopPackageJson = JSON.parse(fs.readFileSync(desktopPackageJsonPath, "utf8"));

desktopPackageJson.version = version;

fs.writeFileSync(desktopPackageJsonPath, `${JSON.stringify(desktopPackageJson, null, 2)}\n`);

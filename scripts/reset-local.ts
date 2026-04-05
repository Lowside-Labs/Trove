import fs from "node:fs";
import { getTrovePaths } from "../src/core/paths.js";

const paths = getTrovePaths();

if (!fs.existsSync(paths.root)) {
  console.log(`Nothing to reset. Trove home does not exist at ${paths.root}`);
  process.exit(0);
}

fs.rmSync(paths.root, { recursive: true, force: true });
console.log(`Removed Trove local data at ${paths.root}`);

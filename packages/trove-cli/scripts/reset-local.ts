import fs from "node:fs";
import { getTrovePaths } from "../src/core/paths.js";

let paths: ReturnType<typeof getTrovePaths>;

try {
  paths = getTrovePaths();
} catch (error) {
  console.log(error instanceof Error ? error.message : String(error));
  process.exit(0);
}

if (!fs.existsSync(paths.root)) {
  console.log(`Nothing to reset. Trove home does not exist at ${paths.root}`);
  process.exit(0);
}

fs.rmSync(paths.root, { recursive: true, force: true });
console.log(`Removed Trove local data at ${paths.root}`);

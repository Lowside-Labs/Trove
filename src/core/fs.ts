import fs from "node:fs";
import { getTrovePaths, type TrovePaths } from "./paths.js";

export function ensureTroveDirs(root?: string): TrovePaths {
  const paths = getTrovePaths(root);

  for (const dir of [paths.root, paths.dataDir, paths.rawDir, paths.contentDir, paths.indexDir, paths.logDir]) {
    fs.mkdirSync(dir, { recursive: true });
  }

  return paths;
}

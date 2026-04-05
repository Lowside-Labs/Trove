import os from "node:os";
import path from "node:path";

export interface TrovePaths {
  root: string;
  dataDir: string;
  rawDir: string;
  contentDir: string;
  indexDir: string;
  logDir: string;
  dbPath: string;
}

export function getTrovePaths(root = process.env.TROVE_HOME): TrovePaths {
  const resolvedRoot = root ?? path.join(os.homedir(), ".trove");

  return {
    root: resolvedRoot,
    dataDir: path.join(resolvedRoot, "data"),
    rawDir: path.join(resolvedRoot, "raw"),
    contentDir: path.join(resolvedRoot, "content"),
    indexDir: path.join(resolvedRoot, "index"),
    logDir: path.join(resolvedRoot, "logs"),
    dbPath: path.join(resolvedRoot, "data", "trove.db"),
  };
}

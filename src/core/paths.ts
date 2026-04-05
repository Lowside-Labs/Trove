import fs from "node:fs";
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

export interface ResolveWorkspaceRootOptions {
  home?: string;
  path?: string;
  here?: boolean;
  cwd?: string;
}

export function getDefaultTroveRoot(): string {
  return path.join(os.homedir(), ".trove");
}

export function findTroveWorkspaceRoot(startDir = process.cwd()): string | undefined {
  let current = path.resolve(startDir);

  while (true) {
    if (fs.existsSync(path.join(current, "data", "trove.db"))) {
      return current;
    }

    const parent = path.dirname(current);

    if (parent === current) {
      return undefined;
    }

    current = parent;
  }
}

export function resolveWorkspaceRoot(options: ResolveWorkspaceRootOptions = {}): string | undefined {
  const cwd = options.cwd ?? process.cwd();

  if (options.here && options.path) {
    throw new Error("Choose either --here or --path, not both.");
  }

  if (options.here) {
    return path.resolve(cwd);
  }

  if (options.path) {
    return path.resolve(cwd, options.path);
  }

  if (options.home) {
    return path.resolve(cwd, options.home);
  }

  return undefined;
}

export function isDefaultTroveRoot(root: string): boolean {
  return path.resolve(root) === path.resolve(getDefaultTroveRoot());
}

export function getTrovePaths(root = process.env.TROVE_HOME): TrovePaths {
  const resolvedRoot = path.resolve(root ?? findTroveWorkspaceRoot() ?? getDefaultTroveRoot());

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

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

interface TroveConfig {
  defaultWorkspace?: string;
}

export interface CommandWorkspaceResolution {
  root?: string;
  source?: "explicit" | "cwd" | "saved" | "legacy";
  error?: string;
}

export function getDefaultTroveRoot(): string {
  return path.join(os.homedir(), ".trove");
}

export function getTroveConfigDir(): string {
  const baseDir = process.env.XDG_CONFIG_HOME ?? path.join(os.homedir(), ".config");
  return path.join(baseDir, "trove");
}

export function getTroveConfigPath(): string {
  return path.join(getTroveConfigDir(), "config.json");
}

export function findTroveWorkspaceRoot(startDir = process.cwd()): string | undefined {
  let current = path.resolve(startDir);

  while (true) {
    if (workspaceExists(current)) {
      return current;
    }

    const parent = path.dirname(current);

    if (parent === current) {
      return undefined;
    }

    current = parent;
  }
}

export function workspaceExists(root: string): boolean {
  return fs.existsSync(path.join(path.resolve(root), "data", "trove.db"));
}

export function getSavedWorkspaceRoot(): string | undefined {
  const configPath = getTroveConfigPath();

  if (!fs.existsSync(configPath)) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(configPath, "utf8")) as TroveConfig;
    return typeof parsed.defaultWorkspace === "string" && parsed.defaultWorkspace.length > 0
      ? path.resolve(parsed.defaultWorkspace)
      : undefined;
  } catch {
    return undefined;
  }
}

export function saveDefaultWorkspaceRoot(root: string): void {
  fs.mkdirSync(getTroveConfigDir(), { recursive: true });
  fs.writeFileSync(
    getTroveConfigPath(),
    JSON.stringify(
      {
        defaultWorkspace: path.resolve(root),
      } satisfies TroveConfig,
      null,
      2,
    ),
    "utf8",
  );
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

export function resolveCommandWorkspace(options: { home?: string; cwd?: string } = {}): CommandWorkspaceResolution {
  const cwd = options.cwd ?? process.cwd();

  if (options.home) {
    const explicitRoot = path.resolve(cwd, options.home);

    if (!workspaceExists(explicitRoot)) {
      return {
        error: `Trove workspace not found at ${explicitRoot}. Run \`trove init --path ${explicitRoot}\` first.`,
      };
    }

    return {
      root: explicitRoot,
      source: "explicit",
    };
  }

  const cwdWorkspace = findTroveWorkspaceRoot(cwd);

  if (cwdWorkspace) {
    return {
      root: cwdWorkspace,
      source: "cwd",
    };
  }

  const savedWorkspace = getSavedWorkspaceRoot();

  if (savedWorkspace) {
    if (workspaceExists(savedWorkspace)) {
      return {
        root: savedWorkspace,
        source: "saved",
      };
    }

    return {
      error: `Remembered Trove workspace not found at ${savedWorkspace}. Run \`trove init --path <path>\` or use \`--home <path>\`.`,
    };
  }

  const legacyRoot = getDefaultTroveRoot();

  if (workspaceExists(legacyRoot)) {
    return {
      root: legacyRoot,
      source: "legacy",
    };
  }

  return {
    error: "No Trove workspace found. Run `trove init --path ~/Trove` or specify `--home <path>`.",
  };
}

export function isDefaultTroveRoot(root: string): boolean {
  return path.resolve(root) === path.resolve(getDefaultTroveRoot());
}

export function getTrovePaths(root = process.env.TROVE_HOME): TrovePaths {
  const resolution = root !== undefined ? { root } : resolveCommandWorkspace();

  if (!resolution.root) {
    throw new Error(resolution.error ?? "No Trove workspace found.");
  }

  const resolvedRoot = path.resolve(resolution.root);

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

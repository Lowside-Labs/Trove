import {
  clearSavedWorkspaceRoot,
  findTroveWorkspaceRoot,
  getDefaultTroveRoot,
  getSavedWorkspaceRoot,
  resolveActiveWorkspace,
  workspaceExists,
} from "trove-core";
import path from "node:path";

const DEV_SANDBOX_WORKSPACE_SUFFIX = path.join(".tmp", "local-dev", "workspace");

function shouldIgnoreSavedWorkspaceRoot(root: string): boolean {
  return !process.env.ELECTRON_RENDERER_URL && path.resolve(root).endsWith(DEV_SANDBOX_WORKSPACE_SUFFIX);
}

function getDesktopSavedWorkspaceRoot(): string | undefined {
  const savedRoot = getSavedWorkspaceRoot();

  if (!savedRoot) {
    return undefined;
  }

  if (shouldIgnoreSavedWorkspaceRoot(savedRoot)) {
    clearSavedWorkspaceRoot();
    return undefined;
  }

  return savedRoot;
}

export function buildDesktopWorkspaceSetup() {
  const defaultRoot = getDefaultTroveRoot();
  const explicitRoot = process.env.TROVE_HOME ? process.env.TROVE_HOME : undefined;
  const savedRoot = getDesktopSavedWorkspaceRoot();
  const suggestedRoot = explicitRoot ?? savedRoot ?? defaultRoot;

  return {
    defaultRoot,
    suggestedRoot,
    ...(explicitRoot ? { explicitRoot } : {}),
    ...(savedRoot ? { savedRoot } : {}),
  };
}

export function resolveDesktopWorkspace() {
  if (process.env.TROVE_HOME) {
    return resolveActiveWorkspace({
      home: process.env.TROVE_HOME,
    });
  }

  const cwdWorkspace = findTroveWorkspaceRoot();

  if (cwdWorkspace) {
    return {
      root: cwdWorkspace,
      source: "cwd" as const,
    };
  }

  const savedRoot = getDesktopSavedWorkspaceRoot();

  if (savedRoot) {
    if (workspaceExists(savedRoot)) {
      return {
        root: savedRoot,
        source: "saved" as const,
      };
    }

    return {
      error: `Remembered Trove workspace not found at ${savedRoot}. Run \`trove init --path <path>\` or use \`--home <path>\`.`,
    };
  }

  const defaultRoot = getDefaultTroveRoot();

  if (workspaceExists(defaultRoot)) {
    return {
      root: defaultRoot,
      source: "legacy" as const,
    };
  }

  return {
    error: "No Trove workspace found. Run `trove init --path ~/.trove` or specify `--home <path>`.",
  };
}

export function setDesktopWorkspaceRoot(root: string): void {
  process.env.TROVE_HOME = root;
}

export function requireDesktopWorkspaceRoot(): string {
  const resolution = resolveDesktopWorkspace();

  if (!resolution.root) {
    throw new Error(resolution.error ?? "No Trove workspace found.");
  }

  return resolution.root;
}

export const __internal = {
  shouldIgnoreSavedWorkspaceRoot,
};

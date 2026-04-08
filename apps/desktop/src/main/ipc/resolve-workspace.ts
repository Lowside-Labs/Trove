import {
  getDefaultTroveRoot,
  getSavedWorkspaceRoot,
  resolveActiveWorkspace,
} from "trove-core";

export function buildDesktopWorkspaceSetup() {
  const defaultRoot = getDefaultTroveRoot();
  const explicitRoot = process.env.TROVE_HOME ? process.env.TROVE_HOME : undefined;
  const savedRoot = getSavedWorkspaceRoot();
  const suggestedRoot = explicitRoot ?? savedRoot ?? defaultRoot;

  return {
    defaultRoot,
    suggestedRoot,
    ...(explicitRoot ? { explicitRoot } : {}),
    ...(savedRoot ? { savedRoot } : {}),
  };
}

export function resolveDesktopWorkspace() {
  return resolveActiveWorkspace({
    ...(process.env.TROVE_HOME ? { home: process.env.TROVE_HOME } : {}),
  });
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

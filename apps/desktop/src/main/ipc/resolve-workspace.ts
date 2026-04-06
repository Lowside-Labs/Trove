import { resolveActiveWorkspace } from "trove-core";

export function resolveDesktopWorkspace() {
  return resolveActiveWorkspace({
    ...(process.env.TROVE_HOME ? { home: process.env.TROVE_HOME } : {}),
  });
}

export function requireDesktopWorkspaceRoot(): string {
  const resolution = resolveDesktopWorkspace();

  if (!resolution.root) {
    throw new Error(resolution.error ?? "No Trove workspace found.");
  }

  return resolution.root;
}

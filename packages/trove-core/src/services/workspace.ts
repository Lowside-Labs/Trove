import type { CommandWorkspaceResolution, TrovePaths } from "../core/paths.js";
import { runArchivePostProcessing } from "../core/archive.js";
import { ensureTroveDirs } from "../core/fs.js";
import {
  getDefaultTroveRoot,
  resolveCommandWorkspace,
  resolveWorkspaceRoot,
  saveDefaultWorkspaceRoot,
} from "../core/paths.js";
import { withDatabase } from "../db/database.js";
import type { VaultArtifacts } from "../core/vault.js";

export interface InitializeWorkspaceOptions {
  path?: string;
  here?: boolean;
  cwd?: string;
}

export interface InitializeWorkspaceResult {
  paths: TrovePaths;
  vaultArtifacts: VaultArtifacts;
}

export function resolveActiveWorkspace(
  options: {
    home?: string;
    cwd?: string;
  } = {},
): CommandWorkspaceResolution {
  return resolveCommandWorkspace(options);
}

export function initializeWorkspace(
  options: InitializeWorkspaceOptions = {},
): InitializeWorkspaceResult {
  const root =
    resolveWorkspaceRoot({
      ...(options.cwd ? { cwd: options.cwd } : {}),
      ...(options.path ? { path: options.path } : {}),
      ...(options.here !== undefined ? { here: options.here } : {}),
    }) ?? getDefaultTroveRoot();

  process.env.TROVE_HOME = root;

  const paths = ensureTroveDirs(root);
  withDatabase(() => undefined, paths.root);
  const vaultArtifacts = runArchivePostProcessing(paths.root);
  saveDefaultWorkspaceRoot(paths.root);

  return {
    paths,
    vaultArtifacts,
  };
}

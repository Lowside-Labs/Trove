import type {
  CommandWorkspaceResolution,
  TrovePaths,
  SavedSourceBrowserTarget,
} from "../core/paths.js";
import { runArchivePostProcessing } from "../core/archive.js";
import { ensureTroveDirs } from "../core/fs.js";
import {
  getDefaultTroveRoot,
  getSavedSourceBrowserTarget,
  getTrovePaths,
  resolveCommandWorkspace,
  resolveWorkspaceRoot,
  saveDefaultWorkspaceRoot,
} from "../core/paths.js";
import {
  getArchiveOverview,
  getSourceCounts,
  getSourceSyncRecords,
  withDatabase,
} from "../db/database.js";
import type { VaultArtifacts } from "../core/vault.js";
import type { SourceStatus, WorkspaceOverview } from "trove-contracts";
import { listSyncSources } from "../sources/index.js";

export interface InitializeWorkspaceOptions {
  path?: string;
  here?: boolean;
  cwd?: string;
}

export interface InitializeWorkspaceResult {
  paths: TrovePaths;
  vaultArtifacts: VaultArtifacts;
}

export interface WorkspaceBrowserTarget extends SavedSourceBrowserTarget {
  sourceId: string;
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

export function getWorkspaceOverview(root?: string): WorkspaceOverview {
  const paths = getTrovePaths(root);

  return withDatabase((db) => {
    const overview = getArchiveOverview(db);

    return {
      root: paths.root,
      totalItems: overview.totalItems,
      totalSources: overview.totalSources,
      ...(overview.lastSyncedAt ? { lastSyncedAt: overview.lastSyncedAt } : {}),
    };
  }, paths.root);
}

export function getWorkspaceSourceStatuses(root?: string): SourceStatus[] {
  const paths = getTrovePaths(root);

  return withDatabase((db) => {
    const countsBySource = new Map(
      getSourceCounts(db).map((record) => [record.source, record.count] as const),
    );
    const syncBySource = new Map(
      getSourceSyncRecords(db).map((record) => [record.source, record.lastSyncedAt] as const),
    );

    return listSyncSources().map((source) => {
      const itemCount = countsBySource.get(source.id) ?? 0;
      const lastSyncedAt = syncBySource.get(source.id);
      const hasSavedBrowserTarget = getSavedSourceBrowserTarget(source.id) !== undefined;
      const status =
        itemCount > 0
          ? "active"
          : lastSyncedAt || hasSavedBrowserTarget
            ? "connected-empty"
            : "available";

      return {
        id: source.id,
        displayName: source.metadata.displayName,
        status,
        authMode: source.metadata.authMode,
        itemCount,
        kinds: source.metadata.kinds,
        ...(lastSyncedAt ? { lastSyncedAt } : {}),
        ...(source.metadata.requiresBrowser ? { requiresBrowser: true } : {}),
        ...(source.metadata.requiresUser ? { requiresUser: true } : {}),
      };
    });
  }, paths.root);
}

export function getSavedBrowserTargets(): WorkspaceBrowserTarget[] {
  return listSyncSources()
    .map((source) => {
      const target = getSavedSourceBrowserTarget(source.id);

      if (!target) {
        return null;
      }

      return {
        sourceId: source.id,
        browserId: target.browserId,
        ...(target.profile ? { profile: target.profile } : {}),
      } satisfies WorkspaceBrowserTarget;
    })
    .filter((value): value is WorkspaceBrowserTarget => value !== null);
}

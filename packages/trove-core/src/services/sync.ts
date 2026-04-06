import type { ProgressEvent } from "trove-contracts";
import { isSupportedBrowserId } from "../auth/chromium.js";
import { runArchivePostProcessing } from "../core/archive.js";
import { saveSourceBrowserTarget } from "../core/paths.js";
import type { VaultArtifacts } from "../core/vault.js";
import {
  getSyncState,
  upsertItems,
  upsertSyncState,
  withDatabase,
  type UpsertItemsResult,
} from "../db/database.js";
import {
  assertSupportedKind,
  getSyncSource,
  listSyncSourceIds,
  type SyncCommandOptions,
  type SyncSummary,
} from "../sources/index.js";

export interface SyncRunResult {
  label: string;
  count: number;
  summary?: SyncSummary;
}

export interface SyncWorkspaceResult {
  source: string;
  runs: SyncRunResult[];
  vaultArtifacts: VaultArtifacts;
}

export interface SyncExecutionOptions {
  source: string;
  options: SyncCommandOptions;
  limit?: number;
  onRunStart?: (label: string) => void;
  onRunProgress?: (label: string, event: ProgressEvent) => void;
  onRunComplete?: (run: SyncRunResult) => void;
}

interface PreparedSyncRuns {
  syncSource: NonNullable<ReturnType<typeof getSyncSource>>;
  runs: SyncCommandOptions[];
  labels: string[];
}

export function getSyncRunLabels(source: string, options: SyncCommandOptions): string[] {
  return prepareSyncRuns(source, options).labels;
}

export async function syncSourceToWorkspace(
  args: SyncExecutionOptions,
): Promise<SyncWorkspaceResult> {
  const prepared = prepareSyncRuns(args.source, args.options);
  const runs: SyncRunResult[] = [];

  for (const runOptions of prepared.runs) {
    const label = formatRunLabel(args.source, runOptions.kind);
    args.onRunStart?.(label);

    const result = await runSingleSync(
      prepared.syncSource.id,
      prepared.syncSource,
      runOptions,
      args.limit,
      (event) => {
        args.onRunProgress?.(label, event);
      },
    );

    const run = {
      label,
      count: result.count,
      ...(result.summary ? { summary: result.summary } : {}),
    } satisfies SyncRunResult;

    runs.push(run);
    args.onRunComplete?.(run);
  }

  return {
    source: prepared.syncSource.id,
    runs,
    vaultArtifacts: runArchivePostProcessing(),
  };
}

function prepareSyncRuns(source: string, options: SyncCommandOptions): PreparedSyncRuns {
  const syncSource = getSyncSource(source);

  if (!syncSource) {
    throw new Error(
      `Unknown source "${source}". Supported sources: ${listSyncSourceIds().join(", ")}.`,
    );
  }

  const commandOptions: SyncCommandOptions = { ...options };

  if (options.kind) {
    commandOptions.kind = assertSupportedKind(syncSource, options.kind);
  }

  const runs = (syncSource.expandSyncRuns?.(commandOptions) ?? [commandOptions]).filter(
    (value): value is SyncCommandOptions => Boolean(value),
  );

  return {
    syncSource,
    runs,
    labels: runs.map((runOptions) => formatRunLabel(source, runOptions.kind)),
  };
}

async function runSingleSync(
  sourceId: string,
  syncSource: NonNullable<ReturnType<typeof getSyncSource>>,
  commandOptions: SyncCommandOptions,
  limit: number | undefined,
  onProgress?: (event: ProgressEvent) => void,
): Promise<{ count: number; summary?: SyncSummary }> {
  const resolvedOptions = syncSource.resolveOptions
    ? await syncSource.resolveOptions({
        options: commandOptions,
        ...(onProgress ? { onProgress } : {}),
      })
    : commandOptions;
  const scope = syncSource.createScope(resolvedOptions);
  const state = syncSource.shouldPersistState
    ? withDatabase((db) => getSyncState(db, sourceId, scope))
    : null;
  const syncResult = await syncSource.sync({
    options: resolvedOptions,
    state,
    ...(limit !== undefined ? { limit } : {}),
    ...(onProgress ? { onProgress } : {}),
  });
  onProgress?.({
    phase: "persist",
    message: `Importing ${syncResult.items.length} item${syncResult.items.length === 1 ? "" : "s"} into the local database`,
  });
  const writeResult = withDatabase((db) => {
    const importResult = upsertItems(db, syncResult.items);
    const nextState = syncSource.buildSyncState?.({
      options: resolvedOptions,
      importedCount: importResult.insertedCount,
      result: syncResult,
      scope,
    });

    if (nextState) {
      upsertSyncState(db, nextState);
    }

    return importResult;
  });
  const count = writeResult.insertedCount;
  if (
    (syncSource.metadata.authMode === "cookie" || syncSource.metadata.authMode === "cdp") &&
    isSupportedBrowserId(resolvedOptions.browser)
  ) {
    saveSourceBrowserTarget(sourceId, {
      browserId: resolvedOptions.browser,
      ...(resolvedOptions.profile ? { profile: resolvedOptions.profile } : {}),
    });
  }
  onProgress?.({
    phase: "persist",
    message: formatPersistenceMessage(writeResult),
    completed: writeResult.insertedCount + writeResult.updatedCount,
    total: syncResult.items.length,
  });

  const summary = syncSource.getSummary?.({
    options: resolvedOptions,
    state,
    result: syncResult,
    scope,
  });

  return summary ? { count, summary } : { count };
}

function formatPersistenceMessage(result: UpsertItemsResult): string {
  const insertedLabel = `${result.insertedCount} new`;
  const updatedLabel = `${result.updatedCount} updated`;

  if (result.updatedCount === 0) {
    return `Indexed ${insertedLabel} item${result.insertedCount === 1 ? "" : "s"} in SQLite`;
  }

  if (result.insertedCount === 0) {
    return `Indexed 0 new items in SQLite (${updatedLabel})`;
  }

  return `Indexed ${insertedLabel} item${result.insertedCount === 1 ? "" : "s"} in SQLite (${updatedLabel})`;
}

function formatRunLabel(source: string, kind?: string): string {
  return kind ? `${source}/${kind}` : source;
}

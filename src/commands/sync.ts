import { Command } from "commander";
import { TerminalOutput, renderSyncReport, type SyncRunReport } from "../core/output.js";
import { SyncDashboardRenderer, formatSyncRunLabel, type SyncProgressHandler } from "../core/progress.js";
import { getSyncState, upsertItems, upsertSyncState, withDatabase, type UpsertItemsResult } from "../db/database.js";
import { getSyncSource, listSyncSourceIds, type SyncCommandOptions, type SyncSummary } from "../sources/index.js";

export function createSyncCommand() {
  return new Command("sync")
    .description("Sync content from a source into the local database.")
    .argument("<source>", `Source adapter to run, currently: ${listSyncSourceIds().join(" | ")}`)
    .option("--browser <browser>", "Chromium browser id to use for seamless session reuse", "chrome")
    .option("--profile <profile>", "Browser profile to read cookies from")
    .option("--limit <number>", "Maximum number of items to import")
    .option("--cdp-url <url>", "Attach to a live Chromium browser over CDP, for example http://127.0.0.1:9222")
    .option("--user <user>", "Account username for sources that sync public user data")
    .option(
      "--kind <kind>",
      "Source-specific sync mode. Supported today: github: stars; hn: favorites | favorite-comments; substack: saved | likes; x: bookmarks | likes",
    )
    .option("--headful", "Show the browser while Trove discovers the authenticated source request", false)
    .option("--debug-raw-pages", "Also store full raw GraphQL page payloads for debugging", false)
    .action(async (source, options) => {
      const output = new TerminalOutput();
      const syncSource = getSyncSource(source);

      if (!syncSource) {
        output.error(`Unknown source "${source}". Supported sources: ${listSyncSourceIds().join(", ")}.`);
        process.exitCode = 1;
        return;
      }

      let progressRenderer: SyncDashboardRenderer | undefined;
      let activeRunLabel: string | undefined;

      try {
        const limit = parseOptionalInteger(options.limit, "limit");
        const commandOptions = options as SyncCommandOptions;
        const runs = (syncSource.expandSyncRuns?.(commandOptions) ?? [commandOptions]).filter(Boolean);
        const labels = runs.map((runOptions) => formatSyncRunLabel(source, runOptions.kind));
        const reports: SyncRunReport[] = [];

        progressRenderer = new SyncDashboardRenderer(output, {
          title: `Sync ${source}`,
          plannedRuns: labels,
        });

        for (const runOptions of runs) {
          const label = formatSyncRunLabel(source, runOptions.kind);
          activeRunLabel = label;
          progressRenderer.startRun(label);

          const result = await runSingleSync(syncSource.id, syncSource, runOptions, limit, (event) => {
            progressRenderer?.update(label, event);
          });

          progressRenderer.completeRun(label, result.count);
          reports.push(toSyncRunReport(label, result.count, result.summary));
          activeRunLabel = undefined;
        }

        progressRenderer.commit();
        renderSyncReport(output, source, reports);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        if (activeRunLabel) {
          progressRenderer?.failRun(activeRunLabel, message);
        }

        progressRenderer?.commit();
        output.error(message);
        process.exitCode = 1;
      }
    });
}

async function runSingleSync(
  sourceId: string,
  syncSource: NonNullable<ReturnType<typeof getSyncSource>>,
  commandOptions: SyncCommandOptions,
  limit: number | undefined,
  onProgress?: SyncProgressHandler,
): Promise<{ count: number; summary?: SyncSummary }> {
  const scope = syncSource.createScope(commandOptions);
  const state = syncSource.shouldPersistState ? withDatabase((db) => getSyncState(db, sourceId, scope)) : null;
  const syncResult = await syncSource.sync({
    options: commandOptions,
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
      options: commandOptions,
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
  onProgress?.({
    phase: "persist",
    message: formatPersistenceMessage(writeResult),
    completed: writeResult.insertedCount + writeResult.updatedCount,
    total: syncResult.items.length,
  });

  const summary = syncSource.getSummary?.({
    options: commandOptions,
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

function toSyncRunReport(label: string, count: number, summary?: SyncSummary): SyncRunReport {
  return {
    label,
    count,
    headline: summary?.headline ?? `Imported ${count} item${count === 1 ? "" : "s"}.`,
    sections: summary?.sections ?? [],
    ...(summary?.notes ? { notes: summary.notes } : {}),
  };
}

function parseOptionalInteger(value: string | undefined, label: string): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive integer.`);
  }

  return parsed;
}

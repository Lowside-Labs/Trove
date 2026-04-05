import { Command } from "commander";
import { TerminalProgressRenderer, formatSyncRunLabel, type SyncProgressHandler } from "../core/progress.js";
import { getSyncState, upsertItems, upsertSyncState, withDatabase } from "../db/database.js";
import { getSyncSource, listSyncSourceIds, type SyncCommandOptions } from "../sources/index.js";

export function createSyncCommand() {
  return new Command("sync")
    .description("Sync content from a source into the local database.")
    .argument("<source>", `Source adapter to run, currently: ${listSyncSourceIds().join(" | ")}`)
    .option("--browser <browser>", "Chromium browser id to use for seamless session reuse", "chrome")
    .option("--profile <profile>", "Browser profile to read cookies from")
    .option("--limit <number>", "Maximum number of items to import")
    .option("--cdp-url <url>", "Attach to a live Chromium browser over CDP, for example http://127.0.0.1:9222")
    .option("--user <user>", "Account username for sources that sync public user data")
    .option("--kind <kind>", "Source-specific sync mode, for HN: favorites | favorite-comments; for X: bookmarks | likes")
    .option("--headful", "Show the browser while Trove discovers the authenticated source request", false)
    .option("--debug-raw-pages", "Also store full raw GraphQL page payloads for debugging", false)
    .action(async (source, options) => {
      const syncSource = getSyncSource(source);
      const progressRenderer = new TerminalProgressRenderer();

      if (!syncSource) {
        console.error(`Unknown source "${source}". Supported sources: ${listSyncSourceIds().join(", ")}.`);
        process.exitCode = 1;
        return;
      }

      try {
        const limit = parseOptionalInteger(options.limit, "limit");
        const commandOptions = options as SyncCommandOptions;
        const runs = (syncSource.expandSyncRuns?.(commandOptions) ?? [commandOptions]).filter(Boolean);

        if (runs.length > 1) {
          let totalCount = 0;

          for (const runOptions of runs) {
            const label = formatSyncRunLabel(source, runOptions.kind);
            const result = await runSingleSync(syncSource.id, syncSource, runOptions, limit, (event) => {
              progressRenderer.update(label, event);
            });
            totalCount += result.count;

            progressRenderer.clear();
            console.log(`Imported ${result.count} items from ${source} (${runOptions.kind ?? "default"}).`);

            if (result.summaryLines) {
              for (const line of result.summaryLines) {
                console.log(line);
              }
            }
          }

          console.log(`Imported ${totalCount} total items from ${source}.`);
          return;
        }

        const runOptions = runs[0] ?? commandOptions;
        const result = await runSingleSync(syncSource.id, syncSource, runOptions, limit, (event) => {
          progressRenderer.update(formatSyncRunLabel(source, runOptions.kind), event);
        });
        progressRenderer.clear();
        console.log(`Imported ${result.count} items from ${source}.`);

        if (result.summaryLines) {
          for (const line of result.summaryLines) {
            console.log(line);
          }
        }
      } catch (error) {
        progressRenderer.clear();
        console.error(error instanceof Error ? error.message : String(error));
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
): Promise<{ count: number; summaryLines?: string[] }> {
  const scope = syncSource.createScope(commandOptions);
  const state = syncSource.shouldPersistState ? withDatabase((db) => getSyncState(db, sourceId, scope)) : null;
  const syncResult = await syncSource.sync({
    options: commandOptions,
    state,
    ...(limit !== undefined ? { limit } : {}),
    ...(onProgress ? { onProgress } : {}),
  });
  const count = withDatabase((db) => {
    const importedCount = upsertItems(db, syncResult.items);
    const nextState = syncSource.buildSyncState?.({
      options: commandOptions,
      importedCount,
      result: syncResult,
      scope,
    });

    if (nextState) {
      upsertSyncState(db, nextState);
    }

    return importedCount;
  });

  const summaryLines = syncSource.getSummaryLines?.({
    options: commandOptions,
    state,
    result: syncResult,
    scope,
  });

  return summaryLines ? { count, summaryLines } : { count };
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

import { Command } from "commander";
import { getSyncState, upsertItems, upsertSyncState, withDatabase } from "../db/database.js";
import { getSyncSource, listSyncSourceIds, type SyncCommandOptions } from "../sources/index.js";

export function createSyncCommand() {
  return new Command("sync")
    .description("Sync content from a source into the local database.")
    .argument("<source>", `Source adapter to run, currently: ${listSyncSourceIds().join(" | ")}`)
    .option("--browser <browser>", "Chromium browser id to use for seamless session reuse", "chrome")
    .option("--profile <profile>", "Browser profile to read cookies from")
    .option("--limit <number>", "Maximum number of items to import")
    .option("--user <user>", "Account username for sources that sync public user data")
    .option("--kind <kind>", "Source-specific sync mode, for HN: favorites | favorite-comments")
    .option("--headful", "Show the browser while Trove discovers the bookmarks request", false)
    .option("--debug-raw-pages", "Also store full raw GraphQL page payloads for debugging", false)
    .action(async (source, options) => {
      const syncSource = getSyncSource(source);

      if (!syncSource) {
        console.error(`Unknown source "${source}". Supported sources: ${listSyncSourceIds().join(", ")}.`);
        process.exitCode = 1;
        return;
      }

      try {
        const limit = parseOptionalInteger(options.limit, "limit");
        const commandOptions = options as SyncCommandOptions;
        const scope = syncSource.createScope(commandOptions);
        const state = syncSource.shouldPersistState
          ? withDatabase((db) => getSyncState(db, syncSource.id, scope))
          : null;
        const syncResult = await syncSource.sync({
          options: commandOptions,
          state,
          ...(limit !== undefined ? { limit } : {}),
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

        console.log(`Imported ${count} items from ${source}.`);

        const summaryLines = syncSource.getSummaryLines?.({
          options: commandOptions,
          state,
          result: syncResult,
          scope,
        });

        if (summaryLines) {
          for (const line of summaryLines) {
            console.log(line);
          }
        }
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
      }
    });
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

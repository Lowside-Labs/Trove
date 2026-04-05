import { Command } from "commander";
import { getSyncState, openDatabase, upsertItems, upsertSyncState } from "../db/database.js";
import { getDemoItems } from "../sources/demo.js";
import { formatAvailableBrowserList, syncXBookmarks } from "../sources/x.js";
import type { SupportedBrowserId } from "../types/browser.js";

export function createSyncCommand() {
  return new Command("sync")
    .description("Sync content from a source into the local database.")
    .argument("<source>", "Source adapter to run, currently: demo | x")
    .option("--browser <browser>", "Chromium browser id to use for seamless session reuse", "chrome")
    .option("--profile <profile>", "Browser profile to read cookies from")
    .option("--limit <number>", "Maximum number of items to import")
    .option("--headful", "Show the browser while Trove discovers the bookmarks request", false)
    .action(async (source, options) => {
      if (source !== "demo" && source !== "x") {
        console.error(`Unknown source "${source}". Supported sources: demo, x.`);
        process.exitCode = 1;
        return;
      }

      try {
        const db = openDatabase();
        const limit = parseOptionalInteger(options.limit, "limit");
        const browserId = options.browser as SupportedBrowserId;
        const scope = source === "x" ? `${browserId}:${options.profile ?? "Default"}` : "default";
        const state = source === "x" ? getSyncState(db, "x", scope) : null;
        const syncResult =
          source === "demo"
            ? { items: getDemoItems() }
            : await syncXBookmarks({
                browserId,
                ...(options.profile ? { profile: options.profile } : {}),
                ...(limit !== undefined ? { limit } : {}),
                ...(options.headful ? { headful: true } : {}),
                ...(state?.cursor ? { cursor: state.cursor } : {}),
              });
        const count = upsertItems(db, syncResult.items);

        if (source === "x") {
          upsertSyncState(db, {
            source: "x",
            scope,
            ...(syncResult.nextCursor ? { cursor: syncResult.nextCursor } : {}),
            metadata: {
              browserId,
              profile: options.profile ?? "Default",
              lastImportCount: count,
            },
          });
        }

        db.close();

        console.log(`Imported ${count} items from ${source}.`);

        if (source === "x") {
          console.log(state?.cursor ? `Resumed from saved cursor for ${scope}.` : `Started fresh sync for ${scope}.`);
          console.log(`Browsers detected: ${formatAvailableBrowserList()}`);
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

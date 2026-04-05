import { Command } from "commander";
import { openDatabase, upsertItems } from "../db/database.js";
import { getDemoItems } from "../sources/demo.js";

export function createSyncCommand() {
  return new Command("sync")
    .description("Sync content from a source into the local database.")
    .argument("<source>", "Source adapter to run, currently: demo")
    .action((source) => {
      if (source !== "demo") {
        console.error(`Unknown source "${source}". Only "demo" is wired in this scaffold.`);
        process.exitCode = 1;
        return;
      }

      const db = openDatabase();
      const items = getDemoItems();
      const count = upsertItems(db, items);
      db.close();

      console.log(`Imported ${count} items from ${source}.`);
    });
}

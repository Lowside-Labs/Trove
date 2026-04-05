import { Command } from "commander";
import { getSourceCounts, openDatabase } from "../db/database.js";

export function createStatsCommand() {
  return new Command("stats").description("Show basic counts by source.").action(() => {
    const db = openDatabase();
    const counts = getSourceCounts(db);
    db.close();

    if (counts.length === 0) {
      console.log("No items indexed yet.");
      return;
    }

    for (const entry of counts) {
      console.log(`${entry.source}: ${entry.count}`);
    }
  });
}

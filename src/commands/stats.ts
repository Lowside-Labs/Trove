import { Command } from "commander";
import { getSourceCounts, withDatabase } from "../db/database.js";

export function createStatsCommand() {
  return new Command("stats").description("Show basic counts by source.").action(() => {
    const counts = withDatabase((db) => getSourceCounts(db));

    if (counts.length === 0) {
      console.log("No items indexed yet.");
      return;
    }

    for (const entry of counts) {
      console.log(`${entry.source}: ${entry.count}`);
    }
  });
}

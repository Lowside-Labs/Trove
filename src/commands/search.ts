import { Command } from "commander";
import { searchItems, withDatabase } from "../db/database.js";

export function createSearchCommand() {
  return new Command("search")
    .description("Run a full-text search against indexed Trove items.")
    .argument("<query>", "Full-text query")
    .option("-l, --limit <number>", "Maximum number of results", "10")
    .action((query, options) => {
      const limit = Number.parseInt(options.limit, 10);

      if (Number.isNaN(limit) || limit <= 0) {
        console.error("The limit must be a positive integer.");
        process.exitCode = 1;
        return;
      }

      const results = withDatabase((db) => searchItems(db, query, limit));

      if (results.length === 0) {
        console.log("No matching items found.");
        return;
      }

      for (const result of results) {
        console.log(`${result.title} [${result.source}]`);
        console.log(result.url);
        if (result.excerpt) {
          console.log(result.excerpt);
        }
        console.log("");
      }
    });
}

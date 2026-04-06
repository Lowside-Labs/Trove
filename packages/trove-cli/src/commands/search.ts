import { Command } from "commander";
import { TerminalOutput, renderSearchResults } from "../core/output.js";
import { searchWorkspace } from "trove-core";

export function createSearchCommand() {
  return new Command("search")
    .description("Run a full-text search across the current Trove workspace.")
    .argument("<query>", "Full-text query")
    .option("-l, --limit <number>", "Maximum number of results", "10")
    .action((query, options) => {
      const output = new TerminalOutput();
      const limit = Number.parseInt(options.limit, 10);

      if (Number.isNaN(limit) || limit <= 0) {
        output.error("The limit must be a positive integer.");
        process.exitCode = 1;
        return;
      }

      const results = searchWorkspace(query, { limit });
      renderSearchResults(output, query, results, limit);
    });
}

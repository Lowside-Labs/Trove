import { Command } from "commander";
import { renderInitReport, TerminalOutput } from "../core/output.js";
import { initializeWorkspace } from "trove-core";

export function createInitCommand() {
  return new Command("init")
    .description("Create an AI-ready Trove workspace and initialize the database.")
    .option("--path <path>", "Create the workspace at a custom path")
    .option("--here", "Create the workspace in the current directory", false)
    .action((options) => {
      const output = new TerminalOutput();

      try {
        const { paths, vaultArtifacts } = initializeWorkspace({
          path: options.path,
          here: options.here,
        });
        renderInitReport(output, paths, vaultArtifacts);
      } catch (error) {
        output.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
      }
    });
}

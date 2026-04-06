import { Command } from "commander";
import { runArchivePostProcessing } from "../core/archive.js";
import { renderInitReport, TerminalOutput } from "../core/output.js";
import { ensureTroveDirs } from "../core/fs.js";
import {
  getDefaultTroveRoot,
  resolveWorkspaceRoot,
  saveDefaultWorkspaceRoot,
} from "../core/paths.js";
import { withDatabase } from "../db/database.js";

export function createInitCommand() {
  return new Command("init")
    .description("Create an AI-ready Trove workspace and initialize the database.")
    .option("--path <path>", "Create the workspace at a custom path")
    .option("--here", "Create the workspace in the current directory", false)
    .action((options) => {
      const output = new TerminalOutput();

      try {
        const root =
          resolveWorkspaceRoot({
            path: options.path,
            here: options.here,
          }) ?? getDefaultTroveRoot();

        process.env.TROVE_HOME = root;

        const paths = ensureTroveDirs(root);
        withDatabase(() => undefined, paths.root);
        const vaultArtifacts = runArchivePostProcessing(paths.root);
        saveDefaultWorkspaceRoot(paths.root);
        renderInitReport(output, paths, vaultArtifacts);
      } catch (error) {
        output.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
      }
    });
}

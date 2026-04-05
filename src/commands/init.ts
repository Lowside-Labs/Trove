import { Command } from "commander";
import { renderInitReport, TerminalOutput } from "../core/output.js";
import { ensureTroveDirs } from "../core/fs.js";
import { withDatabase } from "../db/database.js";

export function createInitCommand() {
  return new Command("init").description("Create the Trove local data directory and initialize the database.").action(() => {
    const output = new TerminalOutput();
    const paths = ensureTroveDirs();
    withDatabase(() => undefined, paths.root);
    renderInitReport(output, paths);
  });
}

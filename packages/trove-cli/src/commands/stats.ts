import { Command } from "commander";
import { TerminalOutput, renderStatsReport } from "../core/output.js";
import { getWorkspaceStats } from "../../../trove-core/src/index.js";

export function createStatsCommand() {
  return new Command("stats")
    .description("Show workspace health and counts by source.")
    .action(() => {
      const output = new TerminalOutput();
      const report = getWorkspaceStats();

      if (report.rows.length === 0) {
        output.info("No items indexed yet.");
        output.line(
          output.toned("Run `trove sync <source>` to start building the archive.", "muted"),
        );
        return;
      }

      renderStatsReport(output, report);
    });
}

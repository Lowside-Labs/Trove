import { Command } from "commander";
import { TerminalOutput, renderStatsReport } from "../core/output.js";
import { getArchiveOverview, getSourceStats, withDatabase } from "../db/database.js";

export function createStatsCommand() {
  return new Command("stats").description("Show workspace health and counts by source.").action(() => {
    const output = new TerminalOutput();
    const report = withDatabase((db) => {
      const overview = getArchiveOverview(db);
      const rows = getSourceStats(db);

      return {
        totalItems: overview.totalItems,
        totalSources: overview.totalSources,
        rows,
        ...(overview.lastSyncedAt ? { lastSyncedAt: overview.lastSyncedAt } : {}),
      };
    });

    if (report.rows.length === 0) {
      output.info("No items indexed yet.");
      output.line(output.toned("Run `trove pull <source>` to start building the archive.", "muted"));
      return;
    }

    renderStatsReport(output, report);
  });
}

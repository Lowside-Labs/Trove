import { Command } from "commander";
import { buildVaultSummarySection } from "../core/archive.js";
import { TerminalOutput, renderCommandReport } from "../core/output.js";
import { TaskDashboardRenderer } from "../core/progress.js";
import { hydrateArchive } from "../core/hydrate.js";

export function createHydrateCommand() {
  return new Command("hydrate")
    .description("Fetch readable content for external links and write markdown files into the Trove workspace.")
    .option("--limit <number>", "Maximum number of items to hydrate")
    .option("--source <source>", "Restrict hydration to a single source")
    .option("--force", "Re-hydrate items even when they already have content", false)
    .action(async (options) => {
      const output = new TerminalOutput();
      const runLabel = options.source ? `hydrate/${options.source}` : "hydrate";
      const progressRenderer = new TaskDashboardRenderer(output, {
        title: "Hydrate",
        plannedRuns: [runLabel],
      });

      try {
        const limit = parseOptionalInteger(options.limit, "limit");
        progressRenderer.startRun(runLabel);
        const result = await hydrateArchive(undefined, {
          ...(limit !== undefined ? { limit } : {}),
          ...(options.source ? { source: options.source } : {}),
          ...(options.force ? { force: true } : {}),
          onProgress: (event) => {
            progressRenderer.update(runLabel, event);
          },
        });
        progressRenderer.completeRun(runLabel, result.hydratedCount);
        progressRenderer.commit();

        renderCommandReport(output, {
          headline: `Hydrated ${result.hydratedCount} item${result.hydratedCount === 1 ? "" : "s"}.`,
          sections: [
            {
              title: "Results",
              entries: [
                { label: "Hydrated", value: String(result.hydratedCount) },
                { label: "Skipped", value: String(result.skippedCount), tone: "muted" },
                { label: "Failed", value: String(result.failedCount), tone: result.failedCount > 0 ? "warning" : "muted" },
              ],
            },
            {
              ...buildVaultSummarySection(result.vaultArtifacts),
            },
          ],
        });
      } catch (error) {
        progressRenderer.failRun(runLabel, error instanceof Error ? error.message : String(error));
        progressRenderer.commit();
        output.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
      }
    });
}

function parseOptionalInteger(value: string | undefined, label: string): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive integer.`);
  }

  return parsed;
}

import { Command } from "commander";
import { buildVaultSummarySection } from "../core/archive.js";
import { TerminalOutput, renderCommandRunReports, type CommandRunReport } from "../core/output.js";
import { TaskDashboardRenderer } from "../core/progress.js";
import type { SyncCommandOptions, SyncSummary } from "../../../trove-contracts/src/index.js";
import { formatSupportedKindsHelp, listSyncSourceIds } from "../sources/index.js";
import { getSyncRunLabels, syncSourceToWorkspace } from "../../../trove-core/src/index.js";

export function createSyncCommand() {
  return new Command("sync")
    .description("Sync content from a source into the Trove workspace.")
    .argument("<source>", `Source adapter to run, currently: ${listSyncSourceIds().join(" | ")}`)
    .option("--browser <browser>", "Chromium browser id to use for seamless session reuse", "auto")
    .option("--profile <profile>", "Browser profile to read cookies from")
    .option("--limit <number>", "Maximum number of items to import")
    .option(
      "--cdp-url <url>",
      "Attach to a live Chromium browser over CDP, for example http://127.0.0.1:9222",
    )
    .option("--user <user>", "Account username for sources that sync public user data")
    .option(
      "--kind <kind>",
      `Source-specific sync mode. Supported today: ${formatSupportedKindsHelp()}`,
    )
    .option(
      "--headful",
      "Show the browser while Trove discovers the authenticated source request",
      false,
    )
    .option("--debug-raw-pages", "Also store full raw GraphQL page payloads for debugging", false)
    .action(async (source, options) => {
      const output = new TerminalOutput();
      let progressRenderer: TaskDashboardRenderer | undefined;
      let activeRunLabel: string | undefined;

      try {
        const limit = parseOptionalInteger(options.limit, "limit");
        const commandOptions: SyncCommandOptions = { ...(options as SyncCommandOptions) };
        const labels = getSyncRunLabels(source, commandOptions);
        const reports: CommandRunReport[] = [];

        progressRenderer = new TaskDashboardRenderer(output, {
          title: `Sync ${source}`,
          plannedRuns: labels,
        });

        const result = await syncSourceToWorkspace({
          source,
          options: commandOptions,
          ...(limit !== undefined ? { limit } : {}),
          onRunStart: (label) => {
            activeRunLabel = label;
            progressRenderer?.startRun(label);
          },
          onRunProgress: (label, event) => {
            progressRenderer?.update(label, event);
          },
          onRunComplete: (run) => {
            progressRenderer?.completeRun(run.label, run.count);
            reports.push(toSyncRunReport(run.label, run.count, run.summary));
            activeRunLabel = undefined;
          },
        });

        progressRenderer.commit();
        renderCommandRunReports(output, source, reports);
        output.blank();
        output.writeSummarySections([buildVaultSummarySection(result.vaultArtifacts)]);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        if (activeRunLabel) {
          progressRenderer?.failRun(activeRunLabel, message);
        }

        progressRenderer?.commit();
        output.error(message);
        process.exitCode = 1;
      }
    });
}

function toSyncRunReport(label: string, count: number, summary?: SyncSummary): CommandRunReport {
  return {
    label,
    count,
    headline: summary?.headline ?? `Imported ${count} item${count === 1 ? "" : "s"}.`,
    sections: summary?.sections ?? [],
    ...(summary?.notes ? { notes: summary.notes } : {}),
  };
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

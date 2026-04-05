import { Command } from "commander";
import { TerminalOutput, renderCommandReport } from "../core/output.js";
import { buildVaultSummarySection, runArchivePostProcessing } from "../core/archive.js";

export function createIndexCommand() {
  return new Command("index").description("Generate agent-readable vault files in the Trove home directory.").action(() => {
    const output = new TerminalOutput();
    const artifacts = runArchivePostProcessing();

    renderCommandReport(output, {
      headline: "Updated Trove vault artifacts.",
      sections: [buildVaultSummarySection(artifacts)],
    });
  });
}

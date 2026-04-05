import { Command } from "commander";
import { TerminalOutput, renderCommandReport } from "../core/output.js";
import { buildVaultSummarySection, runArchivePostProcessing } from "../core/archive.js";

export function createIndexCommand() {
  return new Command("index").description("Regenerate INDEX.md, AGENTS.md, and CLAUDE.md in the Trove workspace.").action(() => {
    const output = new TerminalOutput();
    const artifacts = runArchivePostProcessing();

    renderCommandReport(output, {
      headline: "Updated Trove workspace guides.",
      sections: [buildVaultSummarySection(artifacts)],
      notes: ["Open the workspace folder in your agent and start from INDEX.md."],
    });
  });
}

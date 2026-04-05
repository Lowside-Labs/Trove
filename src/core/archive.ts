import path from "node:path";
import type { SummarySection } from "./output.js";
import type { ProgressHandler } from "./progress.js";
import { generateVaultArtifacts, type VaultArtifacts } from "./vault.js";

export function runArchivePostProcessing(root?: string, onProgress?: ProgressHandler): VaultArtifacts {
  onProgress?.({
    phase: "index",
    message: "Refreshing workspace guides",
  });

  return generateVaultArtifacts(root);
}

export function buildVaultSummarySection(vaultArtifacts: VaultArtifacts): SummarySection {
  return {
    title: "Workspace",
    entries: [
      { label: "Root", value: path.dirname(vaultArtifacts.indexPath) },
      { label: "Index", value: vaultArtifacts.indexPath },
      { label: "AGENTS", value: vaultArtifacts.agentsPath },
      { label: "CLAUDE", value: vaultArtifacts.claudePath },
    ],
  };
}

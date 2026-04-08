import type { SyncStartRequest } from "trove-contracts";
import type { SourceStatus } from "trove-contracts";
export function buildOnboardingSyncRequest({
  hnUsername,
  source,
}: {
  hnUsername: string;
  source: SourceStatus;
}): SyncStartRequest {
  return {
    source: source.id,
    ...(source.id === "hn" && hnUsername.trim() ? { user: hnUsername.trim() } : {}),
  };
}

export function getOnboardingSourcePendingCopy(source: SourceStatus): string {
  if (source.id === "hn") {
    return "Waiting for username";
  }

  if (source.id === "chatgpt" || source.id === "claude") {
    return "Preparing conversation sync";
  }

  return "Queued";
}

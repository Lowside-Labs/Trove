import type { WorkspaceSnapshot } from "trove-contracts";
import { AppShell } from "./app-shell";

type ReadyWorkspaceSnapshot = Extract<WorkspaceSnapshot, { status: "ready" }>;

interface ReadyWorkspaceRouterProps {
  snapshot: ReadyWorkspaceSnapshot;
  onRefreshSnapshot(): void;
}

export function ReadyWorkspaceRouter({
  onRefreshSnapshot,
  snapshot,
}: ReadyWorkspaceRouterProps) {
  return <AppShell snapshot={snapshot} onRefreshSnapshot={onRefreshSnapshot} />;
}

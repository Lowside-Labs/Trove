import type { WorkspaceSnapshot } from "trove-contracts";
import { LibraryScreen } from "../features/library/library-screen";

type ReadyWorkspaceSnapshot = Extract<WorkspaceSnapshot, { status: "ready" }>;

interface AppShellProps {
  snapshot: ReadyWorkspaceSnapshot;
}

export function AppShell({ snapshot }: AppShellProps) {
  return (
    <main className="h-full overflow-hidden">
      <div className="w-full">
        <LibraryScreen snapshot={snapshot} />
      </div>
    </main>
  );
}

import type { WorkspaceSnapshot } from "trove-contracts";
import { LibraryScreen } from "../features/library/library-screen";

type ReadyWorkspaceSnapshot = Extract<WorkspaceSnapshot, { status: "ready" }>;

interface AppShellProps {
  snapshot: ReadyWorkspaceSnapshot;
}

export function AppShell({ snapshot }: AppShellProps) {
  return (
    <main className="px-8 pb-8 pt-8">
      <div className="w-full">
        <LibraryScreen snapshot={snapshot} />
      </div>
    </main>
  );
}

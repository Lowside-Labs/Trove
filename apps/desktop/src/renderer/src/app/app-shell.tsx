import type { WorkspaceSnapshot } from "trove-contracts";
import { LibraryScreen } from "../features/library/library-screen";

type ReadyWorkspaceSnapshot = Extract<WorkspaceSnapshot, { status: "ready" }>;

interface AppShellProps {
  snapshot: ReadyWorkspaceSnapshot;
}

export function AppShell({ snapshot }: AppShellProps) {
  return (
    <main className="px-8 pb-8 pt-2">
      <div className="mx-auto max-w-[1200px]">
        <LibraryScreen snapshot={snapshot} />
      </div>
    </main>
  );
}

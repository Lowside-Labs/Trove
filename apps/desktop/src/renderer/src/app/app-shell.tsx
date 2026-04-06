import type { WorkspaceSnapshot } from "trove-contracts";
import { LibraryScreen } from "../features/library/library-screen";

type ReadyWorkspaceSnapshot = Extract<WorkspaceSnapshot, { status: "ready" }>;

interface AppShellProps {
  snapshot: ReadyWorkspaceSnapshot;
}

export function AppShell({ snapshot }: AppShellProps) {
  return (
    <main className="min-h-screen px-6 py-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-[1600px] flex-col">
        <LibraryScreen snapshot={snapshot} />
      </div>
    </main>
  );
}

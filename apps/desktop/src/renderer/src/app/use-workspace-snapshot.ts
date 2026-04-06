import { useEffect, useState } from "react";
import type { WorkspaceSnapshot } from "trove-contracts";

interface WorkspaceSnapshotState {
  snapshot: WorkspaceSnapshot | null;
  error: string | null;
  isLoading: boolean;
}

export function useWorkspaceSnapshot(): WorkspaceSnapshotState {
  const [state, setState] = useState<WorkspaceSnapshotState>({
    snapshot: null,
    error: null,
    isLoading: true,
  });

  useEffect(() => {
    let cancelled = false;

    void window.troveDesktop.workspace
      .getSnapshot()
      .then((snapshot) => {
        if (!cancelled) {
          setState({
            snapshot,
            error: null,
            isLoading: false,
          });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            snapshot: null,
            error: error instanceof Error ? error.message : String(error),
            isLoading: false,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

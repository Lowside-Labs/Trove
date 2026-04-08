import { useEffect, useState } from "react";
import type { WorkspaceSnapshot } from "trove-contracts";

interface WorkspaceSnapshotState {
  snapshot: WorkspaceSnapshot | null;
  error: string | null;
  isLoading: boolean;
  isRefreshing: boolean;
  refresh(): void;
}

export function useWorkspaceSnapshot(): WorkspaceSnapshotState {
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [state, setState] = useState<WorkspaceSnapshotState>({
    snapshot: null,
    error: null,
    isLoading: true,
    isRefreshing: false,
    refresh: () => {},
  });

  useEffect(() => {
    let cancelled = false;

    setState((current) => ({
      ...current,
      error: null,
      isLoading: current.snapshot ? current.isLoading : true,
      isRefreshing: current.snapshot ? true : false,
    }));

    void window.troveDesktop.workspace
      .getSnapshot()
      .then((snapshot) => {
        if (!cancelled) {
          setState({
            snapshot,
            error: null,
            isLoading: false,
            isRefreshing: false,
            refresh: () => setRefreshVersion((value) => value + 1),
          });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            snapshot: null,
            error: error instanceof Error ? error.message : String(error),
            isLoading: false,
            isRefreshing: false,
            refresh: () => setRefreshVersion((value) => value + 1),
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [refreshVersion]);

  return state;
}

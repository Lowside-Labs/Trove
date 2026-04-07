import { useEffect, useMemo, useRef, useState } from "react";
import type { SyncJobResult } from "trove-contracts";

export type SourceSyncStatus = "idle" | "syncing" | "succeeded" | "failed";

export interface SourceSyncState {
  status: SourceSyncStatus;
  error: string | null;
  latestMessage: string | null;
  latestResult: SyncJobResult | null;
}

interface UseSourceSyncArgs {
  onCompleted?(): void;
}

interface UseSourceSyncResult {
  stateBySource: Record<string, SourceSyncState>;
  startSync(source: string): Promise<void>;
}

const idleState: SourceSyncState = {
  status: "idle",
  error: null,
  latestMessage: null,
  latestResult: null,
};

export function useSourceSync({ onCompleted }: UseSourceSyncArgs = {}): UseSourceSyncResult {
  const [stateBySource, setStateBySource] = useState<Record<string, SourceSyncState>>({});
  const settleTimeoutsRef = useRef<Record<string, number>>({});

  useEffect(() => {
    return () => {
      for (const timeoutId of Object.values(settleTimeoutsRef.current)) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  const scheduleReset = (source: string) => {
    const existingTimeout = settleTimeoutsRef.current[source];
    if (existingTimeout) {
      window.clearTimeout(existingTimeout);
    }

    settleTimeoutsRef.current[source] = window.setTimeout(() => {
      setStateBySource((current) => ({
        ...current,
        [source]: {
          status: "idle",
          error: null,
          latestMessage: null,
          latestResult: current[source]?.latestResult ?? null,
        },
      }));
      delete settleTimeoutsRef.current[source];
    }, 2000);
  };

  const startSync = async (source: string) => {
    const existingTimeout = settleTimeoutsRef.current[source];
    if (existingTimeout) {
      window.clearTimeout(existingTimeout);
      delete settleTimeoutsRef.current[source];
    }

    setStateBySource((current) => ({
      ...current,
      [source]: {
        status: "syncing",
        error: null,
        latestMessage: "Syncing…",
        latestResult: current[source]?.latestResult ?? null,
      },
    }));

    try {
      const result = await window.troveDesktop.sync.start(source);
      setStateBySource((current) => ({
        ...current,
        [source]: {
          status: "succeeded",
          error: null,
          latestMessage: `${result.totalCount} new item${result.totalCount === 1 ? "" : "s"}`,
          latestResult: result,
        },
      }));
      onCompleted?.();
      scheduleReset(source);
    } catch (error: unknown) {
      setStateBySource((current) => ({
        ...current,
        [source]: {
          status: "failed",
          error: error instanceof Error ? error.message : String(error),
          latestMessage: null,
          latestResult: current[source]?.latestResult ?? null,
        },
      }));
      scheduleReset(source);
    }
  };

  return useMemo(
    () => ({
      stateBySource,
      startSync,
    }),
    [stateBySource],
  );
}

export function getSourceSyncState(
  stateBySource: Record<string, SourceSyncState>,
  source: string,
): SourceSyncState {
  return stateBySource[source] ?? idleState;
}

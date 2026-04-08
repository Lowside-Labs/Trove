import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import type {
  OnboardingSourceSyncState,
  OnboardingSyncContextValue,
  OnboardingSyncState,
} from "./onboarding-types";
import type { SourceStatus } from "trove-contracts";
import { buildOnboardingSyncRequest } from "./onboarding-sync-config";

const OnboardingSyncContext = createContext<OnboardingSyncContextValue | null>(null);

interface OnboardingSyncProviderProps extends PropsWithChildren {
  hnUsername: string;
  onRefreshSnapshot(): void;
  selectedSources: SourceStatus[];
}

function createSourceState(source: SourceStatus): OnboardingSourceSyncState {
  return {
    sourceId: source.id,
    displayName: source.displayName,
    status: "pending",
    error: null,
    resultCount: null,
  };
}

function createInitialState(selectedSources: SourceStatus[]): OnboardingSyncState {
  return {
    status: "idle",
    latestError: null,
    sourceStates: selectedSources.map(createSourceState),
  };
}

export function OnboardingSyncProvider({
  children,
  hnUsername,
  onRefreshSnapshot,
  selectedSources,
}: OnboardingSyncProviderProps) {
  const [state, setState] = useState<OnboardingSyncState>(() => createInitialState(selectedSources));
  const runPromiseRef = useRef<Promise<void> | null>(null);
  const selectionKey = useMemo(
    () => `${selectedSources.map((source) => source.id).join("|")}::${hnUsername.trim()}`,
    [hnUsername, selectedSources],
  );

  useEffect(() => {
    if (runPromiseRef.current) {
      return;
    }

    setState(createInitialState(selectedSources));
  }, [selectionKey]);

  const runSources = useCallback(
    async (sourcesToRun: SourceStatus[]) => {
      if (sourcesToRun.length === 0) {
        return;
      }

      setState((current) => ({
        ...current,
        status: "syncing",
        latestError: null,
        sourceStates: current.sourceStates.map((sourceState) =>
          sourcesToRun.some((source) => source.id === sourceState.sourceId)
            ? {
                ...sourceState,
                status: "pending",
                error: null,
                resultCount: sourceState.resultCount,
              }
            : sourceState,
        ),
      }));

      let hasSuccessfulRun = false;
      let latestError: string | null = null;

      for (const source of sourcesToRun) {
        setState((current) => ({
          ...current,
          sourceStates: current.sourceStates.map((sourceState) =>
            sourceState.sourceId === source.id
              ? {
                  ...sourceState,
                  status: "syncing",
                  error: null,
                }
              : sourceState,
          ),
        }));

        try {
          const result = await window.troveDesktop.sync.start(
            buildOnboardingSyncRequest({
              hnUsername,
              source,
            }),
          );
          hasSuccessfulRun = true;
          setState((current) => ({
            ...current,
            sourceStates: current.sourceStates.map((sourceState) =>
              sourceState.sourceId === source.id
                ? {
                    ...sourceState,
                    status: "succeeded",
                    error: null,
                    resultCount: result.totalCount,
                  }
                : sourceState,
            ),
          }));
        } catch (error: unknown) {
          latestError = error instanceof Error ? error.message : String(error);
          setState((current) => ({
            ...current,
            latestError,
            sourceStates: current.sourceStates.map((sourceState) =>
              sourceState.sourceId === source.id
                ? {
                    ...sourceState,
                    status: "failed",
                    error: latestError,
                  }
                : sourceState,
            ),
          }));
        }
      }

      if (hasSuccessfulRun) {
        onRefreshSnapshot();
      }

      setState((current) => ({
        ...current,
        status: "completed",
        latestError,
      }));
    },
    [hnUsername, onRefreshSnapshot],
  );

  const start = useCallback(async () => {
    if (runPromiseRef.current) {
      return runPromiseRef.current;
    }

    const promise = runSources(selectedSources).finally(() => {
      runPromiseRef.current = null;
    });
    runPromiseRef.current = promise;
    return promise;
  }, [runSources, selectedSources]);

  const retryFailed = useCallback(async () => {
    if (runPromiseRef.current) {
      return runPromiseRef.current;
    }

    const failedSources = selectedSources.filter((source) =>
      state.sourceStates.some(
        (sourceState) => sourceState.sourceId === source.id && sourceState.status === "failed",
      ),
    );

    const promise = runSources(failedSources).finally(() => {
      runPromiseRef.current = null;
    });
    runPromiseRef.current = promise;
    return promise;
  }, [runSources, selectedSources, state.sourceStates]);

  const value = useMemo<OnboardingSyncContextValue>(() => {
    const failedCount = state.sourceStates.filter((source) => source.status === "failed").length;
    const successfulCount = state.sourceStates.filter(
      (source) => source.status === "succeeded",
    ).length;
    const totalImportedCount = state.sourceStates.reduce(
      (sum, source) => sum + (source.resultCount ?? 0),
      0,
    );

    return {
      state,
      meta: {
        failedCount,
        hasFailures: failedCount > 0,
        hasSucceeded: successfulCount > 0,
        isRunning: state.status === "syncing",
        successfulCount,
        totalImportedCount,
      },
      actions: {
        start,
        retryFailed,
      },
    };
  }, [retryFailed, start, state]);

  return <OnboardingSyncContext.Provider value={value}>{children}</OnboardingSyncContext.Provider>;
}

export function useOnboardingSync(): OnboardingSyncContextValue {
  const context = useContext(OnboardingSyncContext);

  if (!context) {
    throw new Error("useOnboardingSync must be used inside OnboardingSyncProvider.");
  }

  return context;
}

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LibraryItemSummary, ListLibraryItemsInput } from "trove-contracts";

interface LibraryItemsState {
  items: LibraryItemSummary[];
  hasMore: boolean;
  error: string | null;
  isLoadingFirstPage: boolean;
  isLoadingMore: boolean;
  isRefreshing: boolean;
  loadMore(): void;
  refresh(): void;
}

export function useLibraryItems(input: ListLibraryItemsInput): LibraryItemsState {
  const [refreshVersion, setRefreshVersion] = useState(0);
  const baseInput = useMemo(
    () => ({
      ...(input.kind ? { kind: input.kind } : {}),
      ...(input.limit ? { limit: input.limit } : {}),
      ...(input.query ? { query: input.query } : {}),
      ...(input.source ? { source: input.source } : {}),
    }),
    [input.kind, input.limit, input.query, input.source],
  );
  const queryKey = useMemo(
    () =>
      JSON.stringify({
        kind: baseInput.kind ?? "",
        limit: baseInput.limit,
        query: baseInput.query ?? "",
        source: baseInput.source ?? "",
      }),
    [baseInput.kind, baseInput.limit, baseInput.query, baseInput.source],
  );
  const [cursor, setCursor] = useState<string | null>(null);
  const requestVersionRef = useRef(0);
  const [state, setState] = useState<
    Omit<LibraryItemsState, "loadMore" | "refresh">
  >({
    items: [],
    hasMore: false,
    error: null,
    isLoadingFirstPage: true,
    isLoadingMore: false,
    isRefreshing: false,
  });

  const loadPage = useCallback(
    async (nextCursor?: string) => {
      const response = await window.troveDesktop.library.listItems({
        ...baseInput,
        ...(nextCursor ? { cursor: nextCursor } : {}),
      });
      setCursor(response.nextCursor ?? null);
      return response;
    },
    [baseInput],
  );

  useEffect(() => {
    const requestVersion = requestVersionRef.current + 1;
    requestVersionRef.current = requestVersion;
    let cancelled = false;

    setCursor(null);
    setState((current) => ({
      items: current.items,
      hasMore: current.hasMore,
      error: null,
      isLoadingFirstPage: current.items.length === 0,
      isLoadingMore: false,
      isRefreshing: current.items.length > 0,
    }));

    void loadPage()
      .then((response) => {
        if (!cancelled && requestVersionRef.current === requestVersion) {
          setState({
            items: response.items,
            hasMore: response.hasMore,
            error: null,
            isLoadingFirstPage: false,
            isLoadingMore: false,
            isRefreshing: false,
          });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled && requestVersionRef.current === requestVersion) {
          setState((current) => ({
            items: current.items,
            hasMore: current.hasMore,
            error: error instanceof Error ? error.message : String(error),
            isLoadingFirstPage: false,
            isLoadingMore: false,
            isRefreshing: false,
          }));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [loadPage, queryKey, refreshVersion]);

  const loadMore = useCallback(() => {
    if (!cursor) {
      return;
    }
    const requestVersion = requestVersionRef.current;

    setState((current) => {
      if (current.isLoadingFirstPage || current.isLoadingMore || !current.hasMore) {
        return current;
      }

      return {
        ...current,
        error: null,
        isLoadingMore: true,
      };
    });

    void loadPage(cursor)
      .then((response) => {
        if (requestVersionRef.current === requestVersion) {
          setState((current) => ({
            items: mergeItems(current.items, response.items),
            hasMore: response.hasMore,
            error: null,
            isLoadingFirstPage: false,
            isLoadingMore: false,
            isRefreshing: false,
          }));
        }
      })
      .catch((error: unknown) => {
        if (requestVersionRef.current === requestVersion) {
          setState((current) => ({
            ...current,
            error: error instanceof Error ? error.message : String(error),
            isLoadingMore: false,
            isRefreshing: false,
          }));
        }
      });
  }, [cursor, loadPage]);

  return {
    ...state,
    loadMore,
    refresh: () => setRefreshVersion((value) => value + 1),
  };
}

function mergeItems(
  previousItems: LibraryItemSummary[],
  nextItems: LibraryItemSummary[],
): LibraryItemSummary[] {
  const seenIds = new Set(previousItems.map((item) => item.id));

  return previousItems.concat(nextItems.filter((item) => !seenIds.has(item.id)));
}

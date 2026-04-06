import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LibraryItemSummary, ListLibraryItemsInput } from "trove-contracts";

interface LibraryItemsState {
  items: LibraryItemSummary[];
  hasMore: boolean;
  error: string | null;
  isLoadingFirstPage: boolean;
  isLoadingMore: boolean;
  loadMore(): void;
}

export function useLibraryItems(input: ListLibraryItemsInput): LibraryItemsState {
  const baseInput = useMemo(
    () => ({
      ...(input.limit ? { limit: input.limit } : {}),
      ...(input.query ? { query: input.query } : {}),
      ...(input.source ? { source: input.source } : {}),
    }),
    [input.limit, input.query, input.source],
  );
  const queryKey = useMemo(
    () =>
      JSON.stringify({
        limit: baseInput.limit,
        query: baseInput.query ?? "",
        source: baseInput.source ?? "",
      }),
    [baseInput.limit, baseInput.query, baseInput.source],
  );
  const [cursor, setCursor] = useState<string | null>(null);
  const requestVersionRef = useRef(0);
  const [state, setState] = useState<Omit<LibraryItemsState, "loadMore">>({
    items: [],
    hasMore: false,
    error: null,
    isLoadingFirstPage: true,
    isLoadingMore: false,
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
    setState({
      items: [],
      hasMore: false,
      error: null,
      isLoadingFirstPage: true,
      isLoadingMore: false,
    });

    void loadPage()
      .then((response) => {
        if (!cancelled && requestVersionRef.current === requestVersion) {
          setState({
            items: response.items,
            hasMore: response.hasMore,
            error: null,
            isLoadingFirstPage: false,
            isLoadingMore: false,
          });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled && requestVersionRef.current === requestVersion) {
          setState({
            items: [],
            hasMore: false,
            error: error instanceof Error ? error.message : String(error),
            isLoadingFirstPage: false,
            isLoadingMore: false,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [loadPage, queryKey]);

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
          }));
        }
      })
      .catch((error: unknown) => {
        if (requestVersionRef.current === requestVersion) {
          setState((current) => ({
            ...current,
            error: error instanceof Error ? error.message : String(error),
            isLoadingMore: false,
          }));
        }
      });
  }, [cursor, loadPage]);

  return {
    ...state,
    loadMore,
  };
}

function mergeItems(
  previousItems: LibraryItemSummary[],
  nextItems: LibraryItemSummary[],
): LibraryItemSummary[] {
  const seenIds = new Set(previousItems.map((item) => item.id));

  return previousItems.concat(nextItems.filter((item) => !seenIds.has(item.id)));
}

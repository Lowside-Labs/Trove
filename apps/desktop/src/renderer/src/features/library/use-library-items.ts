import { useEffect, useState } from "react";
import type { LibraryItemSummary, ListLibraryItemsInput } from "trove-contracts";

interface LibraryItemsState {
  items: LibraryItemSummary[];
  error: string | null;
  isLoading: boolean;
}

export function useLibraryItems(input: ListLibraryItemsInput): LibraryItemsState {
  const [state, setState] = useState<LibraryItemsState>({
    items: [],
    error: null,
    isLoading: true,
  });

  useEffect(() => {
    let cancelled = false;

    setState((current) => ({
      ...current,
      error: null,
      isLoading: true,
    }));

    void window.troveDesktop.library
      .listItems(input)
      .then((items) => {
        if (!cancelled) {
          setState({
            items,
            error: null,
            isLoading: false,
          });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            items: [],
            error: error instanceof Error ? error.message : String(error),
            isLoading: false,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [input.limit, input.query, input.source]);

  return state;
}

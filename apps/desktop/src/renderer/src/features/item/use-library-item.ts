import { useEffect, useState } from "react";
import type { LibraryItemDetail } from "trove-contracts";

interface LibraryItemState {
  item: LibraryItemDetail | null;
  error: string | null;
  isLoading: boolean;
}

export function useLibraryItem(itemId: number | null): LibraryItemState {
  const [state, setState] = useState<LibraryItemState>({
    item: null,
    error: null,
    isLoading: false,
  });

  useEffect(() => {
    if (itemId === null) {
      setState({
        item: null,
        error: null,
        isLoading: false,
      });
      return;
    }

    let cancelled = false;

    setState((current) => ({
      ...current,
      error: null,
      isLoading: true,
    }));

    void window.troveDesktop.library
      .getItem({ id: itemId })
      .then((item) => {
        if (!cancelled) {
          setState({
            item,
            error: null,
            isLoading: false,
          });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            item: null,
            error: error instanceof Error ? error.message : String(error),
            isLoading: false,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [itemId]);

  return state;
}

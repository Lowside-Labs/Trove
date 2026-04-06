import { startTransition, useDeferredValue, useRef, useState } from "react";
import type { WorkspaceSnapshot } from "trove-contracts";
import { useInfiniteScroll } from "../../hooks/use-infinite-scroll";
import { formatCount } from "../../lib/format";
import { LibraryGrid } from "./library-grid";
import { LibraryList } from "./library-list";
import { LibraryToolbar } from "./library-toolbar";
import type { LibraryViewMode } from "./types";
import { useLibraryItems } from "./use-library-items";

type ReadyWorkspaceSnapshot = Extract<WorkspaceSnapshot, { status: "ready" }>;

interface LibraryScreenProps {
  snapshot: ReadyWorkspaceSnapshot;
}

export function LibraryScreen({ snapshot }: LibraryScreenProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSource, setSelectedSource] = useState("all");
  const [viewMode, setViewMode] = useState<LibraryViewMode>("cards");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const deferredSearchQuery = useDeferredValue(searchQuery.trim());
  const libraryItems = useLibraryItems({
    ...(deferredSearchQuery ? { query: deferredSearchQuery } : {}),
    ...(selectedSource !== "all" ? { source: selectedSource } : {}),
    limit: 120,
  });
  const infiniteScroll = useInfiniteScroll({
    enabled: !libraryItems.error && !libraryItems.isLoadingFirstPage,
    hasMore: libraryItems.hasMore,
    isLoading: libraryItems.isLoadingMore,
    onLoadMore: libraryItems.loadMore,
  });

  const openItem = (url: string) => {
    void window.troveDesktop.system.openExternal(url);
  };

  return (
    <div className="flex flex-col gap-8">
      <LibraryToolbar
        searchInputRef={searchInputRef}
        searchQuery={searchQuery}
        selectedSource={selectedSource}
        sources={snapshot.sources}
        totalItems={snapshot.overview.totalItems}
        viewMode={viewMode}
        onSearchQueryChange={setSearchQuery}
        onSelectSource={(sourceId) => {
          startTransition(() => {
            setSelectedSource(sourceId);
          });
        }}
        onViewModeChange={(nextViewMode) => {
          startTransition(() => {
            setViewMode(nextViewMode);
          });
        }}
      />

      {libraryItems.error ? (
        <p className="py-12 text-center text-[13px] text-destructive">{libraryItems.error}</p>
      ) : libraryItems.isLoadingFirstPage ? (
        <p className="py-12 text-center text-[13px] text-muted-foreground">Loading...</p>
      ) : libraryItems.items.length === 0 ? (
        <p className="py-12 text-center text-[13px] text-muted-foreground">
          {selectedSource === "all"
            ? "No items found."
            : "No items from this source."}
        </p>
      ) : (
        <>
          {deferredSearchQuery ? (
            <p className="text-[13px] text-muted-foreground">
              {formatCount(libraryItems.items.length)}
              {libraryItems.hasMore ? "+" : ""} results
            </p>
          ) : null}
          {viewMode === "cards" ? (
            <LibraryGrid items={libraryItems.items} onOpenItem={openItem} />
          ) : (
            <LibraryList items={libraryItems.items} onOpenItem={openItem} />
          )}
          <div
            ref={infiniteScroll.sentinelRef}
            className="flex min-h-16 items-center justify-center py-4"
          >
            {libraryItems.isLoadingMore ? (
              <p className="text-[13px] text-muted-foreground">Loading more…</p>
            ) : libraryItems.hasMore ? (
              <p className="text-[13px] text-muted-foreground/70">Keep scrolling</p>
            ) : (
              <p className="text-[13px] text-muted-foreground/50">End of archive</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

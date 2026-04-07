import { startTransition, useDeferredValue, useRef, useState } from "react";
import type { WorkspaceSnapshot } from "trove-contracts";
import { useInfiniteScroll } from "../../hooks/use-infinite-scroll";
import { formatCount } from "../../lib/format";
import { LibraryGrid } from "./library-grid";
import { LibraryList } from "./library-list";
import { LibrarySidebar } from "./library-sidebar";
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
  const [selectedKind, setSelectedKind] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<LibraryViewMode>("cards");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const deferredSearchQuery = useDeferredValue(searchQuery.trim());
  const libraryItems = useLibraryItems({
    ...(deferredSearchQuery ? { query: deferredSearchQuery } : {}),
    ...(selectedKind ? { kind: selectedKind } : {}),
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

  const selectedSourceRecord =
    selectedSource === "all"
      ? null
      : snapshot.sources.find((source) => source.id === selectedSource) ?? null;
  const kindOptions = selectedSourceRecord?.kinds ?? [];
  const placeholderItemCount = selectedSourceRecord?.itemCount ?? snapshot.overview.totalItems;

  return (
    <div className="grid h-[calc(100vh-38px)] min-h-0 overflow-hidden lg:grid-cols-[220px_minmax(0,1fr)]">
      <LibrarySidebar
        selectedSource={selectedSource}
        sources={snapshot.sources}
        onSelectSource={(sourceId) => {
          startTransition(() => {
            setSelectedSource(sourceId);
            setSelectedKind(null);
          });
        }}
      />

      <section className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto px-8 pb-8 pt-8">
        <LibraryToolbar
          kindOptions={kindOptions}
          selectedKind={selectedKind}
          searchInputRef={searchInputRef}
          searchQuery={searchQuery}
          totalItems={placeholderItemCount}
          onKindChange={(kindId) => {
            startTransition(() => {
              setSelectedKind(kindId);
            });
          }}
          viewMode={viewMode}
          onSearchQueryChange={setSearchQuery}
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
      </section>
    </div>
  );
}

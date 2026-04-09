import { startTransition, useCallback, useDeferredValue, useRef, useState } from "react";
import type {
  LibraryItemSummary,
  SourceStatus,
  SyncKindMetadata,
  WorkspaceSnapshot,
} from "trove-contracts";
import { useInfiniteScroll } from "../../hooks/use-infinite-scroll";
import { formatCount } from "../../lib/format";
import { LibraryGrid } from "./library-grid";
import { LibraryList } from "./library-list";
import { LibrarySidebar } from "./library-sidebar";
import { LibraryToolbar } from "./library-toolbar";
import type { LibraryViewMode } from "./types";
import { useLibraryItems } from "./use-library-items";
import { type SourceSyncState, useSourceSync } from "./use-source-sync";
import { SyncDialogProvider } from "../sync/sync-dialog-context";

type ReadyWorkspaceSnapshot = Extract<WorkspaceSnapshot, { status: "ready" }>;

interface LibraryScreenProps {
  snapshot: ReadyWorkspaceSnapshot;
  onRefreshSnapshot(): void;
}

export function LibraryScreen({ onRefreshSnapshot, snapshot }: LibraryScreenProps) {
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
    limit: 48,
  });
  const sourceSync = useSourceSync({
    onCompleted: () => {
      startTransition(() => {
        onRefreshSnapshot();
        libraryItems.refresh();
      });
    },
  });
  const infiniteScroll = useInfiniteScroll({
    enabled: !libraryItems.error && !libraryItems.isLoadingFirstPage,
    hasMore: libraryItems.hasMore,
    isLoading: libraryItems.isLoadingMore,
    onLoadMore: libraryItems.loadMore,
  });

  const openItem = useCallback((url: string) => {
    void window.troveDesktop.system.openExternal(url);
  }, []);

  const selectedSourceRecord =
    selectedSource === "all"
      ? null
      : snapshot.sources.find((source) => source.id === selectedSource) ?? null;
  const kindOptions = selectedSourceRecord?.kinds ?? [];
  const placeholderItemCount = selectedSourceRecord?.itemCount ?? snapshot.overview.totalItems;

  return (
    <SyncDialogProvider
      sources={snapshot.sources}
      onSubmit={(input) => sourceSync.startSync(input)}
    >
      <LibraryScreenLayout
        deferredSearchQuery={deferredSearchQuery}
        infiniteScrollSentinelRef={infiniteScroll.sentinelRef}
        kindOptions={kindOptions}
        libraryError={libraryItems.error}
        libraryItems={libraryItems.items}
        onOpenItem={openItem}
        onSearchQueryChange={setSearchQuery}
        onSelectSource={(sourceId) => {
          startTransition(() => {
            setSelectedSource(sourceId);
            setSelectedKind(null);
          });
        }}
        onViewModeChange={(nextViewMode) => {
          startTransition(() => {
            setViewMode(nextViewMode);
          });
        }}
        placeholderItemCount={placeholderItemCount}
        searchInputRef={searchInputRef}
        searchQuery={searchQuery}
        selectedKind={selectedKind}
        selectedSource={selectedSource}
        sources={snapshot.sources}
        syncStateBySource={sourceSync.stateBySource}
        viewMode={viewMode}
        workspaceRoot={snapshot.overview.root}
        hasMore={libraryItems.hasMore}
        isLoadingFirstPage={libraryItems.isLoadingFirstPage}
        isLoadingMore={libraryItems.isLoadingMore}
        onKindChange={(kindId) => {
          startTransition(() => {
            setSelectedKind(kindId);
          });
        }}
      />
    </SyncDialogProvider>
  );
}

interface LibraryScreenLayoutProps {
  deferredSearchQuery: string;
  hasMore: boolean;
  infiniteScrollSentinelRef: React.Ref<HTMLDivElement>;
  isLoadingFirstPage: boolean;
  isLoadingMore: boolean;
  kindOptions: SyncKindMetadata[];
  libraryError: string | null;
  libraryItems: LibraryItemSummary[];
  onKindChange(kindId: string | null): void;
  onOpenItem(url: string): void;
  onSearchQueryChange(value: string): void;
  onSelectSource(sourceId: string): void;
  onViewModeChange(viewMode: LibraryViewMode): void;
  placeholderItemCount: number;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  searchQuery: string;
  selectedKind: string | null;
  selectedSource: string;
  sources: SourceStatus[];
  syncStateBySource: Record<string, SourceSyncState>;
  viewMode: LibraryViewMode;
  workspaceRoot: string;
}

function LibraryScreenLayout({
  deferredSearchQuery,
  hasMore,
  infiniteScrollSentinelRef,
  isLoadingFirstPage,
  isLoadingMore,
  kindOptions,
  libraryError,
  libraryItems,
  onKindChange,
  onOpenItem,
  onSearchQueryChange,
  onSelectSource,
  onViewModeChange,
  placeholderItemCount,
  searchInputRef,
  searchQuery,
  selectedKind,
  selectedSource,
  sources,
  syncStateBySource,
  viewMode,
  workspaceRoot,
}: LibraryScreenLayoutProps) {
  return (
    <div className="animate-screen-enter grid h-[calc(100vh-38px)] min-h-0 overflow-hidden md:grid-cols-[280px_minmax(0,1fr)]">
      <LibrarySidebar
        workspaceRoot={workspaceRoot}
        selectedSource={selectedSource}
        sources={sources}
        syncStateBySource={syncStateBySource}
        onSelectSource={onSelectSource}
      />

      <section className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto px-8 pb-8 pt-8">
        <LibraryToolbar
          kindOptions={kindOptions}
          selectedKind={selectedKind}
          searchInputRef={searchInputRef}
          searchQuery={searchQuery}
          totalItems={placeholderItemCount}
          onKindChange={onKindChange}
          viewMode={viewMode}
          onSearchQueryChange={onSearchQueryChange}
          onViewModeChange={onViewModeChange}
        />

        {libraryError ? (
          <p className="py-12 text-center text-[13px] text-destructive">{libraryError}</p>
        ) : isLoadingFirstPage ? (
          <p className="py-12 text-center text-[13px] text-muted-foreground">Loading...</p>
        ) : libraryItems.length === 0 ? (
          <p className="py-12 text-center text-[13px] text-muted-foreground">
            {selectedSource === "all" ? "No items found." : "No items from this source."}
          </p>
        ) : (
          <>
            {deferredSearchQuery ? (
              <p className="text-[13px] text-muted-foreground">
                {formatCount(libraryItems.length)}
                {hasMore ? "+" : ""} results
              </p>
            ) : null}
            {viewMode === "cards" ? (
              <LibraryGrid items={libraryItems} onOpenItem={onOpenItem} />
            ) : (
              <LibraryList items={libraryItems} onOpenItem={onOpenItem} />
            )}
            <div ref={infiniteScrollSentinelRef} className="flex min-h-16 items-center justify-center py-4">
              {isLoadingMore ? (
                <p className="text-[13px] text-muted-foreground">Loading more…</p>
              ) : hasMore ? (
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

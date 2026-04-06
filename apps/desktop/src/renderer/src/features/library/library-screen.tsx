import { startTransition, useDeferredValue, useRef, useState } from "react";
import type { WorkspaceSnapshot } from "trove-contracts";
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
    limit: 60,
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
      ) : libraryItems.isLoading ? (
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
              {formatCount(libraryItems.items.length)} results
            </p>
          ) : null}
          {viewMode === "cards" ? (
            <LibraryGrid items={libraryItems.items} onOpenItem={openItem} />
          ) : (
            <LibraryList items={libraryItems.items} onOpenItem={openItem} />
          )}
        </>
      )}
    </div>
  );
}

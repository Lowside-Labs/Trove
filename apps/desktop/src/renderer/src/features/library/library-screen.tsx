import { startTransition, useDeferredValue, useEffect, useRef, useState } from "react";
import type { WorkspaceSnapshot } from "trove-contracts";
import { AppDock } from "../../app/app-dock";
import { formatCount } from "../../lib/format";
import { ItemDetailPanel } from "../item/item-detail-panel";
import { useLibraryItem } from "../item/use-library-item";
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
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const deferredSearchQuery = useDeferredValue(searchQuery.trim());
  const libraryItems = useLibraryItems({
    ...(deferredSearchQuery ? { query: deferredSearchQuery } : {}),
    ...(selectedSource !== "all" ? { source: selectedSource } : {}),
    limit: 60,
  });

  const activeSummary =
    libraryItems.items.find((item) => item.id === selectedItemId) ?? libraryItems.items[0] ?? null;
  const activeItem = useLibraryItem(activeSummary?.id ?? null);

  useEffect(() => {
    if (libraryItems.items.length === 0) {
      setSelectedItemId(null);
      return;
    }

    if (!libraryItems.items.some((item) => item.id === selectedItemId)) {
      setSelectedItemId(libraryItems.items[0]?.id ?? null);
    }
  }, [libraryItems.items, selectedItemId]);

  const sourceUrl = activeItem.item?.url ?? activeSummary?.url ?? null;

  return (
    <div className="relative flex min-h-full flex-1 flex-col gap-6 pb-24">
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

      <div className="grid flex-1 gap-6 xl:grid-cols-[minmax(0,1.35fr)_30rem]">
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <p className="text-sm text-zinc-600">
              {libraryItems.isLoading
                ? "Refreshing library…"
                : `${formatCount(libraryItems.items.length)} visible items`}
            </p>
            {deferredSearchQuery ? (
              <p className="text-sm text-zinc-500">Searching for “{deferredSearchQuery}”</p>
            ) : null}
          </div>

          {libraryItems.error ? (
            <div className="trove-panel rounded-[2rem] p-6 text-sm leading-7 text-red-700">
              {libraryItems.error}
            </div>
          ) : libraryItems.items.length === 0 ? (
            <EmptyLibraryState selectedSource={selectedSource} />
          ) : viewMode === "cards" ? (
            <LibraryGrid
              items={libraryItems.items}
              selectedItemId={activeSummary?.id ?? null}
              onSelect={setSelectedItemId}
            />
          ) : (
            <LibraryList
              items={libraryItems.items}
              selectedItemId={activeSummary?.id ?? null}
              onSelect={setSelectedItemId}
            />
          )}
        </section>

        <ItemDetailPanel
          error={activeItem.error}
          isLoading={activeItem.isLoading}
          item={activeItem.item}
          summary={activeSummary}
          onOpenSource={() => {
            if (sourceUrl) {
              void window.troveDesktop.system.openExternal(sourceUrl);
            }
          }}
        />
      </div>

      <AppDock
        canOpenSource={Boolean(sourceUrl)}
        onFocusSearch={() => searchInputRef.current?.focus()}
        onOpenSource={() => {
          if (sourceUrl) {
            void window.troveDesktop.system.openExternal(sourceUrl);
          }
        }}
      />
    </div>
  );
}

function EmptyLibraryState({ selectedSource }: { selectedSource: string }) {
  return (
    <div className="trove-panel flex min-h-[22rem] items-center justify-center rounded-[2rem] p-8">
      <div className="max-w-md space-y-3 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">Empty</p>
        <h2 className="font-serif text-4xl leading-none tracking-[-0.05em] text-zinc-950">
          Nothing matches this view yet.
        </h2>
        <p className="text-sm leading-7 text-zinc-600">
          {selectedSource === "all"
            ? "Try a different search phrase or sync another source into this workspace."
            : "This source has no visible results for the current filter."}
        </p>
      </div>
    </div>
  );
}

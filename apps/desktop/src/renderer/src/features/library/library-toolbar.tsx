import * as React from "react";
import type { SourceStatus } from "trove-contracts";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { formatCount, formatDateTime } from "../../lib/format";
import type { LibraryViewMode } from "./types";

interface LibraryToolbarProps {
  searchQuery: string;
  selectedSource: string;
  sources: SourceStatus[];
  totalItems: number;
  viewMode: LibraryViewMode;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  onSearchQueryChange(value: string): void;
  onSelectSource(sourceId: string): void;
  onViewModeChange(viewMode: LibraryViewMode): void;
}

export function LibraryToolbar({
  onSearchQueryChange,
  onSelectSource,
  onViewModeChange,
  searchInputRef,
  searchQuery,
  selectedSource,
  sources,
  totalItems,
  viewMode,
}: LibraryToolbarProps) {
  return (
    <header className="trove-panel rounded-[2rem] p-5 lg:p-6">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-600">
              Library
            </p>
            <div className="space-y-2">
              <h1 className="font-serif text-5xl leading-[0.92] tracking-[-0.05em] text-zinc-950 lg:text-6xl">
                Browse the archive like a gallery.
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-zinc-700 lg:text-base">
                {formatCount(totalItems)} items ready to explore. Switch between dense cards and
                a quieter list without leaving the page.
              </p>
            </div>
          </div>

          <div className="grid gap-3 text-sm text-zinc-600 sm:grid-cols-2">
            <Stat label="Sources" value={formatCount(sources.length)} />
            <Stat
              label="Last sync"
              value={formatDateTime(
                sources
                  .map((source) => source.lastSyncedAt)
                  .filter((value): value is string => Boolean(value))
                  .sort()
                  .at(-1),
              )}
            />
          </div>
        </div>

        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex-1">
            <Input
              ref={searchInputRef}
              size="lg"
              placeholder="Search titles, excerpts, and archived text"
              value={searchQuery}
              onChange={(event) => onSearchQueryChange(event.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 self-start rounded-full bg-white/72 p-1 ring-1 ring-black/8">
            <Button
              variant={viewMode === "cards" ? "primary" : "ghost"}
              size="sm"
              onClick={() => onViewModeChange("cards")}
            >
              Cards
            </Button>
            <Button
              variant={viewMode === "list" ? "primary" : "ghost"}
              size="sm"
              onClick={() => onViewModeChange("list")}
            >
              List
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            data-active={selectedSource === "all" || undefined}
            variant="chip"
            size="sm"
            onClick={() => onSelectSource("all")}
          >
            All Sources
          </Button>
          {sources.map((source) => (
            <Button
              key={source.id}
              data-active={selectedSource === source.id || undefined}
              variant="chip"
              size="sm"
              onClick={() => onSelectSource(source.id)}
            >
              {source.displayName} · {formatCount(source.itemCount)}
            </Button>
          ))}
        </div>
      </div>
    </header>
  );
}

interface StatProps {
  label: string;
  value: string;
}

function Stat({ label, value }: StatProps) {
  return (
    <div className="rounded-[1.25rem] bg-white/55 px-4 py-3 ring-1 ring-black/6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-zinc-900">{value}</p>
    </div>
  );
}

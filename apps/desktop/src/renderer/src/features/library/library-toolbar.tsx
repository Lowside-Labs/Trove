import * as React from "react";
import type { SourceStatus } from "trove-contracts";
import { ThemeToggle } from "../../components/theme-toggle";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { cn } from "../../lib/cn";
import { formatCount } from "../../lib/format";
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
    <header className="space-y-5">
      <div className="flex items-baseline justify-between">
        <h1 className="text-[28px] font-semibold tracking-tight text-foreground">Library</h1>
        <span className="text-[13px] text-muted-foreground">{formatCount(totalItems)} items</span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1">
          <Input
            ref={searchInputRef}
            placeholder="Search"
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 rounded-lg bg-secondary p-0.5">
            <Button
              variant={viewMode === "cards" ? "primary" : "ghost"}
              size="sm"
              onClick={() => onViewModeChange("cards")}
            >
              Grid
            </Button>
            <Button
              variant={viewMode === "list" ? "primary" : "ghost"}
              size="sm"
              onClick={() => onViewModeChange("list")}
            >
              List
            </Button>
          </div>
          <ThemeToggle />
        </div>
      </div>

      <nav className="-mb-px flex gap-1 overflow-x-auto border-b border-border">
        <SourceTab
          active={selectedSource === "all"}
          label="All"
          onClick={() => onSelectSource("all")}
        />
        {sources.map((source) => (
          <SourceTab
            key={source.id}
            active={selectedSource === source.id}
            label={source.displayName}
            count={source.itemCount}
            onClick={() => onSelectSource(source.id)}
          />
        ))}
      </nav>
    </header>
  );
}

interface SourceTabProps {
  active: boolean;
  label: string;
  count?: number;
  onClick(): void;
}

function SourceTab({ active, count, label, onClick }: SourceTabProps) {
  return (
    <button
      className={cn(
        "shrink-0 cursor-pointer border-b-2 px-3 pb-2.5 pt-1 text-[13px] font-medium transition-colors",
        active
          ? "border-foreground text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground",
      )}
      type="button"
      onClick={onClick}
    >
      {label}
      {count != null ? (
        <span className={cn("ml-1.5", active ? "text-muted-foreground" : "text-muted-foreground/60")}>
          {formatCount(count)}
        </span>
      ) : null}
    </button>
  );
}

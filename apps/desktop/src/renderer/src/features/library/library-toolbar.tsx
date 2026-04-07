import * as React from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { formatCount } from "../../lib/format";
import type { LibraryViewMode } from "./types";

interface LibraryToolbarProps {
  searchQuery: string;
  totalItems: number;
  viewMode: LibraryViewMode;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  onSearchQueryChange(value: string): void;
  onViewModeChange(viewMode: LibraryViewMode): void;
}

export function LibraryToolbar({
  onSearchQueryChange,
  onViewModeChange,
  searchInputRef,
  searchQuery,
  totalItems,
  viewMode,
}: LibraryToolbarProps) {
  return (
    <header className="space-y-6">
      <div className="flex items-start justify-end gap-6">
        <span className="pt-1 text-[14px] text-muted-foreground">{formatCount(totalItems)} items</span>
      </div>

      <div className="flex items-end gap-6">
        <div className="flex-1">
          <Input
            className="border-0 border-b border-border/60 pb-3 placeholder:text-muted-foreground/45 focus:border-foreground/15"
            ref={searchInputRef}
            placeholder="Search"
            size="xl"
            value={searchQuery}
            variant="editorial"
            onChange={(event) => onSearchQueryChange(event.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 pb-2">
          <Button
            className="rounded-full px-4"
            variant={viewMode === "cards" ? "primary" : "ghost"}
            size="sm"
            onClick={() => onViewModeChange("cards")}
          >
            Grid
          </Button>
          <Button
            className="rounded-full px-4"
            variant={viewMode === "list" ? "primary" : "ghost"}
            size="sm"
            onClick={() => onViewModeChange("list")}
          >
            List
          </Button>
        </div>
      </div>
    </header>
  );
}

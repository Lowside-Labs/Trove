import * as React from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import type { LibraryViewMode } from "./types";

interface LibraryToolbarProps {
  searchQuery: string;
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
  viewMode,
}: LibraryToolbarProps) {
  return (
    <header>
      <div className="flex items-end gap-4">
        <div className="flex-1">
          <Input
            className="border-0 placeholder:text-muted-foreground/45 focus:border-foreground/15"
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

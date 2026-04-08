import * as React from "react";
import IconBarsThree from "central-icons/IconBarsThree";
import IconSquareGridCircle from "central-icons/IconSquareGridCircle";
import type { SyncKindMetadata } from "trove-contracts";
import { Input } from "../../components/ui/input";
import { Select, SelectPrimitive } from "../../components/ui/select";
import { ToggleGroup } from "../../components/ui/toggle-group";
import { formatCount } from "../../lib/format";
import { formatKindLabel } from "./kind-label";
import type { LibraryViewMode } from "./types";

interface LibraryToolbarProps {
  kindOptions: SyncKindMetadata[];
  selectedKind: string | null;
  searchQuery: string;
  totalItems: number;
  viewMode: LibraryViewMode;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  onKindChange(value: string | null): void;
  onSearchQueryChange(value: string): void;
  onViewModeChange(viewMode: LibraryViewMode): void;
}

export function LibraryToolbar({
  kindOptions,
  onKindChange,
  onSearchQueryChange,
  onViewModeChange,
  selectedKind,
  searchInputRef,
  searchQuery,
  totalItems,
  viewMode,
}: LibraryToolbarProps) {
  const selectedKindLabel =
    selectedKind == null
      ? "All"
      : formatKindLabel(
          kindOptions.find((kind) => kind.id === selectedKind)?.id ?? selectedKind,
        );

  return (
    <header>
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Input
            className="border-0 placeholder:text-muted-foreground/45 focus:border-foreground/15"
            ref={searchInputRef}
            placeholder={`Search ${formatCount(totalItems)} items...`}
            size="xl"
            value={searchQuery}
            variant="editorial"
            onChange={(event) => onSearchQueryChange(event.target.value)}
          />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {kindOptions.length > 1 ? (
            <Select.Root
              value={selectedKind ?? "__all"}
              onValueChange={(value) => onKindChange(value === "__all" ? null : value)}
            >
              <Select.Trigger>
                <Select.Value>{selectedKindLabel}</Select.Value>
                <Select.Icon />
              </Select.Trigger>
              <Select.Content>
                <Select.Option value="__all">
                  <SelectPrimitive.ItemText>All</SelectPrimitive.ItemText>
                </Select.Option>
                {kindOptions.map((kind) => (
                  <Select.Option key={kind.id} value={kind.id}>
                    <SelectPrimitive.ItemText>{formatKindLabel(kind.id)}</SelectPrimitive.ItemText>
                  </Select.Option>
                ))}
              </Select.Content>
            </Select.Root>
          ) : null}
          <ToggleGroup.Root
            aria-label="View mode"
            value={[viewMode]}
            onValueChange={(value) => {
              const nextViewMode = value[0];
              if (nextViewMode === "cards" || nextViewMode === "list") {
                onViewModeChange(nextViewMode);
              }
            }}
          >
            <ToggleGroup.Item value="cards" aria-label="Grid view">
              <IconSquareGridCircle />
            </ToggleGroup.Item>
            <ToggleGroup.Item value="list" aria-label="List view">
              <IconBarsThree />
            </ToggleGroup.Item>
          </ToggleGroup.Root>
        </div>
      </div>
    </header>
  );
}

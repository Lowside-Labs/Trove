import type { LibraryItemSummary } from "trove-contracts";
import { LibraryCard } from "./library-card";

interface LibraryGridProps {
  items: LibraryItemSummary[];
  selectedItemId: number | null;
  onSelect(itemId: number): void;
}

export function LibraryGrid({ items, onSelect, selectedItemId }: LibraryGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <LibraryCard
          key={item.id}
          item={item}
          selected={item.id === selectedItemId}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

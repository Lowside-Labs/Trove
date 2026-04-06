import type { LibraryItemSummary } from "trove-contracts";
import { LibraryCard } from "./library-card";

interface LibraryGridProps {
  items: LibraryItemSummary[];
  onOpenItem(url: string): void;
}

export function LibraryGrid({ items, onOpenItem }: LibraryGridProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <LibraryCard
          key={item.id}
          item={item}
          onOpen={() => onOpenItem(item.url)}
        />
      ))}
    </div>
  );
}

import type { LibraryItemSummary } from "trove-contracts";
import { LibraryCard } from "./library-card";

interface LibraryGridProps {
  items: LibraryItemSummary[];
  onOpenItem(url: string): void;
}

export function LibraryGrid({ items, onOpenItem }: LibraryGridProps) {
  return (
    <div
      className="grid gap-3"
      style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}
    >
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

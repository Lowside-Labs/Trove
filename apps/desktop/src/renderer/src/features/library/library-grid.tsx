import { memo, useCallback } from "react";
import type { LibraryItemSummary } from "trove-contracts";
import { LibraryCard } from "./library-card";

interface LibraryGridProps {
  items: LibraryItemSummary[];
  onOpenItem(url: string): void;
}

export const LibraryGrid = memo(function LibraryGrid({ items, onOpenItem }: LibraryGridProps) {
  return (
    <div
      className="grid gap-3"
      style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}
    >
      {items.map((item) => (
        <GridCard key={item.id} item={item} onOpenItem={onOpenItem} />
      ))}
    </div>
  );
});

const GridCard = memo(function GridCard({
  item,
  onOpenItem,
}: {
  item: LibraryItemSummary;
  onOpenItem(url: string): void;
}) {
  const onOpen = useCallback(() => onOpenItem(item.url), [onOpenItem, item.url]);
  return <LibraryCard item={item} onOpen={onOpen} />;
});

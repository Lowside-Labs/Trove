import type { LibraryItemSummary } from "trove-contracts";
import { formatDate } from "../../lib/format";

interface LibraryListProps {
  items: LibraryItemSummary[];
  onOpenItem(url: string): void;
}

export function LibraryList({ items, onOpenItem }: LibraryListProps) {
  return (
    <div className="divide-y divide-border">
      {items.map((item) => (
        <button
          key={item.id}
          className="flex w-full items-baseline gap-6 py-3 text-left transition-colors hover:bg-accent/50"
          type="button"
          onClick={() => onOpenItem(item.url)}
        >
          <span className="w-20 shrink-0 text-[11px] font-medium uppercase tracking-widest text-muted-foreground/60">
            {item.source}
          </span>
          <span className="min-w-0 flex-1 truncate text-[15px] text-foreground">
            {item.title}
          </span>
          <span className="shrink-0 text-[13px] text-muted-foreground">
            {formatDate(item.savedAt)}
          </span>
        </button>
      ))}
    </div>
  );
}

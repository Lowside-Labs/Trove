import type { LibraryItemSummary } from "trove-contracts";
import { formatDate } from "../../lib/format";
import { getSourceConfig, SourceIcon } from "./source-registry";

interface LibraryListProps {
  items: LibraryItemSummary[];
  onOpenItem(url: string): void;
}

export function LibraryList({ items, onOpenItem }: LibraryListProps) {
  return (
    <div className="divide-y divide-border">
      {items.map((item) => {
        const source = getSourceConfig(item.source);
        return (
          <button
            key={item.id}
            className="flex w-full items-center gap-4 py-3 text-left transition-colors hover:bg-accent/50"
            type="button"
            onClick={() => onOpenItem(item.url)}
          >
            <span className="flex w-20 shrink-0 items-center gap-1.5 text-muted-foreground/60">
              {source.isKnown ? (
                <SourceIcon config={source.icons} className="size-3.5" />
              ) : null}
              <span className="text-[11px] font-medium">{source.displayName}</span>
            </span>
            <span className="min-w-0 flex-1 truncate text-[15px] text-foreground">
              {item.title}
            </span>
            <span className="shrink-0 text-[13px] text-muted-foreground">
              {formatDate(item.savedAt)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

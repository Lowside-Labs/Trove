import type { LibraryItemSummary } from "trove-contracts";
import { cn } from "../../lib/cn";
import { formatDateTime } from "../../lib/format";
import { getSourceVisuals } from "./source-visuals";

interface LibraryListProps {
  items: LibraryItemSummary[];
  selectedItemId: number | null;
  onSelect(itemId: number): void;
}

export function LibraryList({ items, onSelect, selectedItemId }: LibraryListProps) {
  return (
    <div className="trove-panel overflow-hidden rounded-[2rem]">
      <div className="divide-y divide-black/6">
        {items.map((item) => {
          const visuals = getSourceVisuals(item.source);

          return (
            <button
              key={item.id}
              className={cn(
                "flex w-full items-start gap-4 px-5 py-4 text-left transition hover:bg-white/50",
                item.id === selectedItemId && "bg-black/5",
              )}
              type="button"
              onClick={() => onSelect(item.id)}
            >
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
                      visuals.badge,
                    )}
                  >
                    {item.source}
                  </span>
                  <span className="text-xs text-zinc-500">{formatDateTime(item.savedAt)}</span>
                </div>
                <h3 className="font-serif text-2xl leading-none tracking-[-0.04em] text-zinc-950">
                  {item.title}
                </h3>
                <p className="line-clamp-2 text-sm leading-7 text-zinc-700">
                  {item.excerpt || "Open the item to read the archived content in full."}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

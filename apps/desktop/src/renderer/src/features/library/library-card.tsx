import type { LibraryItemSummary } from "trove-contracts";
import { cn } from "../../lib/cn";
import { formatDate, formatDateTime } from "../../lib/format";
import { getSourceVisuals } from "./source-visuals";

interface LibraryCardProps {
  item: LibraryItemSummary;
  selected: boolean;
  onSelect(itemId: number): void;
}

export function LibraryCard({ item, onSelect, selected }: LibraryCardProps) {
  const visuals = getSourceVisuals(item.source);

  return (
    <button
      className={cn(
        "group trove-panel relative overflow-hidden rounded-[2rem] p-5 text-left transition duration-300",
        "hover:-translate-y-0.5 hover:shadow-[0_28px_80px_rgba(37,29,18,0.12)]",
        selected && "ring-2 ring-zinc-950/20",
      )}
      type="button"
      onClick={() => onSelect(item.id)}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-br opacity-90",
          visuals.glow,
        )}
      />
      <div className="relative flex h-full flex-col gap-5">
        <div className="flex items-start justify-between gap-4">
          <span className={cn("rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]", visuals.badge)}>
            {item.source}
          </span>
          <span className="text-xs text-zinc-500">{formatDate(item.savedAt)}</span>
        </div>

        <div className="space-y-3">
          <h3 className="font-serif text-3xl leading-[1] tracking-[-0.04em] text-zinc-950">
            {item.title}
          </h3>
          <p className="line-clamp-4 text-sm leading-7 text-zinc-700">
            {item.excerpt || "Open the item to read the archived content in full."}
          </p>
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-3 text-sm text-zinc-500">
          {item.author ? <span className={cn("font-medium", visuals.accent)}>{item.author}</span> : null}
          <span>{item.kind}</span>
          <span>{formatDateTime(item.importedAt)}</span>
        </div>
      </div>
    </button>
  );
}

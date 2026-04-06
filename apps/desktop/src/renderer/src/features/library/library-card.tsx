import type { LibraryItemSummary } from "trove-contracts";

interface LibraryCardProps {
  item: LibraryItemSummary;
  onOpen(): void;
}

export function LibraryCard({ item, onOpen }: LibraryCardProps) {
  return (
    <button
      className="flex flex-col gap-3 rounded-xl bg-card p-5 text-left transition-colors hover:bg-accent"
      type="button"
      onClick={onOpen}
    >
      <h3 className="text-[15px] font-semibold leading-snug text-card-foreground">
        {item.title}
      </h3>
      {item.excerpt ? (
        <p className="line-clamp-3 text-[13px] leading-relaxed text-muted-foreground">
          {item.excerpt}
        </p>
      ) : null}
      <span className="mt-auto pt-1 text-[11px] font-medium uppercase tracking-widest text-muted-foreground/60">
        {item.source}
      </span>
    </button>
  );
}

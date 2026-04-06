import type { LibraryItemSummary } from "trove-contracts";
import { getSourceConfig, SourceIcon } from "./source-registry";

interface LibraryCardProps {
  item: LibraryItemSummary;
  onOpen(): void;
}

export function LibraryCard({ item, onOpen }: LibraryCardProps) {
  const source = getSourceConfig(item.source);
  const Content = source.Content;
  const showFooter = item.source !== "x";

  return (
    <button
      className="flex flex-col gap-3 rounded-2xl bg-card p-5 text-left transition-colors hover:bg-accent"
      type="button"
      onClick={onOpen}
    >
      <Content item={item} />
      {showFooter ? (
        <div className="mt-auto flex items-center gap-1.5 pt-1 text-muted-foreground/60">
          {source.isKnown ? (
            <SourceIcon config={source.icons} className="size-3.5" />
          ) : null}
          <span className="text-[11px] font-medium">{source.displayName}</span>
        </div>
      ) : null}
    </button>
  );
}

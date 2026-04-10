import { memo, useCallback } from "react";
import type { LibraryItemSummary } from "trove-contracts";
import { formatDate } from "../../lib/format";
import { getSourceConfig, SourceIcon } from "./source-registry";
import { getListItemMeta } from "./list-item-meta";

interface LibraryListProps {
  items: LibraryItemSummary[];
  onOpenItem(url: string): void;
}

export const LibraryList = memo(function LibraryList({ items, onOpenItem }: LibraryListProps) {
  return (
    <div>
      {items.map((item) => {
        return (
          <ListRow key={item.id} item={item} onOpenItem={onOpenItem} />
        );
      })}
    </div>
  );
});

const ListRow = memo(function ListRow({
  item,
  onOpenItem,
}: {
  item: LibraryItemSummary;
  onOpenItem(url: string): void;
}) {
  const source = getSourceConfig(item.source);
  const meta = getListItemMeta(item);
  const initials = getInitials(meta.primary);
  const onOpen = useCallback(() => onOpenItem(item.url), [onOpenItem, item.url]);

  return (
    <button
      className="interactive-list-item flex w-full cursor-pointer items-start gap-2.5 py-2.5 text-left"
      style={{ contentVisibility: "auto", containIntrinsicSize: "auto 52px" }}
      type="button"
      onClick={onOpen}
    >
      <span className="flex size-5 shrink-0 items-center justify-center self-center text-muted-foreground/70 mr-2">
        {source.isKnown ? <SourceIcon config={source.icons} className="size-3.5" /> : null}
      </span>

      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">
        {meta.avatarUrl ? (
          <img src={meta.avatarUrl} alt="" className="size-full object-cover" />
        ) : (
          initials
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className="truncate text-[14px] font-medium leading-[1.2] text-foreground">
            {meta.primary}
          </span>
          {meta.secondary ? (
            <span className="truncate text-[13px] leading-[1.2] text-muted-foreground">
              {meta.secondary}
            </span>
          ) : null}
        </span>
        <span className="mt-0.5 block truncate text-[14px] leading-[1.4] text-muted-foreground">
          {meta.summary}
        </span>
      </span>

      <span className="shrink-0 self-center text-[13px] text-muted-foreground">
        {formatDate(item.savedAt)}
      </span>
    </button>
  );
});

function getInitials(value: string): string {
  const parts = value
    .replace(/^@/, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) return "•";
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

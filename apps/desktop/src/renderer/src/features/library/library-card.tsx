import { memo, useState } from "react";
import type { LibraryItemSummary } from "trove-contracts";
import { formatCardDate } from "../../lib/format";
import { getSourceConfig, SourceIcon } from "./source-registry";
import { getCardStats } from "./cards/card-footer";
import { CardStats } from "./cards/card-stats";

interface LibraryCardProps {
  item: LibraryItemSummary;
  onOpen(): void;
}

export const LibraryCard = memo(function LibraryCard({ item, onOpen }: LibraryCardProps) {
  const source = getSourceConfig(item.source);
  const Content = source.Content;
  const [mediaActive, setMediaActive] = useState(false);
  const date = formatCardDate(item.savedAt);
  const stats = getCardStats(item);

  return (
    <button
      className="flex cursor-pointer flex-col gap-3 rounded-2xl bg-card p-5 text-left hover:bg-accent"
      style={{ contentVisibility: "auto", containIntrinsicSize: "auto 350px" }}
      type="button"
      onClick={onOpen}
      onPointerEnter={() => setMediaActive(true)}
      onPointerLeave={() => setMediaActive(false)}
      onFocus={() => setMediaActive(true)}
      onBlur={() => setMediaActive(false)}
    >
      <Content item={item} mediaActive={mediaActive} />
      <div className="mt-auto flex items-center gap-2 pt-1 text-muted-foreground/60">
        {source.isKnown ? (
          <SourceIcon config={source.icons} className="size-3.5 shrink-0" />
        ) : null}
        {date ? (
          <span className="text-[12px] tabular-nums">{date}</span>
        ) : null}
        {stats.length > 0 ? (
          <div className="ml-auto">
            <CardStats items={stats} />
          </div>
        ) : null}
      </div>
    </button>
  );
});

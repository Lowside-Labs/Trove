import type { LibraryItemSummary } from "trove-contracts";
import { getSourceConfig, SourceIcon } from "../source-registry";
import { CardStats, type CardStatItem } from "./card-stats";

interface CardFooterProps {
  item: LibraryItemSummary;
}

function getCardStats(item: LibraryItemSummary): CardStatItem[] {
  const raw = (item.raw ?? {}) as Record<string, unknown>;

  switch (item.source) {
    case "x":
      return [
        { kind: "likes", value: raw.favoriteCount as number | undefined },
        { kind: "reposts", value: raw.retweetCount as number | undefined },
      ];
    case "instagram":
      return [
        { kind: "plays", value: raw.playCount as number | undefined },
        { kind: "likes", value: raw.likeCount as number | undefined },
        { kind: "comments", value: raw.commentCount as number | undefined },
      ];
    default:
      return [];
  }
}

export function CardFooter({ item }: CardFooterProps) {
  const source = getSourceConfig(item.source);
  const stats = getCardStats(item);

  return (
    <div className="mt-auto flex items-center pt-1 text-muted-foreground/60">
      {source.isKnown ? (
        <SourceIcon config={source.icons} className="size-3.5 shrink-0" />
      ) : null}
      {stats.length > 0 ? (
        <div className="ml-auto">
          <CardStats items={stats} />
        </div>
      ) : null}
    </div>
  );
}

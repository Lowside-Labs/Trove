import IconBubble2 from "central-icons/IconBubble2";
import IconHeart from "central-icons/IconHeart";
import IconPlay from "central-icons/IconPlay";
import IconRepeat from "central-icons/IconRepeat";
import { formatCount } from "../../../lib/format";

interface CardStatItem {
  kind: "plays" | "likes" | "comments" | "reposts";
  value: number | null | undefined;
}

interface CardStatsProps {
  items: CardStatItem[];
}

const statMeta = {
  plays: {
    Icon: IconPlay,
    label: "Plays",
  },
  likes: {
    Icon: IconHeart,
    label: "Likes",
  },
  comments: {
    Icon: IconBubble2,
    label: "Comments",
  },
  reposts: {
    Icon: IconRepeat,
    label: "Reposts",
  },
} as const;

export function CardStats({ items }: CardStatsProps) {
  const visibleItems = items.filter((item) => typeof item.value === "number" && item.value > 0);

  if (visibleItems.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-[12px] text-muted-foreground/70">
      {visibleItems.map((item) => {
        const meta = statMeta[item.kind];
        const Icon = meta.Icon;

        return (
          <span
            key={item.kind}
            className="inline-flex items-center gap-1.5"
            aria-label={`${item.value} ${meta.label.toLowerCase()}`}
            title={`${item.value} ${meta.label}`}
          >
            <Icon className="size-3.5 shrink-0" />
            <span className="font-medium tabular-nums">{formatCount(item.value!)}</span>
          </span>
        );
      })}
    </div>
  );
}

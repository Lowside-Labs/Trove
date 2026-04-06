import type { LibraryItemSummary } from "trove-contracts";
import { formatCount } from "../../../lib/format";

interface TweetRaw {
  screenName?: string;
  profileImageUrl?: string;
  favoriteCount?: number;
  retweetCount?: number;
}

interface TweetContentProps {
  item: LibraryItemSummary;
}

export function TweetContent({ item }: TweetContentProps) {
  const raw = (item.raw ?? {}) as TweetRaw;
  const handle = raw.screenName ?? item.author;
  const displayName = item.author;
  const avatarUrl = raw.profileImageUrl?.replace("_normal.", "_bigger.");
  const body = item.excerpt || item.title;
  const likes = raw.favoriteCount;
  const retweets = raw.retweetCount;
  const hasStats = (likes != null && likes > 0) || (retweets != null && retweets > 0);

  return (
    <>
      {/* Author row: avatar + name + handle */}
      {handle || displayName ? (
        <div className="flex items-center gap-2.5">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              className="size-8 shrink-0 rounded-full bg-muted"
            />
          ) : (
            <div className="size-8 shrink-0 rounded-full bg-muted" />
          )}
          <div className="min-w-0">
            {displayName ? (
              <p className="truncate text-[13px] font-semibold leading-tight text-card-foreground">
                {displayName}
              </p>
            ) : null}
            {handle ? (
              <p className="truncate text-[12px] leading-tight text-muted-foreground">
                @{handle}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Tweet body */}
      <p className="flex-1 line-clamp-4 text-[15px] leading-relaxed text-card-foreground">
        {body}
      </p>

      {/* Engagement stats */}
      {hasStats ? (
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground/60">
          {likes != null && likes > 0 ? (
            <span>{formatCount(likes)} likes</span>
          ) : null}
          {retweets != null && retweets > 0 ? (
            <span>{formatCount(retweets)} reposts</span>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

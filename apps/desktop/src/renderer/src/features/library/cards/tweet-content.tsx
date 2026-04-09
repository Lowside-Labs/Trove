import type { LibraryItemSummary } from "trove-contracts";
import { cn } from "../../../lib/cn";
import { CardParts } from "./card-parts";
import { InlineMediaPreview } from "./inline-media-preview";
import { getTweetMedia } from "./tweet-media";

interface TweetRaw {
  screenName?: string;
  profileImageUrl?: string;
}

interface TweetContentProps {
  item: LibraryItemSummary;
  mediaActive?: boolean;
}

export function TweetContent({ item, mediaActive = false }: TweetContentProps) {
  const raw = (item.raw ?? {}) as TweetRaw;
  const handle = raw.screenName ?? item.author;
  const displayName = item.author;
  const avatarUrl = raw.profileImageUrl?.replace("_normal.", "_bigger.");
  const body = item.excerpt || item.title;
  const media = getTweetMedia(item);
  const mediaCount = media.length;
  const hasMedia = mediaCount > 0;

  return (
    <>
      <CardParts.Author name={displayName} handle={handle}>
        <CardParts.Avatar src={avatarUrl} />
      </CardParts.Author>

      <CardParts.Body className="flex-1">{body}</CardParts.Body>

      {hasMedia ? (
        <div
          className={cn(
            "grid gap-1 overflow-hidden rounded-lg bg-transparent",
            mediaCount === 1
              ? "grid-cols-1"
              : mediaCount === 2
                ? "grid-cols-2"
                : "grid-cols-2",
          )}
        >
          {media.slice(0, 4).map((entry, index) => (
            <div
              key={`${entry.url}-${index}`}
              className={cn(
                "relative overflow-hidden bg-transparent",
                mediaCount === 1
                  ? "aspect-[16/10] rounded-lg"
                  : mediaCount === 3 && index === 0
                    ? "row-span-2 aspect-[4/5]"
                    : "aspect-square",
                getTweetMediaTileRadiusClass(mediaCount, index),
              )}
            >
              <InlineMediaPreview
                active={mediaActive}
                className="h-full w-full bg-muted"
                mediaClassName="size-full"
                showVideoBadge={entry.type !== "photo"}
                imageUrl={entry.url}
                {...(entry.videoUrl ? { videoUrl: entry.videoUrl } : {})}
              />
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
}

function getTweetMediaTileRadiusClass(mediaCount: number, index: number) {
  if (mediaCount <= 1) {
    return "";
  }

  if (mediaCount === 2) {
    return index === 0 ? "rounded-l-lg" : "rounded-r-lg";
  }

  if (mediaCount === 3) {
    if (index === 0) {
      return "rounded-l-lg";
    }

    return index === 1 ? "rounded-tr-lg" : "rounded-br-lg";
  }

  return index === 0
    ? "rounded-tl-lg"
    : index === 1
      ? "rounded-tr-lg"
      : index === 2
        ? "rounded-bl-lg"
        : "rounded-br-lg";
}

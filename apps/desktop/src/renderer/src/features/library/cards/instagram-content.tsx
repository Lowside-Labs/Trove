import type { LibraryItemSummary } from "trove-contracts";
import { CardParts } from "./card-parts";
import { InlineMediaPreview } from "./inline-media-preview";

interface InstagramRaw {
  username?: string;
  fullName?: string;
  profilePicUrl?: string | null;
  imageUrl?: string | null;
  videoUrl?: string | null;
}

interface InstagramContentProps {
  item: LibraryItemSummary;
  mediaActive?: boolean;
}

export function InstagramContent({ item, mediaActive = false }: InstagramContentProps) {
  const raw = (item.raw ?? {}) as InstagramRaw;
  const username = raw.username;
  const displayName = raw.fullName ?? item.author ?? (username ? `@${username}` : "Instagram");
  const handle = username ? username : undefined;
  const profilePicUrl = raw.profilePicUrl ?? undefined;
  const imageUrl = raw.imageUrl ?? undefined;
  const videoUrl = raw.videoUrl ?? undefined;
  const mediaUrl = videoUrl ?? imageUrl;
  const body = item.excerpt ?? item.title;

  return (
    <>
      <CardParts.Author name={displayName} handle={handle}>
        <CardParts.Avatar
          src={profilePicUrl}
          fallback={displayName}
          className="size-9"
        />
      </CardParts.Author>

      <CardParts.Body>{body}</CardParts.Body>

      {mediaUrl ? (
        <InlineMediaPreview
          active={mediaActive}
          className="rounded-lg bg-muted/60"
          mediaClassName="aspect-[4/5]"
          {...(imageUrl ? { imageUrl } : {})}
          {...(videoUrl ? { videoUrl } : {})}
        />
      ) : null}
    </>
  );
}

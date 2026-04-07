import { useState } from "react";
import type { LibraryItemSummary } from "trove-contracts";
import { CardStats } from "./card-stats";
import { InlineMediaPreview } from "./inline-media-preview";

interface InstagramRaw {
  username?: string;
  fullName?: string;
  profilePicUrl?: string | null;
  imageUrl?: string | null;
  videoUrl?: string | null;
  likeCount?: number | null;
  commentCount?: number | null;
  playCount?: number | null;
}

interface InstagramContentProps {
  item: LibraryItemSummary;
  mediaActive?: boolean;
}

export function InstagramContent({ item, mediaActive = false }: InstagramContentProps) {
  const raw = (item.raw ?? {}) as InstagramRaw;
  const username = raw.username;
  const displayName = raw.fullName ?? item.author ?? (username ? `@${username}` : "Instagram");
  const handle = username ? `@${username}` : undefined;
  const profilePicUrl = raw.profilePicUrl ?? undefined;
  const imageUrl = raw.imageUrl ?? undefined;
  const videoUrl = raw.videoUrl ?? undefined;
  const mediaUrl = videoUrl ?? imageUrl;
  const body = item.excerpt ?? item.title;

  return (
    <>
      <div className="flex items-center gap-2.5">
        <InstagramAvatar
          displayName={displayName}
          {...(profilePicUrl ? { profilePicUrl } : {})}
        />
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold leading-tight text-card-foreground">
            {displayName}
          </p>
          {handle ? (
            <p className="truncate text-[12px] leading-tight text-muted-foreground">{handle}</p>
          ) : null}
        </div>
      </div>

      <div className="flex-1">
        <p className="line-clamp-4 text-[15px] leading-relaxed text-card-foreground">{body}</p>
      </div>

      {mediaUrl ? (
        <InlineMediaPreview
          active={mediaActive}
          className="rounded-lg bg-muted/60"
          mediaClassName="aspect-[4/5]"
          {...(imageUrl ? { imageUrl } : {})}
          {...(videoUrl ? { videoUrl } : {})}
        />
      ) : null}

      <CardStats
        items={[
          { kind: "plays", value: raw.playCount },
          { kind: "likes", value: raw.likeCount },
          { kind: "comments", value: raw.commentCount },
        ]}
      />
    </>
  );
}

function InstagramAvatar({
  displayName,
  profilePicUrl,
}: {
  displayName: string;
  profilePicUrl?: string;
}) {
  const [hasError, setHasError] = useState(false);

  if (profilePicUrl && !hasError) {
    return (
      <img
        src={profilePicUrl}
        alt=""
        className="size-9 shrink-0 rounded-full bg-muted object-cover"
        onError={() => setHasError(true)}
      />
    );
  }

  return (
    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">
      {getInitials(displayName)}
    </div>
  );
}

function getInitials(value: string): string {
  const parts = value
    .replace(/^@/, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) return "IG";
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

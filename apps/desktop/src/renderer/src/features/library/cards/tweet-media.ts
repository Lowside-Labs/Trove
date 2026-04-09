import type { LibraryItemSummary } from "trove-contracts";

interface TweetMediaEntry {
  type?: string;
  mediaUrl?: string;
  expandedUrl?: string;
  videoUrl?: string;
}

export interface TweetMediaItem {
  type: "photo" | "video" | "animated_gif" | "unknown";
  url: string;
  videoUrl?: string;
}

export function getTweetMedia(item: LibraryItemSummary): TweetMediaItem[] {
  const raw = item.raw ?? {};
  const media = Array.isArray(raw.media) ? raw.media : [];

  return media
    .map((entry) => normalizeMediaEntry(entry))
    .filter((entry): entry is TweetMediaItem => entry !== null);
}

function normalizeMediaEntry(value: unknown): TweetMediaItem | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const entry = value as TweetMediaEntry;
  const url = readString(entry.mediaUrl);

  if (!url) {
    return null;
  }

  const videoUrl = readString(entry.videoUrl);

  return {
    type: normalizeMediaType(entry.type),
    url: getTweetMediaPreviewUrl(url),
    ...(videoUrl ? { videoUrl } : {}),
  };
}

function getTweetMediaPreviewUrl(url: string): string {
  if (!url.includes("pbs.twimg.com/")) {
    return url;
  }

  try {
    const parsed = new URL(url);

    if (parsed.searchParams.has("name")) {
      return url;
    }

    const extension = readTwitterImageExtension(parsed.pathname);

    if (!extension) {
      return url;
    }

    parsed.searchParams.set("format", extension);
    parsed.searchParams.set("name", "small");
    return parsed.toString();
  } catch {
    return url;
  }
}

function readTwitterImageExtension(pathname: string): string | null {
  const match = pathname.match(/\.([a-zA-Z0-9]+)$/);
  return match?.[1]?.toLowerCase() ?? null;
}

function normalizeMediaType(value: unknown): TweetMediaItem["type"] {
  return value === "photo" || value === "video" || value === "animated_gif" ? value : "unknown";
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

import type { LibraryItemSummary } from "trove-contracts";

interface ListItemMeta {
  avatarUrl?: string;
  primary: string;
  secondary?: string;
  summary: string;
}

export function getListItemMeta(item: LibraryItemSummary): ListItemMeta {
  const raw = item.raw ?? {};

  if (item.source === "x") {
    const screenName = readString(raw.screenName);
    const avatarUrl = readString(raw.profileImageUrl)?.replace("_normal.", "_bigger.");
    const primary = item.author ?? (screenName ? `@${screenName}` : item.title);
    const secondary = screenName ? `@${screenName}` : undefined;

    return {
      ...(avatarUrl ? { avatarUrl } : {}),
      primary,
      ...(secondary && secondary !== primary ? { secondary } : {}),
      summary: item.excerpt ?? item.title,
    };
  }

  if (item.source === "substack") {
    const publicationName = readString(raw.publicationName);
    const primary = item.author ?? publicationName ?? "Substack";
    const secondary = publicationName && publicationName !== primary ? publicationName : undefined;

    return {
      primary,
      ...(secondary ? { secondary } : {}),
      summary: item.title,
    };
  }

  if (item.source === "instagram") {
    const username = readString(raw.username);
    const fullName = readString(raw.fullName) ?? item.author;
    const primary = fullName ?? (username ? `@${username}` : "Instagram");
    const secondary = username ? `@${username}` : undefined;

    return {
      primary,
      ...(secondary && secondary !== primary ? { secondary } : {}),
      summary: item.excerpt ?? item.title,
    };
  }

  return {
    primary: item.author ?? item.title,
    ...(item.author && item.author !== item.title ? { secondary: item.title } : {}),
    summary: item.excerpt ?? item.title,
  };
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

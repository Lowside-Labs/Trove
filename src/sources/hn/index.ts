import { parse } from "node-html-parser";
import { createJsonlSink, createTimestampedFileName } from "../../core/raw.js";
import type { ProgressHandler } from "../../core/progress.js";
import type { TroveItem } from "../../types/item.js";

const HN_BASE_URL = "https://news.ycombinator.com";

export type HnSyncKind = "favorites" | "favorite-comments";

interface HnSyncOptions {
  user?: string;
  kind?: string;
  limit?: number;
  cursor?: string;
  onProgress?: ProgressHandler;
}

export interface HnSyncResult {
  items: TroveItem[];
  rawPath: string;
  nextCursor?: string;
}

interface ParsedFavoritesPage {
  items: TroveItem[];
  nextPage?: number;
}

interface ParsedFavoriteCommentsPage {
  items: TroveItem[];
  nextPage?: number;
}

export async function syncHnFavorites(options: HnSyncOptions): Promise<HnSyncResult> {
  const user = options.user?.trim();
  const kind = normalizeKind(options.kind);

  if (!user) {
    throw new Error("HN sync requires --user <username>.");
  }

  const scope = `${user}-${kind}`;
  const rawSink = createJsonlSink("hn", createTimestampedFileName(scope));
  const items: TroveItem[] = [];
  const markerId = options.cursor;
  let nextPage = 1;
  let nextCursor: string | undefined;
  let shouldStop = false;

  while (!shouldStop) {
    const requestedPage = nextPage;
    emitProgress(options.onProgress, "page", `Fetching ${kind} page ${nextPage}`);
    const html = await fetchPageHtml(buildPageUrl(user, kind, nextPage));
    const page = kind === "favorites" ? parseFavoritesPage(html) : parseFavoriteCommentsPage(html);

    if (nextPage === 1) {
      nextCursor = page.items[0]?.externalId ?? markerId;
    }

    for (const item of page.items) {
      rawSink.append(item.raw ?? {});

      if (markerId && item.externalId === markerId) {
        shouldStop = true;
        break;
      }

      items.push(item);

      if (typeof options.limit === "number" && items.length >= options.limit) {
        shouldStop = true;
        break;
      }
    }

    emitProgress(options.onProgress, "page", `Fetched ${kind} page ${nextPage}`, items.length);

    if (shouldStop || !page.nextPage || page.items.length === 0) {
      break;
    }

    if (page.nextPage <= requestedPage) {
      break;
    }

    nextPage = page.nextPage;
  }

  return nextCursor ? { items, rawPath: rawSink.path, nextCursor } : { items, rawPath: rawSink.path };
}

function normalizeKind(kind?: string): HnSyncKind {
  if (kind === undefined || kind === "favorites") {
    return "favorites";
  }

  if (kind === "favorite-comments") {
    return kind;
  }

  throw new Error('HN sync kind must be "favorites" or "favorite-comments".');
}

async function fetchPageHtml(url: string): Promise<string> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`HN request failed with ${response.status} for ${url}`);
  }

  return response.text();
}

function buildPageUrl(user: string, kind: HnSyncKind, page: number): string {
  const url = new URL(`${HN_BASE_URL}/favorites`);
  url.searchParams.set("id", user);

  if (kind === "favorite-comments") {
    url.searchParams.set("comments", "t");
  }

  if (page > 1) {
    url.searchParams.set("p", String(page));
  }

  return url.toString();
}

function parseFavoritesPage(html: string): ParsedFavoritesPage {
  const root = parse(html);
  const items = root
    .querySelectorAll("tr.athing.submission")
    .map((row) => parseFavoriteStoryRow(row))
    .filter((item): item is TroveItem => item !== null);
  const nextPage = readNextPage(root);

  return nextPage ? { items, nextPage } : { items };
}

function parseFavoriteStoryRow(row: ReturnType<typeof parse>): TroveItem | null {
  const id = row.getAttribute("id");
  const titleLink = row.querySelector(".titleline a");
  const subtextRow = row.nextElementSibling;

  if (!id || !titleLink || !subtextRow) {
    return null;
  }

  const subtext = subtextRow.querySelector(".subtext");
  const ageNode = subtext?.querySelector(".age") ?? null;
  const savedAt = readSavedAt(ageNode);

  if (!savedAt) {
    return null;
  }

  const author = subtext?.querySelector(".hnuser")?.text.trim() ?? undefined;
  const title = cleanText(titleLink.text);
  const href = titleLink.getAttribute("href") ?? "";
  const url = toAbsoluteUrl(href);
  const commentCount = cleanText(subtext?.lastChild?.text ?? "");

  return {
    source: "hn",
    kind: "favorite",
    externalId: id,
    title,
    url,
    savedAt,
    tags: ["hn", "favorite"],
    ...(author ? { author } : {}),
    raw: {
      platform: "hn",
      kind: "favorite",
      itemId: id,
      itemType: "story",
      itemUrl: url,
      originalHref: href,
      user: author,
      commentCount,
      savedAtSource: "item-time",
    },
  };
}

function parseFavoriteCommentsPage(html: string): ParsedFavoriteCommentsPage {
  const root = parse(html);
  const items = root
    .querySelectorAll("tr.athing")
    .map((row) => parseFavoriteCommentRow(row))
    .filter((item): item is TroveItem => item !== null);
  const nextPage = readNextPage(root);

  return nextPage ? { items, nextPage } : { items };
}

function parseFavoriteCommentRow(row: ReturnType<typeof parse>): TroveItem | null {
  const id = row.getAttribute("id");
  const commentText = row.querySelector(".commtext");
  const comhead = row.querySelector(".comhead");
  const storyLink = row.querySelector(".onstory a");
  const ageNode = row.querySelector(".age");
  const contextLink = row.querySelector("a[rel='nofollow']");
  const author = row.querySelector(".hnuser")?.text.trim() ?? undefined;
  const savedAt = readSavedAt(ageNode);

  if (!id || !commentText || !comhead || !storyLink || !savedAt) {
    return null;
  }

  const storyTitle = cleanText(storyLink.text);
  const storyUrl = toAbsoluteUrl(storyLink.getAttribute("href") ?? "");
  const url = contextLink ? toAbsoluteUrl(contextLink.getAttribute("href") ?? "") : `${storyUrl}#${id}`;
  const content = htmlToText(commentText.innerHTML);
  const excerpt = content.slice(0, 280);

  return {
    source: "hn",
    kind: "favorite-comment",
    externalId: id,
    title: `Comment on ${storyTitle}`,
    url,
    excerpt,
    content,
    savedAt,
    tags: ["hn", "favorite", "comment"],
    ...(author ? { author } : {}),
    raw: {
      platform: "hn",
      kind: "favorite-comment",
      itemId: id,
      itemType: "comment",
      storyTitle,
      storyUrl,
      commentUrl: url,
      savedAtSource: "item-time",
    },
  };
}

function readNextPage(root: ReturnType<typeof parse>): number | undefined {
  const href = root.querySelector(".morelink")?.getAttribute("href");

  if (!href) {
    return undefined;
  }

  const url = new URL(href, HN_BASE_URL);
  const value = url.searchParams.get("p");

  if (!value) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function readSavedAt(ageNode: { getAttribute(name: string): string | undefined } | null): string | null {
  const title = ageNode?.getAttribute("title");

  if (!title) {
    return null;
  }

  const [, epochValue] = title.split(" ");

  if (epochValue) {
    const epoch = Number.parseInt(epochValue, 10);

    if (Number.isFinite(epoch)) {
      return new Date(epoch * 1000).toISOString();
    }
  }

  const iso = title.split(" ")[0];
  if (!iso) {
    return null;
  }

  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function emitProgress(
  onProgress: ProgressHandler | undefined,
  phase: string,
  message: string,
  completed?: number,
): void {
  onProgress?.(
    completed !== undefined
      ? {
          phase,
          message,
          completed,
        }
      : {
          phase,
          message,
        },
  );
}

function toAbsoluteUrl(href: string): string {
  return new URL(href, HN_BASE_URL).toString();
}

function cleanText(value: string): string {
  return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function htmlToText(html: string): string {
  const withBreaks = html
    .replace(/<p>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/div>/gi, "\n");
  const root = parse(`<div>${withBreaks}</div>`);

  return root.text
    .replace(/\u00a0/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

export const __internal = {
  parseFavoritesPage,
  parseFavoriteCommentsPage,
  htmlToText,
};

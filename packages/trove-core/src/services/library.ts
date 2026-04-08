import type {
  ContentFormat,
  GetLibraryItemInput,
  LibraryItemDetail,
  LibraryItemSummary,
  ListLibraryItemsInput,
  ListLibraryItemsResult,
  SearchResult,
} from "trove-contracts";
import {
  getItemById,
  listItemsPage,
  searchItemsPage,
  withDatabase,
  type StoredItem,
} from "../db/database.js";

export function listLibraryItems(
  options: ListLibraryItemsInput = {},
  root?: string,
): ListLibraryItemsResult {
  const limit = options.limit ?? 100;

  return withDatabase((db) => {
    if (options.query) {
      const offset = decodeSearchCursor(options.cursor);
      const page = searchItemsPage(db, options.query, {
        limit: limit + 1,
        offset,
        ...(options.source ? { source: options.source } : {}),
        ...(options.kind ? { kind: options.kind } : {}),
      });
      const hasMore = page.length > limit;
      const items = page.slice(0, limit).map(mapSearchResultToSummary);

      return {
        items,
        hasMore,
        ...(hasMore
          ? { nextCursor: encodeSearchCursor(offset + items.length) }
          : {}),
      };
    }

    const pageSize = limit + 1;
    const page = listItemsPage(db, {
      limit: pageSize,
      ...(options.source ? { source: options.source } : {}),
      ...(options.kind ? { kind: options.kind } : {}),
      ...(options.cursor ? { cursor: decodeBrowseCursor(options.cursor) } : {}),
    });
    const hasMore = page.length > limit;
    const items = page.slice(0, limit).map(mapStoredItemToSummary);
    const lastItem = items.at(-1);

    return {
      items,
      hasMore,
      ...(hasMore && lastItem ? { nextCursor: encodeBrowseCursor(lastItem) } : {}),
    };
  }, root);
}

export function getLibraryItem(
  input: GetLibraryItemInput,
  options?: { root?: string },
): LibraryItemDetail | null {
  return withDatabase((db) => {
    const item = getItemById(db, input.id);
    return item ? mapStoredItemToDetail(item) : null;
  }, options?.root);
}

function mapStoredItemToSummary(item: StoredItem): LibraryItemSummary {
  return {
    id: item.id,
    source: item.source,
    kind: item.kind,
    externalId: item.externalId,
    title: item.title,
    url: item.url,
    excerpt: item.excerpt,
    author: item.author,
    savedAt: item.savedAt,
    importedAt: item.importedAt ?? item.savedAt,
    tags: item.tags ?? [],
    hasContent: Boolean(item.content && item.content.trim().length > 0),
    ...(item.raw ? { raw: item.raw } : {}),
  };
}

function mapSearchResultToSummary(item: SearchResult): LibraryItemSummary {
  return {
    id: item.id,
    source: item.source,
    kind: item.kind,
    externalId: item.externalId,
    title: item.title,
    url: item.url,
    excerpt: item.excerpt,
    author: item.author,
    savedAt: item.savedAt,
    importedAt: item.importedAt ?? item.savedAt,
    tags: item.tags ?? [],
    hasContent: Boolean(item.content && item.content.trim().length > 0),
    ...(item.raw ? { raw: item.raw } : {}),
  };
}

function mapStoredItemToDetail(item: StoredItem): LibraryItemDetail {
  const summary = mapStoredItemToSummary(item);
  const content = item.content && item.content.trim().length > 0 ? item.content : undefined;
  const contentFormat = content ? detectContentFormat(item) : undefined;

  return {
    ...summary,
    ...(content ? { content } : {}),
    ...(contentFormat ? { contentFormat } : {}),
  };
}

function detectContentFormat(item: StoredItem): ContentFormat {
  return item.source === "chatgpt" || item.source === "claude" || hasMarkdownArtifact(item)
    ? "markdown"
    : "plain";
}

function hasMarkdownArtifact(item: StoredItem): boolean {
  return typeof item.raw?.markdownPath === "string" && item.raw.markdownPath.length > 0;
}

function encodeBrowseCursor(item: Pick<LibraryItemSummary, "id" | "savedAt">): string {
  return JSON.stringify({ savedAt: item.savedAt, id: item.id });
}

function decodeBrowseCursor(cursor: string): { savedAt: string; id: number } {
  const parsed = JSON.parse(cursor) as { savedAt?: unknown; id?: unknown };
  if (typeof parsed.savedAt !== "string" || typeof parsed.id !== "number") {
    throw new Error("Invalid library cursor.");
  }

  return {
    savedAt: parsed.savedAt,
    id: parsed.id,
  };
}

function encodeSearchCursor(offset: number): string {
  return JSON.stringify({ offset });
}

function decodeSearchCursor(cursor?: string): number {
  if (!cursor) {
    return 0;
  }

  const parsed = JSON.parse(cursor) as { offset?: unknown };
  if (typeof parsed.offset !== "number" || parsed.offset < 0) {
    throw new Error("Invalid library cursor.");
  }

  return parsed.offset;
}

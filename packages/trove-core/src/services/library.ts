import type {
  ContentFormat,
  GetLibraryItemInput,
  LibraryItemDetail,
  LibraryItemSummary,
  ListLibraryItemsInput,
} from "trove-contracts";
import {
  getItemById,
  listItems,
  searchItems,
  withDatabase,
  type StoredItem,
} from "../db/database.js";

export function listLibraryItems(
  options: ListLibraryItemsInput = {},
  root?: string,
): LibraryItemSummary[] {
  const limit = options.limit ?? 50;

  return withDatabase((db) => {
    if (options.query) {
      return searchItems(db, options.query, limit)
        .filter((item) => (options.source ? item.source === options.source : true))
        .map((item) => ({
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
        }));
    }

    return listItems(db, {
      limit,
      ...(options.source ? { source: options.source } : {}),
    }).map(mapStoredItemToSummary);
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

import path from "node:path";
import { getChromiumSession } from "../auth/chromium.js";
import { createJsonlSink, createTimestampedFileName } from "../core/raw.js";
import type { ProgressHandler } from "../core/progress.js";
import type { SupportedBrowserId } from "../types/browser.js";
import type { TroveItem } from "../types/item.js";

const SUBSTACK_BASE_URL = "https://substack.com";
const MAX_STALLED_PAGES = 3;

interface SubstackSyncOptions {
  browserId: SupportedBrowserId;
  profile?: string;
  kind?: string;
  limit?: number;
  cursor?: string;
  onProgress?: ProgressHandler;
}

export interface SubstackSyncResult {
  items: TroveItem[];
  rawPath: string;
  nextCursor?: string;
}

interface SubstackSavedPost {
  post_id: number;
  created_at?: string;
}

interface SubstackInboxItem {
  post_id?: number;
  publication_id?: number;
  saved_at?: string;
  inbox_date?: string;
}

interface SubstackPublication {
  id: number;
  name?: string;
  author_name?: string;
  subdomain?: string;
  custom_domain?: string | null;
}

interface SubstackPost {
  id: number;
  publication_id?: number;
  title?: string;
  canonical_url?: string;
  slug?: string;
  subtitle?: string | null;
  description?: string | null;
  truncated_body_text?: string | null;
  post_date?: string;
  publishedBylines?: Array<{ name?: string | null }>;
  [key: string]: unknown;
}

interface SavedPostsResponse {
  posts?: SubstackPost[];
  publications?: SubstackPublication[];
  savedPosts?: SubstackSavedPost[];
  inboxItems?: SubstackInboxItem[];
  more?: boolean;
}

interface ParsedSavedPage {
  items: TroveItem[];
  rawItems: Record<string, unknown>[];
  hasMore: boolean;
}

export async function syncSubstackSaved(options: SubstackSyncOptions): Promise<SubstackSyncResult> {
  const kind = normalizeKind(options.kind);
  const session = await getChromiumSession(
    options.browserId,
    options.profile,
    ["https://substack.com/", "https://www.substack.com/"],
    "Substack",
  );
  const scope = `${options.browserId}-${(options.profile ?? "Default").replaceAll(path.sep, "-")}-${kind}`;
  const rawSink = createJsonlSink("substack", createTimestampedFileName(scope));

  if (kind === "likes") {
    return syncSubstackLikes(session.cookieHeader, rawSink, options);
  }

  const items: TroveItem[] = [];
  const seenIds = new Set<string>();
  const markerId = options.cursor;
  let offset = 0;
  let nextCursor: string | undefined;
  let pageNumber = 1;
  let stalledPages = 0;

  while (true) {
    emitProgress(options.onProgress, "page", `Fetching saved page ${pageNumber}`);
    const payload = await fetchSavedPostsPage(session.cookieHeader, offset, options.limit);
    const page = parseSavedPostsPayload(payload);
    let importedCount = 0;

    if (offset === 0) {
      nextCursor = page.items[0]?.externalId ?? markerId;
    }

    for (let index = 0; index < page.items.length; index += 1) {
      const item = page.items[index];
      const rawItem = page.rawItems[index];

      if (!item) {
        continue;
      }

      if (rawItem) {
        rawSink.append(rawItem);
      }

      if (markerId && item.externalId === markerId) {
        return nextCursor
          ? { items, rawPath: rawSink.path, nextCursor }
          : { items, rawPath: rawSink.path };
      }

      if (seenIds.has(item.externalId)) {
        continue;
      }

      items.push(item);
      seenIds.add(item.externalId);
      importedCount += 1;

      if (typeof options.limit === "number" && items.length >= options.limit) {
        return nextCursor
          ? { items, rawPath: rawSink.path, nextCursor }
          : { items, rawPath: rawSink.path };
      }
    }

    emitProgress(options.onProgress, "page", `Fetched saved page ${pageNumber}`, items.length);

    if (!page.hasMore || page.items.length === 0) {
      break;
    }

    stalledPages = importedCount === 0 ? stalledPages + 1 : 0;

    if (stalledPages >= MAX_STALLED_PAGES) {
      break;
    }

    offset += page.items.length;
    pageNumber += 1;
  }

  return nextCursor
    ? { items, rawPath: rawSink.path, nextCursor }
    : { items, rawPath: rawSink.path };
}

export async function validateSubstackSession(cookieHeader: string): Promise<void> {
  await fetchSavedPostsPage(cookieHeader, 0, 1);
}

async function syncSubstackLikes(
  cookieHeader: string,
  rawSink: { path: string; append(entry: Record<string, unknown>): void },
  options: SubstackSyncOptions,
): Promise<SubstackSyncResult> {
  const selfProfile = await fetchSelfProfile(cookieHeader);
  const likesPageUrl = `https://substack.com/@${selfProfile.handle}/likes`;
  const items: TroveItem[] = [];
  const seenIds = new Set<string>();
  const markerId = options.cursor;
  let cursor: string | undefined;
  let nextCursor: string | undefined;
  let pageNumber = 1;
  let stalledPages = 0;

  while (true) {
    const requestedCursor = cursor;
    emitProgress(options.onProgress, "page", `Fetching likes page ${pageNumber}`);
    const payload = await fetchLikesPage(cookieHeader, selfProfile.id, cursor);
    const page = parseLikesPayload(payload, likesPageUrl);
    let importedCount = 0;

    if (!cursor) {
      nextCursor = page.items[0]?.externalId ?? markerId;
    }

    for (let index = 0; index < page.items.length; index += 1) {
      const item = page.items[index];
      const rawItem = page.rawItems[index];

      if (!item) {
        continue;
      }

      if (rawItem) {
        rawSink.append(rawItem);
      }

      if (markerId && item.externalId === markerId) {
        return nextCursor
          ? { items, rawPath: rawSink.path, nextCursor }
          : { items, rawPath: rawSink.path };
      }

      if (seenIds.has(item.externalId)) {
        continue;
      }

      items.push(item);
      seenIds.add(item.externalId);
      importedCount += 1;

      if (typeof options.limit === "number" && items.length >= options.limit) {
        return nextCursor
          ? { items, rawPath: rawSink.path, nextCursor }
          : { items, rawPath: rawSink.path };
      }
    }

    emitProgress(options.onProgress, "page", `Fetched likes page ${pageNumber}`, items.length);

    if (!page.nextCursor || page.items.length === 0) {
      break;
    }

    if (page.nextCursor === requestedCursor) {
      break;
    }

    stalledPages = importedCount === 0 ? stalledPages + 1 : 0;

    if (stalledPages >= MAX_STALLED_PAGES) {
      break;
    }

    cursor = page.nextCursor;
    pageNumber += 1;
  }

  return nextCursor
    ? { items, rawPath: rawSink.path, nextCursor }
    : { items, rawPath: rawSink.path };
}

async function fetchSavedPostsPage(
  cookieHeader: string,
  offset: number,
  limit?: number,
): Promise<unknown> {
  const url = new URL("/api/v1/reader/posts", SUBSTACK_BASE_URL);
  url.searchParams.set("inboxType", "saved");
  url.searchParams.set("limit", String(limit ?? 20));
  url.searchParams.set("offset", String(offset));

  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      cookie: cookieHeader,
    },
    method: "GET",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Substack saved request failed with ${response.status}: ${body.slice(0, 400)}`);
  }

  return response.json();
}

function parseSavedPostsPayload(payload: unknown): ParsedSavedPage {
  const data = asRecord(payload) as SavedPostsResponse | null;
  const posts = Array.isArray(data?.posts) ? data.posts : [];
  const savedPostsById = new Map<number, SubstackSavedPost>();
  const inboxItemsById = new Map<number, SubstackInboxItem>();
  const publicationsById = new Map<number, SubstackPublication>();
  const items: TroveItem[] = [];
  const rawItems: Record<string, unknown>[] = [];

  for (const entry of Array.isArray(data?.savedPosts) ? data.savedPosts : []) {
    if (typeof entry.post_id === "number") {
      savedPostsById.set(entry.post_id, entry);
    }
  }

  for (const entry of Array.isArray(data?.inboxItems) ? data.inboxItems : []) {
    if (typeof entry.post_id === "number") {
      inboxItemsById.set(entry.post_id, entry);
    }
  }

  for (const entry of Array.isArray(data?.publications) ? data.publications : []) {
    if (typeof entry.id === "number") {
      publicationsById.set(entry.id, entry);
    }
  }

  for (const post of posts) {
    if (typeof post.id !== "number") {
      continue;
    }

    const publication =
      typeof post.publication_id === "number"
        ? publicationsById.get(post.publication_id)
        : undefined;
    const savedPost = savedPostsById.get(post.id);
    const inboxItem = inboxItemsById.get(post.id);
    const item = normalizeSavedPost(post, publication, savedPost, inboxItem);

    if (!item) {
      continue;
    }

    items.push(item);
    rawItems.push(buildSavedRawRecord(post, publication, savedPost, inboxItem));
  }

  return {
    items,
    rawItems,
    hasMore: data?.more === true,
  };
}

interface SelfProfile {
  id: number;
  handle: string;
}

interface LikesFeedResponse {
  items?: unknown[];
  nextCursor?: string;
}

interface ParsedLikesPage {
  items: TroveItem[];
  rawItems: Record<string, unknown>[];
  nextCursor?: string;
}

function normalizeKind(kind?: string): "saved" | "likes" {
  if (kind === undefined || kind === "saved") {
    return "saved";
  }

  if (kind === "likes") {
    return kind;
  }

  throw new Error('Substack sync kind must be "saved" or "likes".');
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

async function fetchSelfProfile(cookieHeader: string): Promise<SelfProfile> {
  const response = await fetch("https://substack.com/inbox/saved", {
    headers: {
      accept: "text/html",
      cookie: cookieHeader,
    },
    method: "GET",
  });

  if (!response.ok) {
    throw new Error(
      `Could not load Substack inbox page to resolve the authenticated user: ${response.status}`,
    );
  }

  const html = await response.text();
  const match = html.match(/\\"user\\":\{\\"id\\":(\d+).*?\\"handle\\":\\"([^\\"]+)\\"/s);

  if (!match) {
    throw new Error("Could not resolve the authenticated Substack user from the inbox page.");
  }

  return {
    id: Number.parseInt(match[1] ?? "", 10),
    handle: match[2] ?? "",
  };
}

async function fetchLikesPage(
  cookieHeader: string,
  userId: number,
  cursor?: string,
): Promise<unknown> {
  const url = new URL(`/api/v1/reader/feed/profile/${userId}`, SUBSTACK_BASE_URL);
  url.searchParams.append("types[]", "like");

  if (cursor) {
    url.searchParams.set("cursor", cursor);
  }

  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      cookie: cookieHeader,
    },
    method: "GET",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Substack likes request failed with ${response.status}: ${body.slice(0, 400)}`);
  }

  return response.json();
}

function parseLikesPayload(payload: unknown, likesPageUrl: string): ParsedLikesPage {
  const data = asRecord(payload) as LikesFeedResponse | null;
  const items: TroveItem[] = [];
  const rawItems: Record<string, unknown>[] = [];

  for (const entry of Array.isArray(data?.items) ? data.items : []) {
    const record = asRecord(entry);
    const item = normalizeLikeItem(record, likesPageUrl);

    if (!item || !record) {
      continue;
    }

    items.push(item);
    rawItems.push(buildLikeRawRecord(record));
  }

  return data?.nextCursor ? { items, rawItems, nextCursor: data.nextCursor } : { items, rawItems };
}

function normalizeLikeItem(
  record: Record<string, unknown> | null,
  likesPageUrl: string,
): TroveItem | null {
  if (!record) {
    return null;
  }

  const entityKey = cleanText(record.entity_key);
  const context = asRecord(record.context);
  const contextTimestamp = cleanText(context?.timestamp);

  if (!entityKey || !contextTimestamp) {
    return null;
  }

  const post = asRecord(record.post);
  if (post) {
    return normalizeLikedPost(entityKey, contextTimestamp, post, asRecord(record.publication));
  }

  const comment = asRecord(record.comment);
  if (comment) {
    return normalizeLikedComment(entityKey, contextTimestamp, comment, likesPageUrl);
  }

  return null;
}

function normalizeLikedPost(
  entityKey: string,
  likedAt: string,
  postRecord: Record<string, unknown>,
  publicationRecord?: Record<string, unknown> | null,
): TroveItem | null {
  const post = postRecord as unknown as SubstackPost;
  const publication = publicationRecord as unknown as SubstackPublication | undefined;
  const title = cleanText(post.title);
  const url = readPostUrl(post, publication);

  if (!title || !url) {
    return null;
  }

  const publicationName = cleanText(publication?.name);
  const author = firstNonEmptyString(
    cleanText(post.publishedBylines?.[0]?.name),
    cleanText(publication?.author_name),
    publicationName,
  );
  const excerpt = firstNonEmptyString(
    cleanText(post.subtitle),
    cleanText(post.description),
    cleanText(post.truncated_body_text),
  );

  return {
    source: "substack",
    kind: "like",
    externalId: entityKey,
    title,
    url,
    savedAt: likedAt,
    ...(excerpt ? { excerpt } : {}),
    ...(author ? { author } : {}),
    tags: publicationName ? ["substack", "like", publicationName] : ["substack", "like"],
    raw: {
      platform: "substack",
      kind: "like",
      entityKey,
      itemType: "post",
      postId: readNumber(postRecord, "id"),
      publicationId: publication?.id ?? readNumber(postRecord, "publication_id"),
      publicationName: publicationName ?? null,
      likedAtSource: "context.timestamp",
    },
  };
}

function normalizeLikedComment(
  entityKey: string,
  likedAt: string,
  comment: Record<string, unknown>,
  likesPageUrl: string,
): TroveItem | null {
  const commentId = readNumber(comment, "id");
  const body = cleanText(comment.body);
  const author = cleanText(comment.name);
  const handle = cleanText(comment.handle);

  if (commentId === null || !body) {
    return null;
  }

  const title = author ? `Liked note by ${author}` : "Liked note";
  const excerpt = body.length > 280 ? `${body.slice(0, 277)}...` : body;
  const publicationName = cleanText(asRecord(comment.user_primary_publication)?.name);
  const url = handle ? `https://substack.com/@${handle}/note/${entityKey}` : likesPageUrl;

  return {
    source: "substack",
    kind: "like",
    externalId: entityKey,
    title,
    url,
    savedAt: likedAt,
    excerpt,
    content: body,
    ...(author ? { author } : {}),
    tags: publicationName
      ? ["substack", "like", "note", publicationName]
      : ["substack", "like", "note"],
    raw: {
      platform: "substack",
      kind: "like",
      entityKey,
      itemType: "comment",
      commentId,
      publicationName: publicationName ?? null,
      likedAtSource: "context.timestamp",
      urlSource: handle ? "note-route" : "profile-likes-page",
    },
  };
}

function buildSavedRawRecord(
  post: SubstackPost,
  publication?: SubstackPublication,
  savedPost?: SubstackSavedPost,
  inboxItem?: SubstackInboxItem,
): Record<string, unknown> {
  return {
    platform: "substack",
    kind: "saved",
    postId: post.id,
    title: cleanText(post.title),
    canonicalUrl: cleanText(post.canonical_url),
    publication: {
      id: publication?.id ?? post.publication_id ?? null,
      name: cleanText(publication?.name),
      authorName: cleanText(publication?.author_name),
      baseUrl: readPublicationBaseUrl(publication),
    },
    savedAt:
      firstNonEmptyString(
        savedPost?.created_at,
        inboxItem?.saved_at,
        inboxItem?.inbox_date,
        post.post_date,
      ) ?? null,
    savedAtSource: savedPost?.created_at
      ? "savedPosts.created_at"
      : inboxItem?.saved_at
        ? "inboxItems.saved_at"
        : "post_date",
    postDate: cleanText(post.post_date),
    subtitle: cleanText(post.subtitle),
    description: cleanText(post.description),
    truncatedBodyText: cleanText(post.truncated_body_text),
    author: cleanText(post.publishedBylines?.[0]?.name) ?? cleanText(publication?.author_name),
    inboxItem: inboxItem
      ? {
          postId: inboxItem.post_id ?? null,
          publicationId: inboxItem.publication_id ?? null,
          savedAt: inboxItem.saved_at ?? null,
          inboxDate: inboxItem.inbox_date ?? null,
        }
      : null,
  };
}

function buildLikeRawRecord(record: Record<string, unknown>): Record<string, unknown> {
  const context = asRecord(record.context);
  const post = asRecord(record.post);
  const publication = asRecord(record.publication);
  const comment = asRecord(record.comment);
  const commentPublication = asRecord(comment?.user_primary_publication);

  return {
    platform: "substack",
    kind: "like",
    entityKey: cleanText(record.entity_key),
    itemType: cleanText(record.type),
    likedAt: cleanText(context?.timestamp),
    contextType: cleanText(context?.type),
    publication: publication
      ? {
          id: readNumber(publication, "id"),
          name: cleanText(publication.name),
          authorName: cleanText(publication.author_name),
          baseUrl: cleanText(publication.base_url),
        }
      : commentPublication
        ? {
            id: readNumber(commentPublication, "id"),
            name: cleanText(commentPublication.name),
            authorName: cleanText(comment?.name),
            baseUrl: cleanText(commentPublication.custom_domain)
              ? `https://${cleanText(commentPublication.custom_domain)}`
              : cleanText(commentPublication.subdomain)
                ? `https://${cleanText(commentPublication.subdomain)}.substack.com`
                : null,
          }
        : null,
    post: post
      ? {
          id: readNumber(post, "id"),
          title: cleanText(post.title),
          canonicalUrl: cleanText(post.canonical_url),
          postDate: cleanText(post.post_date),
          subtitle: cleanText(post.subtitle),
          author: cleanText(
            asRecord(Array.isArray(post.publishedBylines) ? post.publishedBylines[0] : null)?.name,
          ),
        }
      : null,
    comment: comment
      ? {
          id: readNumber(comment, "id"),
          author: cleanText(comment.name),
          handle: cleanText(comment.handle),
          url:
            cleanText(comment.handle) && cleanText(record.entity_key)
              ? `https://substack.com/@${cleanText(comment.handle)}/note/${cleanText(record.entity_key)}`
              : null,
          body: cleanText(comment.body),
          commentDate: cleanText(comment.date),
          attachmentCount: Array.isArray(comment.attachments) ? comment.attachments.length : 0,
        }
      : null,
  };
}

function normalizeSavedPost(
  post: SubstackPost,
  publication?: SubstackPublication,
  savedPost?: SubstackSavedPost,
  inboxItem?: SubstackInboxItem,
): TroveItem | null {
  const title = cleanText(post.title);
  const url = readPostUrl(post, publication);
  const savedAt = firstNonEmptyString(
    savedPost?.created_at,
    inboxItem?.saved_at,
    inboxItem?.inbox_date,
    post.post_date,
  );

  if (!title || !url || !savedAt) {
    return null;
  }

  const publicationName = cleanText(publication?.name);
  const author = firstNonEmptyString(
    cleanText(post.publishedBylines?.[0]?.name),
    cleanText(publication?.author_name),
    publicationName,
  );
  const excerpt = firstNonEmptyString(
    cleanText(post.subtitle),
    cleanText(post.description),
    cleanText(post.truncated_body_text),
  );

  return {
    source: "substack",
    kind: "saved",
    externalId: String(post.id),
    title,
    url,
    savedAt,
    ...(excerpt ? { excerpt } : {}),
    ...(author ? { author } : {}),
    tags: publicationName ? ["substack", "saved", publicationName] : ["substack", "saved"],
    raw: {
      platform: "substack",
      kind: "saved",
      postId: post.id,
      publicationId: publication?.id ?? post.publication_id ?? null,
      publicationName: publicationName ?? null,
      savedAtSource: savedPost?.created_at
        ? "savedPosts.created_at"
        : inboxItem?.saved_at
          ? "inboxItems.saved_at"
          : "post_date",
    },
  };
}

function readPostUrl(post: SubstackPost, publication?: SubstackPublication): string | null {
  const canonicalUrl = cleanText(post.canonical_url);

  if (canonicalUrl) {
    return canonicalUrl;
  }

  const slug = cleanText(post.slug);
  const baseUrl = readPublicationBaseUrl(publication);

  if (!slug || !baseUrl) {
    return null;
  }

  return new URL(`/p/${slug}`, baseUrl).toString();
}

function readPublicationBaseUrl(publication?: SubstackPublication): string | null {
  if (!publication) {
    return null;
  }

  if (publication.custom_domain) {
    return `https://${publication.custom_domain}`;
  }

  if (publication.subdomain) {
    return `https://${publication.subdomain}.substack.com`;
  }

  return null;
}

function cleanText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function firstNonEmptyString(...values: Array<string | null | undefined>): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }

  return undefined;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readNumber(
  record: Record<string, unknown> | null | undefined,
  key: string,
): number | null {
  const value = record?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

import path from "node:path";
import { chromium, type Request, type Response } from "playwright-core";
import { createJsonlSink, createTimestampedFileName } from "../core/raw.js";
import { getChromiumSession, listChromiumBrowsers } from "../auth/chromium.js";
import type { SupportedBrowserId } from "../types/browser.js";
import type { TroveItem } from "../types/item.js";

const X_BOOKMARKS_URL = "https://x.com/i/bookmarks";
const BOOKMARKS_REQUEST_PATTERN = /\/i\/api\/graphql\/[^/]+\/Bookmarks(?:\?|$)/;

interface XSyncOptions {
  browserId: SupportedBrowserId;
  profile?: string;
  limit?: number;
  headful?: boolean;
  cursor?: string;
  debugRawPages?: boolean;
}

export interface XSyncResult {
  items: TroveItem[];
  nextCursor?: string;
  rawPath: string;
  debugRawPagesPath?: string;
}

interface SeedRequest {
  url: URL;
  headers: Record<string, string>;
}

interface BookmarksPage {
  items: TroveItem[];
  rawBookmarks: Record<string, unknown>[];
  nextCursor?: string;
}

export async function syncXBookmarks(options: XSyncOptions): Promise<XSyncResult> {
  const session = await getChromiumSession(options.browserId, options.profile);
  const scope = `${options.browserId}-${(options.profile ?? "Default").replaceAll(path.sep, "-")}`;
  const rawSink = createJsonlSink("x", createTimestampedFileName(scope));
  const debugRawSink = options.debugRawPages ? createJsonlSink(path.join("x", "debug-pages"), createTimestampedFileName(scope)) : null;
  const browser = await chromium.launch({
    executablePath: session.browser.executablePath,
    headless: options.headful ? false : true,
  });

  try {
    const context = await browser.newContext();
    await context.addCookies(session.playwrightCookies);

    const page = await context.newPage();
    const bookmarksResponsePromise = page.waitForResponse(
      (response) => BOOKMARKS_REQUEST_PATTERN.test(response.url()),
      { timeout: 20_000 },
    );

    await page.goto(X_BOOKMARKS_URL, { waitUntil: "domcontentloaded" });
    const bookmarksResponse = await bookmarksResponsePromise;
    const seedRequest = await buildSeedRequest(bookmarksResponse);
    const firstPayload = await bookmarksResponse.json();
    const firstPage = parseBookmarksPayload(firstPayload);
    writeRawBookmarks(rawSink, firstPage.rawBookmarks);
    writeDebugRawBookmarksPage(debugRawSink, {
      browserId: options.browserId,
      profile: options.profile ?? "Default",
      phase: "seed",
      requestUrl: bookmarksResponse.url(),
      payload: firstPayload,
    });

    const items: TroveItem[] = [];
    const seenIds = new Set<string>();

    if (options.cursor) {
      const replay = await fetchBookmarksPage(seedRequest, options.cursor, remainingLimit(items.length, options.limit));
      const replayPage = parseBookmarksPayload(replay);
      writeRawBookmarks(rawSink, replayPage.rawBookmarks);
      writeDebugRawBookmarksPage(debugRawSink, {
        browserId: options.browserId,
        profile: options.profile ?? "Default",
        phase: "resume",
        cursor: options.cursor,
        requestUrl: seedRequest.url.toString(),
        payload: replay,
      });
      mergeBookmarkPage(items, seenIds, replayPage, options.limit);

      let nextCursor = replayPage.nextCursor;
      while (nextCursor && withinLimit(items.length, options.limit)) {
        const response = await fetchBookmarksPage(seedRequest, nextCursor, remainingLimit(items.length, options.limit));
        const pageData = parseBookmarksPayload(response);
        writeRawBookmarks(rawSink, pageData.rawBookmarks);
        writeDebugRawBookmarksPage(debugRawSink, {
          browserId: options.browserId,
          profile: options.profile ?? "Default",
          phase: "resume-page",
          cursor: nextCursor,
          requestUrl: seedRequest.url.toString(),
          payload: response,
        });
        mergeBookmarkPage(items, seenIds, pageData, options.limit);
        nextCursor = pageData.nextCursor;
      }

      return nextCursor
        ? { items, nextCursor, rawPath: rawSink.path, ...(debugRawSink ? { debugRawPagesPath: debugRawSink.path } : {}) }
        : { items, rawPath: rawSink.path, ...(debugRawSink ? { debugRawPagesPath: debugRawSink.path } : {}) };
    }

    mergeBookmarkPage(items, seenIds, firstPage, options.limit);

    let nextCursor = firstPage.nextCursor;

    while (nextCursor && withinLimit(items.length, options.limit)) {
      const response = await fetchBookmarksPage(seedRequest, nextCursor, remainingLimit(items.length, options.limit));
      const pageData = parseBookmarksPayload(response);
      writeRawBookmarks(rawSink, pageData.rawBookmarks);
      writeDebugRawBookmarksPage(debugRawSink, {
        browserId: options.browserId,
        profile: options.profile ?? "Default",
        phase: "page",
        cursor: nextCursor,
        requestUrl: seedRequest.url.toString(),
        payload: response,
      });
      mergeBookmarkPage(items, seenIds, pageData, options.limit);
      nextCursor = pageData.nextCursor;
    }

    return nextCursor
      ? { items, nextCursor, rawPath: rawSink.path, ...(debugRawSink ? { debugRawPagesPath: debugRawSink.path } : {}) }
      : { items, rawPath: rawSink.path, ...(debugRawSink ? { debugRawPagesPath: debugRawSink.path } : {}) };
  } finally {
    await browser.close();
  }
}

export function formatAvailableBrowserList(): string {
  return listChromiumBrowsers()
    .filter((browser) => browser.installed)
    .map((browser) => {
      const status = browser.cookieSupport === "verified" ? "verified" : "experimental";
      return `${browser.id} (${browser.name}, ${status})`;
    })
    .join(", ");
}

async function buildSeedRequest(response: Response): Promise<SeedRequest> {
  const request = response.request();
  const headers = sanitizeRequestHeaders(await getRequestHeaders(request));

  return {
    url: new URL(request.url()),
    headers,
  };
}

async function fetchBookmarksPage(seedRequest: SeedRequest, cursor: string, count?: number): Promise<unknown> {
  const url = new URL(seedRequest.url.toString());
  const variables = parseJsonParam<Record<string, unknown>>(url.searchParams.get("variables"));

  variables.cursor = cursor;
  if (typeof count === "number" && count > 0) {
    variables.count = count;
  }

  url.searchParams.set("variables", JSON.stringify(variables));

  const response = await fetch(url, {
    headers: seedRequest.headers,
    method: "GET",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`X bookmarks request failed with ${response.status}: ${body.slice(0, 400)}`);
  }

  return response.json();
}

async function getRequestHeaders(request: Request): Promise<Record<string, string>> {
  if ("allHeaders" in request && typeof request.allHeaders === "function") {
    return request.allHeaders();
  }

  return request.headers();
}

function sanitizeRequestHeaders(headers: Record<string, string>): Record<string, string> {
  const forbiddenHeaders = new Set([
    ":authority",
    ":method",
    ":path",
    ":scheme",
    "host",
    "content-length",
    "connection",
    "accept-encoding",
    "sec-fetch-dest",
    "sec-fetch-mode",
    "sec-fetch-site",
    "sec-ch-ua",
    "sec-ch-ua-mobile",
    "sec-ch-ua-platform",
    "referer",
  ]);

  return Object.fromEntries(
    Object.entries(headers).filter(([key]) => !forbiddenHeaders.has(key.toLowerCase())),
  );
}

function parseBookmarksPayload(payload: unknown): BookmarksPage {
  const tweets = collectTweets(payload);
  const items = tweets.map(normalizeTweet).filter((item): item is TroveItem => item !== null);
  const rawBookmarks = tweets.map(extractRawBookmarkRecord).filter((item): item is Record<string, unknown> => item !== null);
  const nextCursor = collectBottomCursor(payload);

  return nextCursor ? { items, rawBookmarks, nextCursor } : { items, rawBookmarks };
}

function collectTweets(payload: unknown): unknown[] {
  const results = new Map<string, unknown>();

  walk(payload, (value) => {
    const candidate = unwrapTweet(value);
    if (!candidate || typeof candidate !== "object") {
      return;
    }

    const candidateRecord = asRecord(candidate);
    const restId = readString(candidateRecord, "rest_id");
    const fullText = readString(asRecord(candidateRecord?.legacy), "full_text");

    if (!restId || !fullText) {
      return;
    }

    results.set(restId, candidate);
  });

  return Array.from(results.values());
}

function unwrapTweet(value: unknown): unknown {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;

  if (record.__typename === "TweetWithVisibilityResults" && record.tweet) {
    return unwrapTweet(record.tweet);
  }

  if (record.tweet_results && typeof record.tweet_results === "object") {
    return unwrapTweet((record.tweet_results as Record<string, unknown>).result);
  }

  if (record.result && typeof record.result === "object") {
    const nested = unwrapTweet(record.result);
    if (nested) {
      return nested;
    }
  }

  return value;
}

function normalizeTweet(tweet: unknown): TroveItem | null {
  if (!tweet || typeof tweet !== "object") {
    return null;
  }

  const record = tweet as Record<string, unknown>;
  const legacy = asRecord(record.legacy);
  const restId = readString(record, "rest_id");
  const text = extractTweetText(record);
  const author = extractTweetAuthor(record);

  if (!legacy || !restId || !text) {
    return null;
  }

  const screenName = author?.screenName;
  const savedAt = readString(legacy, "created_at")
    ? new Date(readString(legacy, "created_at") as string).toISOString()
    : new Date().toISOString();
  const url = screenName ? `https://x.com/${screenName}/status/${restId}` : `https://x.com/i/status/${restId}`;
  const titlePrefix = screenName ? `@${screenName}` : "X bookmark";

  const item: TroveItem = {
    source: "x",
    externalId: restId,
    title: `${titlePrefix}: ${truncate(text, 80)}`,
    url,
    excerpt: truncate(text, 240),
    content: text,
    savedAt,
    tags: ["x", "bookmark"],
    raw: {
      kind: "bookmark",
      ...(screenName ? { screenName } : {}),
      favoriteCount: readNumber(legacy, "favorite_count"),
      retweetCount: readNumber(legacy, "retweet_count"),
    },
  };

  if (author?.name) {
    item.author = author.name;
  }

  return item;
}

function extractRawBookmarkRecord(tweet: unknown): Record<string, unknown> | null {
  if (!tweet || typeof tweet !== "object") {
    return null;
  }

  const record = tweet as Record<string, unknown>;
  const legacy = asRecord(record.legacy);
  const restId = readString(record, "rest_id");
  const text = extractTweetText(record);
  const author = extractTweetAuthor(record);

  if (!legacy || !restId || !text) {
    return null;
  }

  const screenName = author?.screenName;

  const bookmark: Record<string, unknown> = {
    id: restId,
    url: screenName ? `https://x.com/${screenName}/status/${restId}` : `https://x.com/i/status/${restId}`,
    text,
    createdAt: parseCreatedAt(readString(legacy, "created_at")),
    stats: {
      favoriteCount: readNumber(legacy, "favorite_count") ?? 0,
      retweetCount: readNumber(legacy, "retweet_count") ?? 0,
      replyCount: readNumber(legacy, "reply_count") ?? 0,
      quoteCount: readNumber(legacy, "quote_count") ?? 0,
    },
    links: extractUrls(legacy),
    media: extractMedia(legacy),
    tags: ["x", "bookmark"],
  };

  if (author) {
    bookmark.author = author;
  }

  return bookmark;
}

function extractTweetText(tweet: Record<string, unknown>): string | null {
  const noteTweetText = readString(
    asRecord(asRecord(asRecord(tweet.note_tweet)?.note_tweet_results)?.result),
    "text",
  );

  if (noteTweetText) {
    return noteTweetText;
  }

  return readString(asRecord(tweet.legacy), "full_text") ?? null;
}

function extractTweetAuthor(tweet: Record<string, unknown>): { name?: string; screenName: string } | null {
  for (const candidate of collectAuthorCandidates(tweet)) {
    const user = unwrapUser(candidate);
    const userLegacy = asRecord(user?.legacy);
    const screenName = readString(userLegacy, "screen_name") ?? readString(asRecord(user?.core), "screen_name");

    if (!screenName || !looksLikeScreenName(screenName)) {
      continue;
    }

    const author: { name?: string; screenName: string } = { screenName };
    const name = readString(userLegacy, "name") ?? readString(asRecord(user?.core), "name");

    if (name) {
      author.name = name;
    }

    return author;
  }

  return null;
}

function collectBottomCursor(payload: unknown): string | undefined {
  let cursor: string | undefined;

  walk(payload, (value) => {
    if (cursor || !value || typeof value !== "object") {
      return;
    }

    const record = value as Record<string, unknown>;
    const cursorType = readString(record, "cursorType");
    const entryId = readString(record, "entryId");
    const valueString = readString(record, "value");

    if (!valueString) {
      return;
    }

    if (cursorType?.toLowerCase() === "bottom") {
      cursor = valueString;
      return;
    }

    if (entryId?.includes("cursor-bottom")) {
      cursor = valueString;
    }
  });

  return cursor;
}

function walk(value: unknown, visit: (value: unknown) => void): void {
  visit(value);

  if (Array.isArray(value)) {
    for (const item of value) {
      walk(item, visit);
    }
    return;
  }

  if (!value || typeof value !== "object") {
    return;
  }

  for (const child of Object.values(value as Record<string, unknown>)) {
    walk(child, visit);
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function unwrapUser(value: unknown): Record<string, unknown> | null {
  const record = asRecord(value);
  if (!record) {
    return null;
  }

  if (record.result) {
    return unwrapUser(record.result);
  }

  return record;
}

function readString(record: Record<string, unknown> | null, key: string): string | undefined {
  if (!record) {
    return undefined;
  }

  const value = record[key];
  return typeof value === "string" ? value : undefined;
}

function readNumber(record: Record<string, unknown> | null, key: string): number | undefined {
  if (!record) {
    return undefined;
  }

  const value = record[key];
  return typeof value === "number" ? value : undefined;
}

function looksLikeScreenName(value: string): boolean {
  return /^[A-Za-z0-9_]{1,15}$/.test(value);
}

function collectAuthorCandidates(tweet: Record<string, unknown>): unknown[] {
  const candidates: unknown[] = [];
  const core = asRecord(tweet.core);
  const quotedStatusResult = asRecord(asRecord(tweet.quoted_status_result)?.result);
  const legacy = asRecord(tweet.legacy);
  const entities = asRecord(legacy?.entities);
  const mentions = Array.isArray(entities?.user_mentions) ? entities.user_mentions : [];

  if (core?.user_results) {
    candidates.push(core.user_results);
  }

  if (quotedStatusResult?.core) {
    candidates.push(asRecord(quotedStatusResult.core)?.user_results);
  }

  for (const mention of mentions) {
    const mentionRecord = asRecord(mention);
    if (!mentionRecord) {
      continue;
    }

    const screenName = readString(mentionRecord, "screen_name");
    if (screenName) {
      candidates.push({
        legacy: {
          screen_name: screenName,
          name: readString(mentionRecord, "name") ?? screenName,
        },
      });
    }
  }

  walk(tweet, (value) => {
    const record = asRecord(value);
    const userResults = asRecord(record?.user_results);
    if (userResults) {
      candidates.push(userResults);
    }
  });

  return candidates;
}

function parseCreatedAt(value: string | undefined): string {
  return value ? new Date(value).toISOString() : new Date().toISOString();
}

function extractUrls(legacy: Record<string, unknown> | null): string[] {
  const entities = asRecord(legacy?.entities);
  const urls = Array.isArray(entities?.urls) ? entities.urls : [];
  return urls
    .map((entry) => asRecord(entry))
    .map((entry) => readString(entry, "expanded_url") ?? readString(entry, "url"))
    .filter((value): value is string => Boolean(value));
}

function extractMedia(legacy: Record<string, unknown> | null): Array<Record<string, unknown>> {
  const entities = asRecord(legacy?.extended_entities) ?? asRecord(legacy?.entities);
  const mediaEntries = Array.isArray(entities?.media) ? entities.media : [];

  return mediaEntries
    .map((entry) => asRecord(entry))
    .filter((entry): entry is Record<string, unknown> => entry !== null)
    .map((entry) => ({
      type: readString(entry, "type") ?? "unknown",
      mediaUrl: readString(entry, "media_url_https") ?? readString(entry, "media_url"),
      expandedUrl: readString(entry, "expanded_url"),
    }));
}

function truncate(value: string, length: number): string {
  if (value.length <= length) {
    return value;
  }

  return `${value.slice(0, Math.max(0, length - 1)).trimEnd()}…`;
}

function parseJsonParam<T>(value: string | null): T {
  if (!value) {
    return {} as T;
  }

  return JSON.parse(value) as T;
}

function withinLimit(count: number, limit?: number): boolean {
  return typeof limit !== "number" || count < limit;
}

function remainingLimit(count: number, limit?: number): number | undefined {
  if (typeof limit !== "number") {
    return undefined;
  }

  return Math.max(0, limit - count);
}

function mergeBookmarkPage(allItems: TroveItem[], seenIds: Set<string>, page: BookmarksPage, limit?: number): void {
  for (const item of page.items) {
    if (seenIds.has(item.externalId)) {
      continue;
    }

    allItems.push(item);
    seenIds.add(item.externalId);

    if (!withinLimit(allItems.length, limit)) {
      break;
    }
  }
}

function writeRawBookmarks(
  sink: ReturnType<typeof createJsonlSink>,
  bookmarks: Record<string, unknown>[],
): void {
  for (const bookmark of bookmarks) {
    sink.append(bookmark);
  }
}

function writeDebugRawBookmarksPage(
  sink: ReturnType<typeof createJsonlSink> | null,
  entry: {
    browserId: SupportedBrowserId;
    profile: string;
    phase: "seed" | "resume" | "page" | "resume-page";
    requestUrl: string;
    payload: unknown;
    cursor?: string;
  },
): void {
  if (!sink) {
    return;
  }

  sink.append({
    fetchedAt: new Date().toISOString(),
    source: "x",
    browserId: entry.browserId,
    profile: entry.profile,
    phase: entry.phase,
    requestUrl: entry.requestUrl,
    ...(entry.cursor ? { cursor: entry.cursor } : {}),
    payload: entry.payload,
  });
}

export const __internal = {
  collectBottomCursor,
  extractRawBookmarkRecord,
  normalizeTweet,
  parseBookmarksPayload,
  truncate,
};

import { chromium, type Request, type Response } from "playwright-core";
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
}

export interface XSyncResult {
  items: TroveItem[];
  nextCursor?: string;
}

interface SeedRequest {
  url: URL;
  headers: Record<string, string>;
}

interface BookmarksPage {
  items: TroveItem[];
  nextCursor?: string;
}

export async function syncXBookmarks(options: XSyncOptions): Promise<XSyncResult> {
  const session = await getChromiumSession(options.browserId, options.profile);
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

    const items: TroveItem[] = [];
    const seenIds = new Set<string>();

    if (options.cursor) {
      const replay = await fetchBookmarksPage(seedRequest, options.cursor, remainingLimit(items.length, options.limit));
      const replayPage = parseBookmarksPayload(replay);
      mergeBookmarkPage(items, seenIds, replayPage, options.limit);

      let nextCursor = replayPage.nextCursor;
      while (nextCursor && withinLimit(items.length, options.limit)) {
        const response = await fetchBookmarksPage(seedRequest, nextCursor, remainingLimit(items.length, options.limit));
        const pageData = parseBookmarksPayload(response);
        mergeBookmarkPage(items, seenIds, pageData, options.limit);
        nextCursor = pageData.nextCursor;
      }

      return nextCursor ? { items, nextCursor } : { items };
    }

    mergeBookmarkPage(items, seenIds, firstPage, options.limit);

    let nextCursor = firstPage.nextCursor;

    while (nextCursor && withinLimit(items.length, options.limit)) {
      const response = await fetchBookmarksPage(seedRequest, nextCursor, remainingLimit(items.length, options.limit));
      const pageData = parseBookmarksPayload(response);
      mergeBookmarkPage(items, seenIds, pageData, options.limit);
      nextCursor = pageData.nextCursor;
    }

    return nextCursor ? { items, nextCursor } : { items };
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
  const nextCursor = collectBottomCursor(payload);

  return nextCursor ? { items, nextCursor } : { items };
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
  const user = asRecord(asRecord(asRecord(record.core)?.user_results)?.result);
  const userLegacy = asRecord(user?.legacy);
  const restId = readString(record, "rest_id");
  const text = extractTweetText(record);

  if (!legacy || !restId || !text) {
    return null;
  }

  const screenName = readString(userLegacy, "screen_name") ?? "i";
  const authorName = readString(userLegacy, "name") ?? screenName;
  const savedAt = readString(legacy, "created_at")
    ? new Date(readString(legacy, "created_at") as string).toISOString()
    : new Date().toISOString();

  return {
    source: "x",
    externalId: restId,
    title: `@${screenName}: ${truncate(text, 80)}`,
    url: `https://x.com/${screenName}/status/${restId}`,
    excerpt: truncate(text, 240),
    content: text,
    author: authorName,
    savedAt,
    tags: ["x", "bookmark"],
    raw: {
      kind: "bookmark",
      screenName,
      favoriteCount: readNumber(legacy, "favorite_count"),
      retweetCount: readNumber(legacy, "retweet_count"),
    },
  };
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

export const __internal = {
  collectBottomCursor,
  normalizeTweet,
  parseBookmarksPayload,
  truncate,
};

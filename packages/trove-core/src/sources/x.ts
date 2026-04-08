import path from "node:path";
import { chromium, type Page, type Request, type Response } from "playwright-core";
import { createJsonlSink, createTimestampedFileName } from "../core/raw.js";
import type { ProgressHandler } from "../core/progress.js";
import { getChromiumSession, listChromiumBrowsers } from "../auth/chromium.js";
import type { SupportedBrowserId } from "../types/browser.js";
import type { TroveItem } from "../types/item.js";

const X_BOOKMARKS_URL = "https://x.com/i/bookmarks";
const X_HOME_URL = "https://x.com/home";
const BOOKMARKS_REQUEST_PATTERN = /\/i\/api\/graphql\/[^/]+\/Bookmarks(?:\?|$)/;
const LIKES_REQUEST_PATTERN = /\/i\/api\/graphql\/[^/]+\/Likes(?:\?|$)/;
const MAX_STALLED_PAGES = 3;

type XSyncKind = "bookmarks" | "likes";

interface XSyncOptions {
  browserId: SupportedBrowserId;
  profile?: string;
  limit?: number;
  headful?: boolean;
  cursor?: string;
  debugRawPages?: boolean;
  kind?: string;
  onProgress?: ProgressHandler;
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

interface TimelinePage {
  items: TroveItem[];
  rawItems: Record<string, unknown>[];
  nextCursor?: string;
}

export async function syncXBookmarks(options: XSyncOptions): Promise<XSyncResult> {
  const kind = normalizeSyncKind(options.kind);
  const session = await getChromiumSession(options.browserId, options.profile, undefined, "X");
  const scope = `${options.browserId}-${(options.profile ?? "Default").replaceAll(path.sep, "-")}-${kind}`;
  const rawSink = createJsonlSink("x", createTimestampedFileName(scope));
  const debugRawSink = options.debugRawPages
    ? createJsonlSink(path.join("x", "debug-pages"), createTimestampedFileName(scope))
    : null;
  const browser = await chromium.launch({
    executablePath: session.browser.executablePath,
    headless: options.headful ? false : true,
  });

  try {
    const context = await browser.newContext();
    await context.addCookies(session.playwrightCookies);

    const page = await context.newPage();
    emitProgress(options.onProgress, "seed", `Discovering ${kind} request`);
    const syncTarget = await resolveSyncTarget(page, kind);
    const timelineResponsePromise = page.waitForResponse(
      (response) => syncTarget.requestPattern.test(response.url()),
      { timeout: 20_000 },
    );

    await page.goto(syncTarget.pageUrl, { waitUntil: "domcontentloaded" });
    const timelineResponse = await timelineResponsePromise;
    const seedRequest = await buildSeedRequest(timelineResponse);
    const firstPayload = await readTimelineResponsePayload(
      timelineResponse,
      `X ${kind} seed request`,
    );
    const firstPage = parseTimelinePayload(firstPayload, kind);
    writeRawItems(rawSink, firstPage.rawItems);
    writeDebugRawBookmarksPage(debugRawSink, {
      browserId: options.browserId,
      profile: options.profile ?? "Default",
      phase: "seed",
      requestUrl: timelineResponse.url(),
      payload: firstPayload,
      kind,
    });

    const items: TroveItem[] = [];
    const seenIds = new Set<string>();
    let pageNumber = 1;

    if (options.cursor) {
      mergeTimelinePage(items, seenIds, firstPage, options.limit);
      emitProgress(options.onProgress, "page", `Fetched ${kind} page ${pageNumber}`, items.length);

      const replay = await fetchTimelinePage(
        seedRequest,
        options.cursor,
        remainingLimit(items.length, options.limit),
        kind,
      );
      const replayPage = parseTimelinePayload(replay, kind);
      writeRawItems(rawSink, replayPage.rawItems);
      writeDebugRawBookmarksPage(debugRawSink, {
        browserId: options.browserId,
        profile: options.profile ?? "Default",
        phase: "resume",
        cursor: options.cursor,
        requestUrl: seedRequest.url.toString(),
        payload: replay,
        kind,
      });
      mergeTimelinePage(items, seenIds, replayPage, options.limit);
      pageNumber += 1;
      emitProgress(options.onProgress, "page", `Fetched ${kind} page ${pageNumber}`, items.length);

      let nextCursor = replayPage.nextCursor;
      let stalledPages = 0;

      while (nextCursor && withinLimit(items.length, options.limit)) {
        const requestedCursor = nextCursor;
        const response = await fetchTimelinePage(
          seedRequest,
          nextCursor,
          remainingLimit(items.length, options.limit),
          kind,
        );
        const pageData = parseTimelinePayload(response, kind);
        writeRawItems(rawSink, pageData.rawItems);
        writeDebugRawBookmarksPage(debugRawSink, {
          browserId: options.browserId,
          profile: options.profile ?? "Default",
          phase: "resume-page",
          cursor: nextCursor,
          requestUrl: seedRequest.url.toString(),
          payload: response,
          kind,
        });
        const importedCount = mergeTimelinePage(items, seenIds, pageData, options.limit);
        pageNumber += 1;
        emitProgress(
          options.onProgress,
          "page",
          `Fetched ${kind} page ${pageNumber}`,
          items.length,
        );
        nextCursor = nextPageCursor(
          pageData.nextCursor,
          requestedCursor,
          importedCount,
          stalledPages,
        );

        if (nextCursor) {
          stalledPages = importedCount === 0 ? stalledPages + 1 : 0;

          if (stalledPages >= MAX_STALLED_PAGES) {
            nextCursor = undefined;
          }
        }
      }

      return nextCursor
        ? {
            items,
            nextCursor,
            rawPath: rawSink.path,
            ...(debugRawSink ? { debugRawPagesPath: debugRawSink.path } : {}),
          }
        : {
            items,
            rawPath: rawSink.path,
            ...(debugRawSink ? { debugRawPagesPath: debugRawSink.path } : {}),
          };
    }

    mergeTimelinePage(items, seenIds, firstPage, options.limit);
    emitProgress(options.onProgress, "page", `Fetched ${kind} page ${pageNumber}`, items.length);

    let nextCursor = firstPage.nextCursor;

    let stalledPages = 0;

    while (nextCursor && withinLimit(items.length, options.limit)) {
      const requestedCursor = nextCursor;
      const response = await fetchTimelinePage(
        seedRequest,
        nextCursor,
        remainingLimit(items.length, options.limit),
        kind,
      );
      const pageData = parseTimelinePayload(response, kind);
      writeRawItems(rawSink, pageData.rawItems);
      writeDebugRawBookmarksPage(debugRawSink, {
        browserId: options.browserId,
        profile: options.profile ?? "Default",
        phase: "page",
        cursor: nextCursor,
        requestUrl: seedRequest.url.toString(),
        payload: response,
        kind,
      });
      const importedCount = mergeTimelinePage(items, seenIds, pageData, options.limit);
      pageNumber += 1;
      emitProgress(options.onProgress, "page", `Fetched ${kind} page ${pageNumber}`, items.length);
      nextCursor = nextPageCursor(
        pageData.nextCursor,
        requestedCursor,
        importedCount,
        stalledPages,
      );

      if (nextCursor) {
        stalledPages = importedCount === 0 ? stalledPages + 1 : 0;

        if (stalledPages >= MAX_STALLED_PAGES) {
          nextCursor = undefined;
        }
      }
    }

    return nextCursor
      ? {
          items,
          nextCursor,
          rawPath: rawSink.path,
          ...(debugRawSink ? { debugRawPagesPath: debugRawSink.path } : {}),
        }
      : {
          items,
          rawPath: rawSink.path,
          ...(debugRawSink ? { debugRawPagesPath: debugRawSink.path } : {}),
        };
  } finally {
    await browser.close();
  }
}

export async function validateXSession(cookieHeader: string): Promise<void> {
  const response = await fetch(X_BOOKMARKS_URL, {
    headers: {
      accept: "text/html,*/*",
      cookie: cookieHeader,
      "user-agent": "Mozilla/5.0",
    },
    redirect: "follow",
  });
  const html = await response.text();

  if (!response.ok) {
    throw new Error(`X authentication check failed with ${response.status}: ${html.slice(0, 200)}`);
  }

  if (
    response.url.includes("/i/flow/login") ||
    response.url.includes("/login") ||
    html.includes('href="/login"') ||
    html.includes('data-testid="loginButton"')
  ) {
    throw new Error("X is not logged in in the selected browser profile.");
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

async function resolveSyncTarget(
  page: Page,
  kind: XSyncKind,
): Promise<{
  pageUrl: string;
  requestPattern: RegExp;
}> {
  if (kind === "bookmarks") {
    return {
      pageUrl: X_BOOKMARKS_URL,
      requestPattern: BOOKMARKS_REQUEST_PATTERN,
    };
  }

  await page.goto(X_HOME_URL, { waitUntil: "domcontentloaded" });
  const screenName = await resolveAuthenticatedScreenName(page);

  return {
    pageUrl: `https://x.com/${screenName}/likes`,
    requestPattern: LIKES_REQUEST_PATTERN,
  };
}

async function resolveAuthenticatedScreenName(page: Page): Promise<string> {
  const profileLink = page.locator('a[data-testid="AppTabBar_Profile_Link"]').first();
  await profileLink.waitFor({ state: "attached", timeout: 20_000 });
  const href = await profileLink.getAttribute("href");
  const path = href?.trim();
  const screenName = path?.startsWith("/") ? path.slice(1) : path;

  if (!screenName || !looksLikeScreenName(screenName)) {
    throw new Error("Could not resolve the authenticated X profile handle from the home page.");
  }

  return screenName;
}

async function fetchTimelinePage(
  seedRequest: SeedRequest,
  cursor: string,
  count: number | undefined,
  kind: XSyncKind,
): Promise<unknown> {
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
    throw new Error(`X ${kind} request failed with ${response.status}: ${body.slice(0, 400)}`);
  }

  return response.json();
}

async function readTimelineResponsePayload(response: Response, label: string): Promise<unknown> {
  const text = await response.text();

  if (!response.ok()) {
    throw new Error(`${label} failed with ${response.status()}: ${text.slice(0, 400)}`);
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(`${label} returned non-JSON content: ${text.slice(0, 400)}`);
  }
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

function parseTimelinePayload(payload: unknown, kind: XSyncKind): TimelinePage {
  const tweets = collectTweets(payload, kind);
  const items = tweets
    .map((tweet) => normalizeTweet(tweet, kind))
    .filter((item): item is TroveItem => item !== null);
  const rawItems = tweets
    .map((tweet) => extractRawTweetRecord(tweet, kind))
    .filter((item): item is Record<string, unknown> => item !== null);
  const nextCursor = collectBottomCursor(payload);

  return nextCursor ? { items, rawItems, nextCursor } : { items, rawItems };
}

function collectTweets(payload: unknown, kind: XSyncKind): unknown[] {
  const results = new Map<string, unknown>();

  for (const entry of collectTimelineEntries(payload, kind)) {
    const candidate = unwrapTweet(extractTweetFromEntry(entry));
    if (!candidate || typeof candidate !== "object") {
      continue;
    }

    const candidateRecord = asRecord(candidate);
    if (!candidateRecord) {
      continue;
    }

    const restId = readString(candidateRecord, "rest_id");
    const text = extractTweetText(candidateRecord);

    if (!restId || !text) {
      continue;
    }

    results.set(restId, candidate);
  }

  return Array.from(results.values());
}

function collectTimelineEntries(payload: unknown, kind: XSyncKind): Record<string, unknown>[] {
  const instructions = getTimelineInstructionRoot(payload, kind);
  const instructionList = Array.isArray(asRecord(instructions)?.instructions)
    ? (asRecord(instructions)?.instructions as unknown[])
    : [];
  const entries: Record<string, unknown>[] = [];

  for (const instruction of instructionList) {
    const record = asRecord(instruction);
    if (!record) {
      continue;
    }

    const instructionEntries = Array.isArray(record.entries) ? record.entries : [];
    for (const entry of instructionEntries) {
      const entryRecord = asRecord(entry);
      if (entryRecord) {
        entries.push(entryRecord);
      }
    }
  }

  return entries;
}

function getTimelineInstructionRoot(
  payload: unknown,
  kind: XSyncKind,
): Record<string, unknown> | null {
  if (kind === "bookmarks") {
    const bookmarksTimelineContainer = asRecord(
      asRecord(asRecord(payload)?.data)?.bookmark_timeline_v2,
    );
    return asRecord(bookmarksTimelineContainer?.timeline);
  }

  const user = asRecord(asRecord(payload)?.data)?.user;
  const result = asRecord(asRecord(user)?.result);
  const likesTimelineContainer = asRecord(result?.timeline);
  return asRecord(likesTimelineContainer?.timeline);
}

function extractTweetFromEntry(entry: Record<string, unknown>): unknown {
  const content = asRecord(entry.content);
  const itemContent = asRecord(content?.itemContent);

  if (itemContent?.tweet_results) {
    return itemContent;
  }

  const items = Array.isArray(content?.items) ? content.items : [];
  for (const item of items) {
    const itemEntry = asRecord(item);
    const itemItem = asRecord(asRecord(itemEntry?.item)?.itemContent);
    if (itemItem?.tweet_results) {
      return itemItem;
    }
  }

  return null;
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

function normalizeTweet(tweet: unknown, kind: XSyncKind): TroveItem | null {
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
  const url = screenName
    ? `https://x.com/${screenName}/status/${restId}`
    : `https://x.com/i/status/${restId}`;
  const titlePrefix = screenName ? `@${screenName}` : kind === "likes" ? "X like" : "X bookmark";
  const actionTag = kind === "likes" ? "like" : "bookmark";
  const media = extractMedia(legacy);

  const item: TroveItem = {
    source: "x",
    kind: actionTag,
    externalId: buildItemExternalId(restId, kind),
    title: `${titlePrefix}: ${truncate(text, 80)}`,
    url,
    excerpt: truncate(text, 240),
    content: text,
    savedAt,
    tags: ["x", actionTag],
    raw: {
      kind: actionTag,
      savedAtSource: "tweet.created_at",
      ...(screenName ? { screenName } : {}),
      ...(author?.profileImageUrl ? { profileImageUrl: author.profileImageUrl } : {}),
      favoriteCount: readNumber(legacy, "favorite_count"),
      retweetCount: readNumber(legacy, "retweet_count"),
      ...(media.length > 0 ? { media } : {}),
    },
  };

  if (author?.name) {
    item.author = author.name;
  }

  return item;
}

function buildItemExternalId(restId: string, kind: XSyncKind): string {
  return `${kind}:${restId}`;
}

function extractRawTweetRecord(tweet: unknown, kind: XSyncKind): Record<string, unknown> | null {
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
  const actionTag = kind === "likes" ? "like" : "bookmark";

  const item: Record<string, unknown> = {
    kind: actionTag,
    id: restId,
    url: screenName
      ? `https://x.com/${screenName}/status/${restId}`
      : `https://x.com/i/status/${restId}`,
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
    tags: ["x", actionTag],
  };

  if (author) {
    item.author = author;
  }

  return item;
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

function extractTweetAuthor(
  tweet: Record<string, unknown>,
): { name?: string; screenName: string; profileImageUrl?: string } | null {
  for (const candidate of collectAuthorCandidates(tweet)) {
    const user = unwrapUser(candidate);
    const userLegacy = asRecord(user?.legacy);
    const screenName =
      readString(userLegacy, "screen_name") ?? readString(asRecord(user?.core), "screen_name");

    if (!screenName || !looksLikeScreenName(screenName)) {
      continue;
    }

    const author: { name?: string; screenName: string; profileImageUrl?: string } = { screenName };
    const name = readString(userLegacy, "name") ?? readString(asRecord(user?.core), "name");

    if (name) {
      author.name = name;
    }

    const profileImageUrl =
      readString(userLegacy, "profile_image_url_https") ??
      readString(asRecord(user?.avatar), "image_url");
    if (profileImageUrl) {
      author.profileImageUrl = profileImageUrl;
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
      videoUrl: readPreferredVideoUrl(entry),
    }));
}

function readPreferredVideoUrl(entry: Record<string, unknown>): string | undefined {
  const videoInfo = asRecord(entry.video_info);
  const variants = Array.isArray(videoInfo?.variants) ? videoInfo.variants : [];

  const mp4Variants = variants
    .map((variant) => asRecord(variant))
    .filter((variant): variant is Record<string, unknown> => variant !== null)
    .filter((variant) => readString(variant, "content_type") === "video/mp4");

  if (mp4Variants.length === 0) {
    return undefined;
  }

  const bestVariant = mp4Variants.sort((left, right) => {
    const leftBitrate = readNumber(left, "bitrate") ?? 0;
    const rightBitrate = readNumber(right, "bitrate") ?? 0;
    return rightBitrate - leftBitrate;
  });

  return bestVariant[0] ? readString(bestVariant[0], "url") : undefined;
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

function mergeTimelinePage(
  allItems: TroveItem[],
  seenIds: Set<string>,
  page: TimelinePage,
  limit?: number,
): number {
  let importedCount = 0;

  for (const item of page.items) {
    if (seenIds.has(item.externalId)) {
      continue;
    }

    allItems.push(item);
    seenIds.add(item.externalId);
    importedCount += 1;

    if (!withinLimit(allItems.length, limit)) {
      break;
    }
  }

  return importedCount;
}

function nextPageCursor(
  candidateCursor: string | undefined,
  requestedCursor: string,
  importedCount: number,
  stalledPages: number,
): string | undefined {
  if (!candidateCursor) {
    return undefined;
  }

  if (candidateCursor === requestedCursor) {
    return undefined;
  }

  if (importedCount === 0 && stalledPages + 1 >= MAX_STALLED_PAGES) {
    return undefined;
  }

  return candidateCursor;
}

function writeRawItems(
  sink: ReturnType<typeof createJsonlSink>,
  items: Record<string, unknown>[],
): void {
  for (const item of items) {
    sink.append(item);
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
    kind: XSyncKind;
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
    kind: entry.kind,
    phase: entry.phase,
    requestUrl: entry.requestUrl,
    ...(entry.cursor ? { cursor: entry.cursor } : {}),
    payload: entry.payload,
  });
}

function normalizeSyncKind(kind?: string): XSyncKind {
  if (!kind || kind === "bookmarks" || kind === "bookmark") {
    return "bookmarks";
  }

  if (kind === "likes" || kind === "like") {
    return "likes";
  }

  throw new Error('X sync kind must be "bookmarks" or "likes".');
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

export const __internal = {
  collectBottomCursor,
  extractRawTweetRecord,
  normalizeTweet,
  parseTimelinePayload,
  truncate,
};

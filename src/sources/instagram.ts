import path from "node:path";
import { getChromiumSession } from "../auth/chromium.js";
import { createJsonlSink, createTimestampedFileName } from "../core/raw.js";
import type { ProgressHandler } from "../core/progress.js";
import type { SupportedBrowserId } from "../types/browser.js";
import type { TroveItem } from "../types/item.js";

const INSTAGRAM_BASE_URL = "https://www.instagram.com";
const INSTAGRAM_APP_ID = "936619743392459";
const INSTAGRAM_ASBD_ID = "359341";
const INSTAGRAM_BLOKS_VERSION_ID = "f0fd53409d7667526e529854656fe20159af8b76db89f40c333e593b51a2ce10";
const SAVED_COLLECTIONS_DOC_ID = "26523442937261068";
const MAX_STALLED_PAGES = 3;
const COLLECTION_QUERY_COUNT = 100;
const DEFAULT_USER_AGENT = "Mozilla/5.0";
const DEFAULT_SESSION_ID = "trove:instagram:saved";

interface InstagramSyncOptions {
  browserId: SupportedBrowserId;
  profile?: string;
  kind?: string;
  limit?: number;
  cursor?: string;
  onProgress?: ProgressHandler;
}

export interface InstagramSyncResult {
  items: TroveItem[];
  rawPath: string;
  nextCursor?: string;
}

interface InstagramEditFormDataResponse {
  form_data?: {
    username?: string;
  };
}

interface InstagramSavedCollectionsResponse {
  data?: {
    xdt_api__v1__collections__list_graphql_connection?: {
      edges?: Array<{
        node?: {
          collection_id?: string;
          collection_name?: string;
          collection_media_count?: number;
        };
      }>;
      page_info?: {
        has_next_page?: boolean;
      };
    };
  };
}

interface InstagramSavedPostsResponse {
  items?: Array<{
    media?: InstagramSavedMedia;
  }>;
  more_available?: boolean;
  next_max_id?: string;
}

interface InstagramSavedMedia {
  id?: string;
  pk?: string;
  code?: string;
  media_type?: number;
  product_type?: string;
  subtype_name_for_REST__?: string;
  taken_at?: number;
  saved_collection_ids?: string[];
  like_count?: number;
  fb_like_count?: number;
  fb_comment_count?: number;
  play_count?: number;
  ig_play_count?: number;
  video_duration?: number;
  has_viewer_saved?: boolean;
  image_versions2?: {
    candidates?: Array<{ url?: string }>;
  };
  video_versions?: Array<{ url?: string }>;
  user?: {
    username?: string;
    full_name?: string;
  };
  owner?: {
    username?: string;
    full_name?: string;
  };
  caption?: {
    text?: string;
    created_at_utc?: number;
  };
  location?: {
    name?: string;
    lat?: number;
    lng?: number;
  };
  clips_metadata?: {
    music_info?: {
      music_asset_info?: {
        display_title?: string;
        artist_name?: string;
      };
    };
  };
}

interface ParsedSavedPostsPage {
  items: TroveItem[];
  rawItems: Record<string, unknown>[];
  nextPageCursor?: string;
}

interface InstagramRequestContext {
  cookieHeader: string;
  username: string;
}

export async function syncInstagramSaved(options: InstagramSyncOptions): Promise<InstagramSyncResult> {
  if (normalizeKind(options.kind) !== "saved") {
    throw new Error('Instagram sync kind must be "saved".');
  }

  const session = await getChromiumSession(options.browserId, options.profile, ["https://www.instagram.com/"], "Instagram");
  const scope = `${options.browserId}-${(options.profile ?? "Default").replaceAll(path.sep, "-")}-saved`;
  const rawSink = createJsonlSink("instagram", createTimestampedFileName(scope));
  emitProgress(options.onProgress, "bootstrap", "Loading Instagram account metadata");
  const username = await fetchInstagramUsername(session.cookieHeader);
  const requestContext: InstagramRequestContext = {
    cookieHeader: session.cookieHeader,
    username,
  };
  const collectionsById = await fetchSavedCollections(requestContext).catch(() => new Map<string, string>());
  const items: TroveItem[] = [];
  const seenIds = new Set<string>();
  const markerId = options.cursor;
  let apiCursor: string | undefined;
  let nextCursor: string | undefined;
  let pageNumber = 1;
  let stalledPages = 0;

  while (true) {
    emitProgress(options.onProgress, "page", `Fetching Instagram saved page ${pageNumber}`);
    const payload = await fetchSavedPostsPage(requestContext, apiCursor);
    const page = parseSavedPostsPayload(payload, collectionsById);
    let importedCount = 0;

    if (!apiCursor) {
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
        return nextCursor ? { items, rawPath: rawSink.path, nextCursor } : { items, rawPath: rawSink.path };
      }

      if (seenIds.has(item.externalId)) {
        continue;
      }

      items.push(item);
      seenIds.add(item.externalId);
      importedCount += 1;

      if (typeof options.limit === "number" && items.length >= options.limit) {
        return nextCursor ? { items, rawPath: rawSink.path, nextCursor } : { items, rawPath: rawSink.path };
      }
    }

    emitProgress(options.onProgress, "page", `Fetched Instagram saved page ${pageNumber}`, items.length);

    if (!page.nextPageCursor || page.items.length === 0) {
      break;
    }

    if (page.nextPageCursor === apiCursor) {
      break;
    }

    stalledPages = importedCount === 0 ? stalledPages + 1 : 0;

    if (stalledPages >= MAX_STALLED_PAGES) {
      break;
    }

    apiCursor = page.nextPageCursor;
    pageNumber += 1;
  }

  return nextCursor ? { items, rawPath: rawSink.path, nextCursor } : { items, rawPath: rawSink.path };
}

export async function validateInstagramSession(cookieHeader: string): Promise<void> {
  await fetchInstagramUsername(cookieHeader);
}

async function fetchInstagramUsername(cookieHeader: string): Promise<string> {
  const response = await fetch(new URL("/api/v1/accounts/edit/web_form_data/", INSTAGRAM_BASE_URL), {
    headers: buildInstagramHeaders(cookieHeader, `${INSTAGRAM_BASE_URL}/accounts/edit/`),
    method: "GET",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Instagram account request failed with ${response.status}: ${body.slice(0, 400)}`);
  }

  const payload = (await response.json()) as InstagramEditFormDataResponse;
  const username = cleanText(payload.form_data?.username);

  if (!username) {
    throw new Error("Could not determine the authenticated Instagram username from the web account settings response.");
  }

  return username;
}

async function fetchSavedCollections(context: InstagramRequestContext): Promise<Map<string, string>> {
  const params = new URLSearchParams();
  params.set("fb_api_caller_class", "RelayModern");
  params.set("fb_api_req_friendly_name", "PolarisProfileSavedTabContentQuery");
  params.set("server_timestamps", "true");
  params.set(
    "variables",
    JSON.stringify({
      collection_types: ["ALL_MEDIA_AUTO_COLLECTION", "MEDIA", "AUDIO_AUTO_COLLECTION"],
      count: COLLECTION_QUERY_COUNT,
      get_cover_media_lists: true,
    }),
  );
  params.set("doc_id", SAVED_COLLECTIONS_DOC_ID);

  const response = await fetch(new URL("/graphql/query", INSTAGRAM_BASE_URL), {
    headers: {
      ...buildInstagramHeaders(context.cookieHeader, `${INSTAGRAM_BASE_URL}/${context.username}/saved/`),
      "content-type": "application/x-www-form-urlencoded",
      "x-bloks-version-id": INSTAGRAM_BLOKS_VERSION_ID,
      "x-fb-friendly-name": "PolarisProfileSavedTabContentQuery",
      "x-root-field-name": "xdt_api__v1__collections__list_graphql_connection",
    },
    method: "POST",
    body: params,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Instagram saved collections request failed with ${response.status}: ${body.slice(0, 400)}`);
  }

  const payload = (await response.json()) as InstagramSavedCollectionsResponse;
  return parseSavedCollectionsPayload(payload);
}

async function fetchSavedPostsPage(context: InstagramRequestContext, pageCursor?: string): Promise<unknown> {
  const url = new URL("/api/v1/feed/saved/posts/", INSTAGRAM_BASE_URL);

  if (pageCursor) {
    url.searchParams.set("max_id", pageCursor);
  }

  const response = await fetch(url, {
    headers: buildInstagramHeaders(context.cookieHeader, `${INSTAGRAM_BASE_URL}/${context.username}/saved/all-posts/`),
    method: "GET",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Instagram saved posts request failed with ${response.status}: ${body.slice(0, 400)}`);
  }

  return response.json();
}

function parseSavedCollectionsPayload(payload: InstagramSavedCollectionsResponse): Map<string, string> {
  const map = new Map<string, string>();
  const edges = payload.data?.xdt_api__v1__collections__list_graphql_connection?.edges;

  for (const edge of Array.isArray(edges) ? edges : []) {
    const collectionId = cleanText(edge?.node?.collection_id);
    const collectionName = cleanText(edge?.node?.collection_name);

    if (!collectionId || !collectionName) {
      continue;
    }

    map.set(collectionId, collectionName);
  }

  return map;
}

function parseSavedPostsPayload(payload: unknown, collectionsById: Map<string, string>): ParsedSavedPostsPage {
  const data = payload as InstagramSavedPostsResponse | null;
  const items: TroveItem[] = [];
  const rawItems: Record<string, unknown>[] = [];

  for (const entry of Array.isArray(data?.items) ? data.items : []) {
    const media = entry?.media;
    const item = normalizeSavedMedia(media, collectionsById);

    if (!item) {
      continue;
    }

    items.push(item);
    rawItems.push(buildSavedRawRecord(media, collectionsById));
  }

  return cleanText(data?.next_max_id) ? { items, rawItems, nextPageCursor: cleanText(data?.next_max_id) as string } : { items, rawItems };
}

function normalizeSavedMedia(media: InstagramSavedMedia | undefined, collectionsById: Map<string, string>): TroveItem | null {
  const mediaId = cleanText(media?.pk) ?? cleanText(media?.id);
  const code = cleanText(media?.code);
  const url = buildInstagramMediaUrl(code, cleanText(media?.product_type), cleanText(media?.subtype_name_for_REST__));

  if (!mediaId || !code || !url) {
    return null;
  }

  const caption = cleanText(media?.caption?.text);
  const username = cleanText(media?.user?.username) ?? cleanText(media?.owner?.username);
  const fullName = cleanText(media?.user?.full_name) ?? cleanText(media?.owner?.full_name);
  const author = fullName ?? username;
  const collectionIds = Array.isArray(media?.saved_collection_ids) ? media.saved_collection_ids.map((value) => cleanText(value)).filter(Boolean) as string[] : [];
  const collectionNames = collectionIds.map((value) => collectionsById.get(value)).filter((value): value is string => Boolean(value));
  const savedAt = normalizeSavedTimestamp(media);
  const productType = cleanText(media?.product_type) ?? cleanText(media?.subtype_name_for_REST__) ?? "post";
  const titlePrefix = username ? `@${username}` : "Instagram saved";
  const fallbackTitle = `Instagram saved ${productLabel(productType)}${username ? ` by @${username}` : ""}`;

  const item: TroveItem = {
    source: "instagram",
    kind: "saved",
    externalId: `saved:${mediaId}`,
    title: caption ? `${titlePrefix}: ${truncate(caption, 80)}` : fallbackTitle,
    url,
    savedAt,
    tags: uniqueStrings(["instagram", "saved", productType, ...collectionNames]),
    raw: {
      platform: "instagram",
      kind: "saved",
      mediaId,
      code,
      productType,
      mediaType: typeof media?.media_type === "number" ? media.media_type : null,
      collectionIds,
      collectionNames,
      savedAtSource: inferSavedTimestampSource(media),
      takenAt: typeof media?.taken_at === "number" ? normalizeUnixSeconds(media.taken_at) : null,
      locationName: cleanText(media?.location?.name),
      likeCount: typeof media?.like_count === "number" ? media.like_count : null,
      commentCount: typeof media?.fb_comment_count === "number" ? media.fb_comment_count : null,
      playCount: typeof media?.play_count === "number" ? media.play_count : null,
      hasViewerSaved: media?.has_viewer_saved === true,
      username,
    },
  };

  if (caption) {
    item.excerpt = truncate(caption, 240);
    item.content = caption;
  }

  if (author) {
    item.author = author;
  }

  return item;
}

function buildSavedRawRecord(media: InstagramSavedMedia | undefined, collectionsById: Map<string, string>): Record<string, unknown> {
  const collectionIds = Array.isArray(media?.saved_collection_ids) ? media.saved_collection_ids.map((value) => cleanText(value)).filter(Boolean) as string[] : [];
  const collectionNames = collectionIds.map((value) => collectionsById.get(value)).filter((value): value is string => Boolean(value));
  const captionText = cleanText(media?.caption?.text);
  const code = cleanText(media?.code);
  const productType = cleanText(media?.product_type) ?? cleanText(media?.subtype_name_for_REST__);
  const musicInfo = media?.clips_metadata?.music_info?.music_asset_info;

  return {
    platform: "instagram",
    kind: "saved",
    mediaId: cleanText(media?.pk) ?? cleanText(media?.id),
    code,
    url: buildInstagramMediaUrl(code, productType, cleanText(media?.subtype_name_for_REST__)),
    username: cleanText(media?.user?.username) ?? cleanText(media?.owner?.username),
    fullName: cleanText(media?.user?.full_name) ?? cleanText(media?.owner?.full_name),
    captionText,
    takenAt: typeof media?.taken_at === "number" ? normalizeUnixSeconds(media.taken_at) : null,
    captionCreatedAt: typeof media?.caption?.created_at_utc === "number" ? normalizeUnixSeconds(media.caption.created_at_utc) : null,
    savedAtSource: inferSavedTimestampSource(media),
    productType,
    mediaType: typeof media?.media_type === "number" ? media.media_type : null,
    collectionIds,
    collectionNames,
    locationName: cleanText(media?.location?.name),
    location: media?.location
      ? {
          lat: typeof media.location.lat === "number" ? media.location.lat : null,
          lng: typeof media.location.lng === "number" ? media.location.lng : null,
        }
      : null,
    likeCount: typeof media?.like_count === "number" ? media.like_count : null,
    commentCount: typeof media?.fb_comment_count === "number" ? media.fb_comment_count : null,
    playCount: typeof media?.play_count === "number" ? media.play_count : null,
    videoDuration: typeof media?.video_duration === "number" ? media.video_duration : null,
    imageUrl: media?.image_versions2?.candidates?.[0]?.url ?? null,
    videoUrl: media?.video_versions?.[0]?.url ?? null,
    music:
      musicInfo && (cleanText(musicInfo.display_title) || cleanText(musicInfo.artist_name))
        ? {
            title: cleanText(musicInfo.display_title),
            artistName: cleanText(musicInfo.artist_name),
          }
        : null,
  };
}

function buildInstagramHeaders(
  cookieHeader: string,
  referer: string,
  overrides?: Record<string, string>,
): Record<string, string> {
  const cookies = parseCookieHeader(cookieHeader);
  const headers: Record<string, string> = {
    accept: "*/*",
    cookie: cookieHeader,
    referer,
    "user-agent": DEFAULT_USER_AGENT,
    "x-asbd-id": INSTAGRAM_ASBD_ID,
    "x-csrftoken": cookies.csrftoken ?? "",
    "x-ig-app-id": INSTAGRAM_APP_ID,
    "x-ig-www-claim": "0",
    "x-requested-with": "XMLHttpRequest",
    "x-web-session-id": DEFAULT_SESSION_ID,
  };

  if (cookies.ig_did) {
    headers["x-web-device-id"] = cookies.ig_did;
  }

  return overrides ? { ...headers, ...overrides } : headers;
}

function parseCookieHeader(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};

  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();

    if (!trimmed) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();

    if (key) {
      cookies[key] = value;
    }
  }

  return cookies;
}

function buildInstagramMediaUrl(code: string | null, productType?: string | null, subtypeName?: string | null): string | null {
  if (!code) {
    return null;
  }

  const normalizedProductType = (productType ?? "").toLowerCase();
  const normalizedSubtype = (subtypeName ?? "").toLowerCase();

  if (normalizedProductType === "clips" || normalizedSubtype.includes("clips")) {
    return `${INSTAGRAM_BASE_URL}/reel/${code}/`;
  }

  if (normalizedProductType === "igtv" || normalizedSubtype.includes("igtv")) {
    return `${INSTAGRAM_BASE_URL}/tv/${code}/`;
  }

  return `${INSTAGRAM_BASE_URL}/p/${code}/`;
}

function normalizeSavedTimestamp(media: InstagramSavedMedia | undefined): string {
  if (typeof media?.taken_at === "number") {
    return normalizeUnixSeconds(media.taken_at);
  }

  if (typeof media?.caption?.created_at_utc === "number") {
    return normalizeUnixSeconds(media.caption.created_at_utc);
  }

  return new Date().toISOString();
}

function inferSavedTimestampSource(media: InstagramSavedMedia | undefined): string {
  if (typeof media?.taken_at === "number") {
    return "media.taken_at";
  }

  if (typeof media?.caption?.created_at_utc === "number") {
    return "media.caption.created_at_utc";
  }

  return "imported_at";
}

function normalizeUnixSeconds(value: number): string {
  return new Date(value * 1000).toISOString();
}

function productLabel(productType: string): string {
  if (productType === "clips") {
    return "reel";
  }

  if (productType === "igtv") {
    return "video";
  }

  return "post";
}

function cleanText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function truncate(value: string, length: number): string {
  if (value.length <= length) {
    return value;
  }

  return `${value.slice(0, Math.max(0, length - 1)).trimEnd()}…`;
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

function normalizeKind(kind?: string): "saved" {
  if (!kind || kind === "saved") {
    return "saved";
  }

  throw new Error(`Unsupported Instagram sync kind "${kind}".`);
}

function emitProgress(
  onProgress: ProgressHandler | undefined,
  phase: string,
  message: string,
  completed?: number,
): void {
  onProgress?.(
    completed === undefined
      ? {
          phase,
          message,
        }
      : {
          phase,
          message,
          completed,
        },
  );
}

export const __internal = {
  buildInstagramHeaders,
  buildInstagramMediaUrl,
  parseCookieHeader,
  parseSavedCollectionsPayload,
  parseSavedPostsPayload,
};

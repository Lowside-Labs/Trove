import fs from "node:fs";
import path from "node:path";
import { chromium, type Browser, type Page } from "playwright-core";
import {
  findChromiumTab,
  fetchJsonFromGoogleChromeTab,
  type GoogleChromeFetchResponse,
  type GoogleChromeTabTarget,
} from "../auth/google-chrome.js";
import { isRateLimitError, retryTask, settleConcurrently } from "../core/async.js";
import { ensureTroveDirs } from "../core/fs.js";
import { createJsonlSink, createTimestampedFileName } from "../core/raw.js";
import type { ProgressHandler } from "../core/progress.js";
import type { TroveItem } from "../types/item.js";
import type { SupportedBrowserId } from "../types/browser.js";

const DEFAULT_CDP_URL = "http://127.0.0.1:9222";
const CHATGPT_HOME_URL = "https://chatgpt.com/";
const CHATGPT_HOST = "chatgpt.com";
const LIST_PAGE_SIZE = 28;
const MAX_STALLED_LIST_PAGES = 3;
const RECENT_REFRESH_LIMIT = 10;
const DETAIL_CONCURRENCY = 3;
const DETAIL_RETRIES = 2;

interface ChatGptSyncOptions {
  browser?: SupportedBrowserId;
  cdpUrl?: string;
  sessionMode?: "cdp" | "chrome-live";
  limit?: number;
  cursor?: string;
  onProgress?: ProgressHandler;
}

export interface ChatGptSyncResult {
  items: TroveItem[];
  rawPath: string;
  contentPath: string;
  nextCursor?: string;
}

interface ChatGptCapturedHeaders {
  baseHeaders: Record<string, string>;
}

interface ChatGptFetchResponse {
  ok: boolean;
  status: number;
  url: string;
  body: unknown;
}

interface ChatGptConversationSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  excerpt?: string;
  raw: Record<string, unknown>;
}

interface ChatGptConversationDetail {
  id: string;
  title: string;
  url: string;
  createdAt: string;
  updatedAt: string;
  currentNode?: string;
  defaultModel?: string;
  messages: ChatGptMessage[];
  raw: Record<string, unknown>;
}

interface ChatGptMessage {
  id: string;
  role: string;
  createdAt?: string;
  updatedAt?: string;
  recipient?: string;
  contentType: string;
  isHidden: boolean;
  parts: ChatGptContentPart[];
  raw: Record<string, unknown>;
}

type ChatGptContentPart =
  | { kind: "text"; text: string }
  | { kind: "image"; description: string; raw: Record<string, unknown> }
  | { kind: "unknown"; value: unknown };

export async function syncChatGptChats(options: ChatGptSyncOptions): Promise<ChatGptSyncResult> {
  const rawSink = createJsonlSink("chatgpt", createTimestampedFileName("live-browser"));
  const paths = ensureTroveDirs();
  const contentDir = path.join(paths.contentDir, "chatgpt");
  fs.mkdirSync(contentDir, { recursive: true });

  if (options.sessionMode === "chrome-live") {
    return syncChatGptChatsFromChromeTab(rawSink, contentDir, options);
  }

  const cdpUrl = options.cdpUrl?.trim() || DEFAULT_CDP_URL;
  emitProgress(
    options.onProgress,
    "bootstrap",
    `Attaching to ChatGPT browser session at ${cdpUrl}`,
  );
  const browser = await connectToChatGptCdp(cdpUrl);
  const page = await openChatGptPage(browser);

  try {
    emitProgress(options.onProgress, "bootstrap", "Capturing ChatGPT session headers");
    const capturedHeaders = await captureConversationHeaders(page);
    const hybrid = await collectHybridSummaries({
      cursor: options.cursor,
      limit: options.limit,
      onProgress: options.onProgress,
      sourceLabel: "ChatGPT",
      fetchSummaries: (requestedLimit, startOffset) =>
        fetchConversationSummaries(
          page,
          capturedHeaders,
          requestedLimit,
          rawSink,
          options.onProgress,
          startOffset,
        ),
    });
    const { items, succeededSummaryIds } = await buildConversationItems({
      summaries: hybrid.summaries,
      sourceLabel: "ChatGPT",
      onProgress: options.onProgress,
      worker: async (summary) => {
        const detailResponse = await retryTask({
          retries: DETAIL_RETRIES,
          shouldRetry: isRateLimitError,
          task: async () => {
            const response = await fetchChatGptJson(
              page,
              capturedHeaders,
              `/backend-api/conversation/${summary.id}`,
              `/backend-api/conversation/${summary.id}`,
              "/backend-api/conversation/[id]",
            );
            assertSuccessfulResponse(response, `ChatGPT conversation ${summary.id}`);
            return response;
          },
        });

        return createConversationItem(summary, detailResponse, rawSink, contentDir);
      },
    });

    const nextCursor = resolveHybridNextCursor(hybrid, succeededSummaryIds);

    return {
      items,
      rawPath: rawSink.path,
      contentPath: contentDir,
      ...(nextCursor ? { nextCursor } : {}),
    };
  } finally {
    await page.close().catch(() => undefined);
  }
}

async function openChatGptPage(browser: Browser): Promise<Page> {
  const context = browser.contexts()[0];

  if (!context) {
    throw new Error("No browser context was found in the attached Chrome session.");
  }

  const page = await context.newPage();
  await page.goto(CHATGPT_HOME_URL, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForLoadState("domcontentloaded");
  return page;
}

async function captureConversationHeaders(page: Page): Promise<ChatGptCapturedHeaders> {
  const conversationResponse = await page
    .waitForResponse(
      (response) =>
        response.url().includes("/backend-api/conversations?") && response.status() === 200,
      { timeout: 60_000 },
    )
    .catch(() => null);

  if (!conversationResponse) {
    const bodyText = await page
      .locator("body")
      .innerText()
      .catch(() => "");

    if (/log in|sign up for free/i.test(bodyText)) {
      throw new Error("ChatGPT is not logged in in the attached Chrome session.");
    }

    throw new Error(
      "Could not capture the ChatGPT conversations request from the live browser session.",
    );
  }

  const allHeaders = await conversationResponse.request().allHeaders();
  const baseHeaders: Record<string, string> = {};

  for (const [key, value] of Object.entries(allHeaders)) {
    if (key.startsWith(":")) {
      continue;
    }

    if (
      [
        "cookie",
        "host",
        "content-length",
        "priority",
        "sec-fetch-dest",
        "sec-fetch-mode",
        "sec-fetch-site",
        "referer",
      ].includes(key)
    ) {
      continue;
    }

    baseHeaders[key] = value;
  }

  if (!baseHeaders.authorization) {
    throw new Error("The captured ChatGPT request did not include an authorization header.");
  }

  return { baseHeaders };
}

async function syncChatGptChatsFromChromeTab(
  rawSink: ReturnType<typeof createJsonlSink>,
  contentDir: string,
  options: ChatGptSyncOptions,
): Promise<ChatGptSyncResult> {
  const browserId = options.browser ?? "chrome";
  emitProgress(
    options.onProgress,
    "bootstrap",
    `Finding the active ${browserId} ChatGPT tab`,
  );
  const tab = await findChromiumTab(browserId, [CHATGPT_HOST]);

  if (!tab) {
    throw new Error(`No open ${browserId} tab for ChatGPT was found.`);
  }

  emitProgress(
    options.onProgress,
    "bootstrap",
    `Reading ChatGPT session from the active ${browserId} tab`,
  );
  const accessToken = await readChatGptAccessToken(tab);
  const hybrid = await collectHybridSummaries({
    cursor: options.cursor,
    limit: options.limit,
    onProgress: options.onProgress,
    sourceLabel: "ChatGPT",
    fetchSummaries: (requestedLimit, startOffset) =>
      fetchConversationSummariesFromChromeTab(
        tab,
        accessToken,
        requestedLimit,
        rawSink,
        options.onProgress,
        startOffset,
      ),
  });
  const { items, succeededSummaryIds } = await buildConversationItems({
    summaries: hybrid.summaries,
    sourceLabel: "ChatGPT",
    onProgress: options.onProgress,
    worker: async (summary) => {
      const detailResponse = await retryTask({
        retries: DETAIL_RETRIES,
        shouldRetry: isRateLimitError,
        task: async () => {
          const response = await fetchChatGptJsonFromChromeTab(
            tab,
            accessToken,
            `/backend-api/conversation/${summary.id}`,
            `/backend-api/conversation/${summary.id}`,
            "/backend-api/conversation/[id]",
          );
          assertSuccessfulResponse(response, `ChatGPT conversation ${summary.id}`);
          return response;
        },
      });

      return createConversationItem(summary, detailResponse, rawSink, contentDir);
    },
  });

  const nextCursor = resolveHybridNextCursor(hybrid, succeededSummaryIds);

  return {
    items,
    rawPath: rawSink.path,
    contentPath: contentDir,
    ...(nextCursor ? { nextCursor } : {}),
  };
}

async function connectToChatGptCdp(cdpUrl: string): Promise<Browser> {
  try {
    return await chromium.connectOverCDP(cdpUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes("ECONNREFUSED")) {
      throw new Error(
        `No attachable browser was found at ${cdpUrl}. Start a Chromium browser with remote debugging enabled there, or run \`trove sync chatgpt --browser chrome\` to let Trove launch one for you.`,
      );
    }

    throw error;
  }
}

async function fetchConversationSummaries(
  page: Page,
  capturedHeaders: ChatGptCapturedHeaders,
  requestedLimit: number | undefined,
  rawSink: ReturnType<typeof createJsonlSink>,
  onProgress?: ProgressHandler,
  startOffset = 0,
): Promise<ChatGptConversationSummary[]> {
  const summaries: ChatGptConversationSummary[] = [];
  const seenIds = new Set<string>();
  let offset = startOffset;
  let total: number | null = null;
  let pageNumber = 1;
  let stalledPages = 0;

  while (requestedLimit === undefined || summaries.length < requestedLimit) {
    emitProgress(
      onProgress,
      "page",
      `Fetching ChatGPT conversations page ${pageNumber}`,
      summaries.length,
      total ?? undefined,
    );
    const requestPath = `/backend-api/conversations?offset=${offset}&limit=${LIST_PAGE_SIZE}&order=updated&is_archived=false&is_starred=false`;
    const response = await fetchChatGptJson(
      page,
      capturedHeaders,
      requestPath,
      "/backend-api/conversations",
      "/backend-api/conversations",
    );
    assertSuccessfulResponse(response, `ChatGPT conversation list page at offset ${offset}`);

    rawSink.append({
      kind: "list",
      offset,
      payload: response.body as Record<string, unknown>,
    });

    const payload = asRecord(response.body);
    const pageSummaries = readConversationSummaries(payload);
    let importedCount = 0;

    for (const summary of pageSummaries) {
      if (seenIds.has(summary.id)) {
        continue;
      }

      summaries.push(summary);
      seenIds.add(summary.id);
      importedCount += 1;
    }

    total = readFiniteNumber(payload?.total) ?? total;

    if (pageSummaries.length === 0) {
      break;
    }

    stalledPages = importedCount === 0 ? stalledPages + 1 : 0;

    if (stalledPages >= MAX_STALLED_LIST_PAGES) {
      break;
    }

    offset += pageSummaries.length;
    emitProgress(
      onProgress,
      "page",
      `Fetched ChatGPT conversations page ${pageNumber}`,
      summaries.length,
      total ?? undefined,
    );
    pageNumber += 1;

    if (total !== null && offset >= total) {
      break;
    }
  }

  return requestedLimit === undefined ? summaries : summaries.slice(0, requestedLimit);
}

async function fetchConversationSummariesFromChromeTab(
  tab: GoogleChromeTabTarget,
  accessToken: string,
  requestedLimit: number | undefined,
  rawSink: ReturnType<typeof createJsonlSink>,
  onProgress?: ProgressHandler,
  startOffset = 0,
): Promise<ChatGptConversationSummary[]> {
  const summaries: ChatGptConversationSummary[] = [];
  const seenIds = new Set<string>();
  let offset = startOffset;
  let total: number | null = null;
  let pageNumber = 1;
  let stalledPages = 0;

  while (requestedLimit === undefined || summaries.length < requestedLimit) {
    emitProgress(
      onProgress,
      "page",
      `Fetching ChatGPT conversations page ${pageNumber}`,
      summaries.length,
      total ?? undefined,
    );
    const requestPath = `/backend-api/conversations?offset=${offset}&limit=${LIST_PAGE_SIZE}&order=updated&is_archived=false&is_starred=false`;
    const response = await fetchChatGptJsonFromChromeTab(
      tab,
      accessToken,
      requestPath,
      "/backend-api/conversations",
      "/backend-api/conversations",
    );
    assertSuccessfulResponse(response, `ChatGPT conversation list page at offset ${offset}`);

    rawSink.append({
      kind: "list",
      offset,
      payload: response.body as Record<string, unknown>,
    });

    const payload = asRecord(response.body);
    const pageSummaries = readConversationSummaries(payload);
    let importedCount = 0;

    for (const summary of pageSummaries) {
      if (seenIds.has(summary.id)) {
        continue;
      }

      summaries.push(summary);
      seenIds.add(summary.id);
      importedCount += 1;
    }

    total = readFiniteNumber(payload?.total) ?? total;

    if (pageSummaries.length === 0) {
      break;
    }

    stalledPages = importedCount === 0 ? stalledPages + 1 : 0;

    if (stalledPages >= MAX_STALLED_LIST_PAGES) {
      break;
    }

    offset += pageSummaries.length;
    emitProgress(
      onProgress,
      "page",
      `Fetched ChatGPT conversations page ${pageNumber}`,
      summaries.length,
      total ?? undefined,
    );
    pageNumber += 1;

    if (total !== null && offset >= total) {
      break;
    }
  }

  return requestedLimit === undefined ? summaries : summaries.slice(0, requestedLimit);
}

async function fetchChatGptJson(
  page: Page,
  capturedHeaders: ChatGptCapturedHeaders,
  requestPath: string,
  targetPath: string,
  targetRoute: string,
): Promise<ChatGptFetchResponse> {
  return page.evaluate(
    async ({ relativePath, baseHeaders, targetPathValue, targetRouteValue }) => {
      const headers: Record<string, string> = {
        ...baseHeaders,
        "x-openai-target-path": targetPathValue,
        "x-openai-target-route": targetRouteValue,
      };

      const response = await fetch(relativePath, {
        credentials: "include",
        headers,
      });
      const text = await response.text();

      try {
        return {
          ok: response.ok,
          status: response.status,
          url: response.url,
          body: JSON.parse(text) as unknown,
        };
      } catch {
        return {
          ok: response.ok,
          status: response.status,
          url: response.url,
          body: text,
        };
      }
    },
    {
      relativePath: requestPath,
      baseHeaders: capturedHeaders.baseHeaders,
      targetPathValue: targetPath,
      targetRouteValue: targetRoute,
    },
  );
}

async function fetchChatGptJsonFromChromeTab(
  tab: GoogleChromeTabTarget,
  accessToken: string,
  requestPath: string,
  targetPath: string,
  targetRoute: string,
): Promise<GoogleChromeFetchResponse> {
  return fetchJsonFromGoogleChromeTab(tab, {
    path: requestPath,
    headers: {
      accept: "application/json",
      authorization: `Bearer ${accessToken}`,
      "x-openai-target-path": targetPath,
      "x-openai-target-route": targetRoute,
    },
  });
}

async function readChatGptAccessToken(tab: GoogleChromeTabTarget): Promise<string> {
  const browserLabel = tab.appName ?? "active Chromium";
  const response = await fetchJsonFromGoogleChromeTab(tab, {
    path: "/api/auth/session",
    headers: {
      accept: "application/json",
    },
  });

  assertSuccessfulResponse(response, "ChatGPT session request");
  const payload = asRecord(response.body);
  const accessToken = readString(payload ?? {}, "accessToken");

  if (!accessToken) {
    throw new Error(
      `ChatGPT session did not include an access token in the active ${browserLabel} tab.`,
    );
  }

  return accessToken;
}

function assertSuccessfulResponse(response: ChatGptFetchResponse, label: string) {
  if (response.ok) {
    return;
  }

  const preview =
    typeof response.body === "string"
      ? response.body.slice(0, 200)
      : JSON.stringify(response.body).slice(0, 200);
  throw new Error(`${label} failed with ${response.status}: ${preview}`);
}

function readConversationSummaries(
  payload: Record<string, unknown> | null,
): ChatGptConversationSummary[] {
  const items = payload?.items;

  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((entry) => toConversationSummary(asRecord(entry)))
    .filter((entry): entry is ChatGptConversationSummary => entry !== null);
}

function toConversationSummary(
  record: Record<string, unknown> | null,
): ChatGptConversationSummary | null {
  if (!record) {
    return null;
  }

  const id = readString(record, "id");

  if (!id) {
    return null;
  }

  const title = readString(record, "title") ?? `ChatGPT chat ${id.slice(0, 8)}`;
  const createdAt = toIsoString(record.create_time);
  const updatedAt = toIsoString(record.update_time ?? record.create_time);
  const excerpt = readString(record, "snippet");

  return {
    id,
    title,
    createdAt,
    updatedAt,
    ...(excerpt ? { excerpt } : {}),
    raw: record,
  };
}

function parseConversationDetail(payload: unknown): ChatGptConversationDetail {
  const record = asRecord(payload);

  if (!record) {
    throw new Error("ChatGPT conversation detail payload was not an object.");
  }

  const id = readString(record, "conversation_id");

  if (!id) {
    throw new Error("ChatGPT conversation detail payload was missing conversation_id.");
  }

  const title = readString(record, "title") ?? "Untitled ChatGPT chat";
  const defaultModel = readString(record, "default_model_slug");
  const currentNode = readString(record, "current_node");

  return {
    id,
    title,
    url: `https://chatgpt.com/c/${id}`,
    createdAt: toIsoString(record.create_time),
    updatedAt: toIsoString(record.update_time ?? record.create_time),
    ...(currentNode ? { currentNode } : {}),
    ...(defaultModel ? { defaultModel } : {}),
    messages: readMessagesFromCurrentBranch(record),
    raw: record,
  };
}

async function buildConversationItems({
  summaries,
  sourceLabel,
  onProgress,
  worker,
}: {
  summaries: ChatGptConversationSummary[];
  sourceLabel: string;
  onProgress: ProgressHandler | undefined;
  worker(summary: ChatGptConversationSummary): Promise<TroveItem>;
}): Promise<{ items: TroveItem[]; succeededSummaryIds: Set<string> }> {
  const total = summaries.length;
  let completed = 0;

  const results = await settleConcurrently({
    items: summaries,
    concurrency: DETAIL_CONCURRENCY,
    worker: async (summary, index) => {
      emitProgress(
        onProgress,
        "detail",
        `Fetching ${sourceLabel} conversation ${index + 1}`,
        completed,
        total,
      );
      const item = await worker(summary);
      completed += 1;
      emitProgress(
        onProgress,
        "detail",
        `Rendered ${sourceLabel} conversation ${completed}`,
        completed,
        total,
      );
      return item;
    },
  });

  const items = results
    .filter((result): result is PromiseFulfilledResult<TroveItem> => result.status === "fulfilled")
    .map((result) => result.value);
  const succeededSummaryIds = new Set(items.map((item) => item.externalId));
  const failures = results.filter(
    (result): result is PromiseRejectedResult => result.status === "rejected",
  );

  if (items.length === 0 && failures.length > 0) {
    throw failures[0]!.reason;
  }

  if (failures.length > 0) {
    emitProgress(
      onProgress,
      "detail",
      `Skipped ${failures.length} ${sourceLabel} conversation${failures.length === 1 ? "" : "s"} after retries`,
      items.length,
      total,
    );
  }

  return { items, succeededSummaryIds };
}

function createConversationItem(
  summary: ChatGptConversationSummary,
  detailResponse: ChatGptFetchResponse | GoogleChromeFetchResponse,
  rawSink: ReturnType<typeof createJsonlSink>,
  contentDir: string,
): TroveItem {
  const detail = parseConversationDetail(detailResponse.body);
  rawSink.append({
    kind: "detail",
    conversationId: summary.id,
    payload: detailResponse.body as Record<string, unknown>,
  });

  const markdown = renderConversationMarkdown(detail);
  const markdownPath = writeConversationMarkdown(contentDir, detail, markdown);
  return toTroveItem(summary, detail, markdown, markdownPath);
}

function readMessagesFromCurrentBranch(record: Record<string, unknown>): ChatGptMessage[] {
  const mapping = asRecord(record.mapping);
  const currentNode = readString(record, "current_node");

  if (!mapping || !currentNode) {
    return [];
  }

  const branch: ChatGptMessage[] = [];
  let nodeId: string | undefined = currentNode;

  while (nodeId) {
    const node = asRecord(mapping[nodeId]);

    if (!node) {
      break;
    }

    const message = toChatGptMessage(asRecord(node.message));

    if (message) {
      branch.push(message);
    }

    nodeId = readString(node, "parent");
  }

  return branch.reverse();
}

function toChatGptMessage(record: Record<string, unknown> | null): ChatGptMessage | null {
  if (!record) {
    return null;
  }

  const id = readString(record, "id");
  const author = asRecord(record.author);
  const role = readString(author ?? {}, "role");
  const content = asRecord(record.content);
  const contentType = readString(content ?? {}, "content_type") ?? "unknown";

  if (!id || !role || !content) {
    return null;
  }

  const createdAt = readFiniteDate(record.create_time);
  const updatedAt = readFiniteDate(record.update_time);
  const recipient = readString(record, "recipient");

  return {
    id,
    role,
    ...(createdAt ? { createdAt } : {}),
    ...(updatedAt ? { updatedAt } : {}),
    ...(recipient ? { recipient } : {}),
    contentType,
    isHidden: asRecord(record.metadata)?.is_visually_hidden_from_conversation === true,
    parts: readContentParts(content),
    raw: record,
  };
}

function readContentParts(content: Record<string, unknown>): ChatGptContentPart[] {
  const contentType = readString(content, "content_type") ?? "unknown";

  if (contentType === "code") {
    const text = readString(content, "text");
    if (!text) {
      return [];
    }

    const language = readString(content, "language") ?? "";
    const fenced = [`\`\`\`${language}`, text, "```"].join("\n");
    return [{ kind: "text", text: fenced }];
  }

  const parts = Array.isArray(content.parts) ? content.parts : [];

  return parts
    .map((part) => toContentPart(part))
    .filter((part): part is ChatGptContentPart => part !== null);
}

function toContentPart(value: unknown): ChatGptContentPart | null {
  if (typeof value === "string") {
    return value.trim().length > 0 ? { kind: "text", text: normalizeMarkdownText(value) } : null;
  }

  const record = asRecord(value);

  if (!record) {
    return { kind: "unknown", value };
  }

  const contentType = readString(record, "content_type") ?? readString(record, "type") ?? "unknown";

  if (contentType === "image_asset_pointer") {
    const width = readFiniteNumber(record.width);
    const height = readFiniteNumber(record.height);
    const sizeBytes = readFiniteNumber(record.size_bytes);
    const descriptor: string[] = ["Image attachment"];

    if (width && height) {
      descriptor.push(`${width}x${height}`);
    }

    if (sizeBytes) {
      descriptor.push(`${sizeBytes} bytes`);
    }

    return {
      kind: "image",
      description: descriptor.join(", "),
      raw: record,
    };
  }

  const text = firstString(record, ["text", "caption", "title"]);

  if (text) {
    return { kind: "text", text: normalizeMarkdownText(text) };
  }

  return { kind: "unknown", value };
}

function renderConversationMarkdown(detail: ChatGptConversationDetail): string {
  const lines: string[] = [];

  lines.push(`# ${detail.title}`);
  lines.push("");
  lines.push(`- URL: ${detail.url}`);
  lines.push(`- Created: ${detail.createdAt}`);
  lines.push(`- Updated: ${detail.updatedAt}`);

  if (detail.defaultModel) {
    lines.push(`- Model: ${detail.defaultModel}`);
  }

  lines.push("");

  for (const message of detail.messages) {
    if (!shouldRenderMessage(message)) {
      continue;
    }

    const renderedParts = message.parts
      .map(renderMessagePart)
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0);

    if (renderedParts.length === 0) {
      continue;
    }

    lines.push(`## ${formatRole(message.role)}`);
    lines.push("");

    if (message.createdAt) {
      lines.push(`_Created: ${message.createdAt}_`);
      lines.push("");
    }

    for (const rendered of renderedParts) {
      lines.push(rendered.trimEnd());
      lines.push("");
    }
  }

  return `${lines.join("\n").trim()}\n`;
}

function shouldRenderMessage(message: ChatGptMessage): boolean {
  if (message.isHidden) {
    return false;
  }

  if (message.role !== "user" && message.role !== "assistant") {
    return false;
  }

  if (
    ["thoughts", "reasoning_recap", "user_editable_context", "model_editable_context"].includes(
      message.contentType,
    )
  ) {
    return false;
  }

  return true;
}

function renderMessagePart(part: ChatGptContentPart): string | null {
  if (part.kind === "text") {
    return part.text;
  }

  if (part.kind === "image") {
    return `_Attached image: ${part.description}_`;
  }

  return null;
}

function formatRole(role: string): string {
  if (role === "user") {
    return "User";
  }

  if (role === "assistant") {
    return "ChatGPT";
  }

  return role.charAt(0).toUpperCase() + role.slice(1);
}

function normalizeMarkdownText(value: string): string {
  return value.replace(/\r\n/g, "\n").trim();
}

function writeConversationMarkdown(
  contentDir: string,
  detail: ChatGptConversationDetail,
  markdown: string,
): string {
  const fileName = `${slugify(detail.title)}-${detail.id}.md`;
  const outputPath = path.join(contentDir, fileName);
  fs.writeFileSync(outputPath, markdown, "utf8");
  return outputPath;
}

function slugify(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return normalized.length > 0 ? normalized : "chatgpt-chat";
}

function toTroveItem(
  summary: ChatGptConversationSummary,
  detail: ChatGptConversationDetail,
  markdown: string,
  markdownPath: string,
): TroveItem {
  return {
    source: "chatgpt",
    kind: "chat",
    externalId: detail.id,
    title: detail.title,
    url: detail.url,
    savedAt: detail.updatedAt,
    ...(summary.excerpt ? { excerpt: summary.excerpt } : {}),
    content: markdown,
    tags: ["chatgpt", "chat"],
    raw: {
      ...detail.raw,
      markdownPath,
    },
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function firstString(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = readString(record, key);

    if (value) {
      return value;
    }
  }

  return undefined;
}

function readFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readFiniteDate(value: unknown): string | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    const milliseconds = value > 1_000_000_000_000 ? value : value * 1000;
    return new Date(milliseconds).toISOString();
  }

  if (typeof value === "string" && value.length > 0) {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) {
      return new Date(parsed).toISOString();
    }
  }

  return undefined;
}

function toIsoString(value: unknown): string {
  return readFiniteDate(value) ?? new Date().toISOString();
}

function emitProgress(
  onProgress: ProgressHandler | undefined,
  phase: string,
  message: string,
  completed?: number,
  total?: number,
): void {
  onProgress?.(
    total !== undefined && completed !== undefined
      ? {
          phase,
          message,
          completed,
          total,
        }
      : completed !== undefined
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

interface HybridSummaryCollectionArgs {
  fetchSummaries(
    requestedLimit: number | undefined,
    startOffset?: number,
  ): Promise<ChatGptConversationSummary[]>;
  limit: number | undefined;
  cursor: string | undefined;
  onProgress: ProgressHandler | undefined;
  sourceLabel: string;
}

async function collectHybridSummaries({
  fetchSummaries,
  limit,
  cursor,
  onProgress,
  sourceLabel,
}: HybridSummaryCollectionArgs): Promise<{
  summaries: ChatGptConversationSummary[];
  existingCursor: number;
  backfillOffset: number;
  backfillSummaries: ChatGptConversationSummary[];
  recentSummaries: ChatGptConversationSummary[];
}> {
  if (limit === undefined) {
    return {
      summaries: await fetchSummaries(undefined, 0),
      existingCursor: 0,
      backfillOffset: 0,
      backfillSummaries: [],
      recentSummaries: [],
    };
  }

  const existingCursor = parseStoredOffset(cursor) ?? 0;
  const recentLimit = resolveRecentRefreshLimit(limit);
  emitProgress(onProgress, "page", `Refreshing recent ${sourceLabel} conversations`);
  const recentSummaries = await fetchSummaries(recentLimit, 0);
  const remainingLimit = Math.max(0, limit - recentSummaries.length);
  const backfillOffset = Math.max(existingCursor, recentSummaries.length);

  if (remainingLimit === 0) {
    return {
      summaries: recentSummaries,
      existingCursor,
      backfillOffset,
      backfillSummaries: [],
      recentSummaries,
    };
  }

  emitProgress(onProgress, "page", `Continuing older ${sourceLabel} conversations`);
  const backfillSummaries = await fetchSummaries(remainingLimit, backfillOffset);

  return {
    summaries: mergeSummaries(recentSummaries, backfillSummaries, limit),
    existingCursor,
    backfillOffset,
    backfillSummaries,
    recentSummaries,
  };
}

function resolveHybridNextCursor(
  hybrid: {
    existingCursor: number;
    backfillOffset: number;
    backfillSummaries: ChatGptConversationSummary[];
    recentSummaries: ChatGptConversationSummary[];
  },
  succeededSummaryIds: Set<string>,
): string {
  if (hybrid.backfillSummaries.length === 0) {
    return String(Math.max(hybrid.existingCursor, hybrid.recentSummaries.length));
  }

  return String(hybrid.backfillOffset + countSuccessfulBackfillPrefix(hybrid.backfillSummaries, succeededSummaryIds));
}

function countSuccessfulBackfillPrefix(
  backfillSummaries: ChatGptConversationSummary[],
  succeededSummaryIds: Set<string>,
): number {
  let count = 0;

  for (const summary of backfillSummaries) {
    if (!succeededSummaryIds.has(summary.id)) {
      break;
    }

    count += 1;
  }

  return count;
}

function mergeSummaries(
  recentSummaries: ChatGptConversationSummary[],
  backfillSummaries: ChatGptConversationSummary[],
  limit: number,
): ChatGptConversationSummary[] {
  const merged: ChatGptConversationSummary[] = [];
  const seenIds = new Set<string>();

  for (const summary of [...recentSummaries, ...backfillSummaries]) {
    if (seenIds.has(summary.id)) {
      continue;
    }

    merged.push(summary);
    seenIds.add(summary.id);

    if (merged.length >= limit) {
      break;
    }
  }

  return merged;
}

function resolveRecentRefreshLimit(limit: number): number {
  return Math.min(limit, RECENT_REFRESH_LIMIT);
}

function parseStoredOffset(cursor?: string): number | undefined {
  if (!cursor) {
    return undefined;
  }

  const parsed = Number(cursor);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

export const __internal = {
  countSuccessfulBackfillPrefix,
  parseStoredOffset,
  resolveHybridNextCursor,
  resolveRecentRefreshLimit,
};

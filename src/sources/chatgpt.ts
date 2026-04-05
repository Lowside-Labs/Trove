import fs from "node:fs";
import path from "node:path";
import { chromium, type Browser, type Page } from "playwright-core";
import { ensureTroveDirs } from "../core/fs.js";
import { createJsonlSink, createTimestampedFileName } from "../core/raw.js";
import type { TroveItem } from "../types/item.js";

const DEFAULT_CDP_URL = "http://127.0.0.1:9222";
const CHATGPT_HOME_URL = "https://chatgpt.com/";
const CHATGPT_HOST = "chatgpt.com";
const LIST_PAGE_SIZE = 28;

interface ChatGptSyncOptions {
  cdpUrl?: string;
  limit?: number;
}

export interface ChatGptSyncResult {
  items: TroveItem[];
  rawPath: string;
  contentPath: string;
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
  const cdpUrl = options.cdpUrl?.trim() || DEFAULT_CDP_URL;
  const rawSink = createJsonlSink("chatgpt", createTimestampedFileName("live-browser"));
  const paths = ensureTroveDirs();
  const contentDir = path.join(paths.contentDir, "chatgpt");
  fs.mkdirSync(contentDir, { recursive: true });

  const browser = await chromium.connectOverCDP(cdpUrl);
  const page = await openChatGptPage(browser);

  try {
    const capturedHeaders = await captureConversationHeaders(page);
    const summaries = await fetchConversationSummaries(page, capturedHeaders, options.limit, rawSink);
    const items: TroveItem[] = [];

    for (const summary of summaries) {
      const detailResponse = await fetchChatGptJson(
        page,
        capturedHeaders,
        `/backend-api/conversation/${summary.id}`,
        `/backend-api/conversation/${summary.id}`,
        "/backend-api/conversation/[id]",
      );
      assertSuccessfulResponse(detailResponse, `ChatGPT conversation ${summary.id}`);

      const detail = parseConversationDetail(detailResponse.body);
      rawSink.append({
        kind: "detail",
        conversationId: summary.id,
        payload: detailResponse.body as Record<string, unknown>,
      });

      const markdown = renderConversationMarkdown(detail);
      const markdownPath = writeConversationMarkdown(contentDir, detail, markdown);
      items.push(toTroveItem(summary, detail, markdown, markdownPath));
    }

    return {
      items,
      rawPath: rawSink.path,
      contentPath: contentDir,
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
      (response) => response.url().includes("/backend-api/conversations?") && response.status() === 200,
      { timeout: 60_000 },
    )
    .catch(() => null);

  if (!conversationResponse) {
    const bodyText = await page.locator("body").innerText().catch(() => "");

    if (/log in|sign up for free/i.test(bodyText)) {
      throw new Error("ChatGPT is not logged in in the attached Chrome session.");
    }

    throw new Error("Could not capture the ChatGPT conversations request from the live browser session.");
  }

  const allHeaders = await conversationResponse.request().allHeaders();
  const baseHeaders: Record<string, string> = {};

  for (const [key, value] of Object.entries(allHeaders)) {
    if (key.startsWith(":")) {
      continue;
    }

    if (["cookie", "host", "content-length", "priority", "sec-fetch-dest", "sec-fetch-mode", "sec-fetch-site", "referer"].includes(key)) {
      continue;
    }

    baseHeaders[key] = value;
  }

  if (!baseHeaders.authorization) {
    throw new Error("The captured ChatGPT request did not include an authorization header.");
  }

  return { baseHeaders };
}

async function fetchConversationSummaries(
  page: Page,
  capturedHeaders: ChatGptCapturedHeaders,
  requestedLimit: number | undefined,
  rawSink: ReturnType<typeof createJsonlSink>,
): Promise<ChatGptConversationSummary[]> {
  const summaries: ChatGptConversationSummary[] = [];
  let offset = 0;
  let total: number | null = null;

  while (requestedLimit === undefined || summaries.length < requestedLimit) {
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
    summaries.push(...pageSummaries);
    total = readFiniteNumber(payload?.total) ?? total;

    if (pageSummaries.length === 0) {
      break;
    }

    offset += pageSummaries.length;

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

function assertSuccessfulResponse(response: ChatGptFetchResponse, label: string) {
  if (response.ok) {
    return;
  }

  const preview = typeof response.body === "string" ? response.body.slice(0, 200) : JSON.stringify(response.body).slice(0, 200);
  throw new Error(`${label} failed with ${response.status}: ${preview}`);
}

function readConversationSummaries(payload: Record<string, unknown> | null): ChatGptConversationSummary[] {
  const items = payload?.items;

  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((entry) => toConversationSummary(asRecord(entry)))
    .filter((entry): entry is ChatGptConversationSummary => entry !== null);
}

function toConversationSummary(record: Record<string, unknown> | null): ChatGptConversationSummary | null {
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

  if (["thoughts", "reasoning_recap", "user_editable_context", "model_editable_context"].includes(message.contentType)) {
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

function writeConversationMarkdown(contentDir: string, detail: ChatGptConversationDetail, markdown: string): string {
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
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
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

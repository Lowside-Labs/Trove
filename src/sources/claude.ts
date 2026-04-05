import fs from "node:fs";
import path from "node:path";
import { chromium, type Browser, type Page } from "playwright-core";
import { ensureTroveDirs } from "../core/fs.js";
import { createJsonlSink, createTimestampedFileName } from "../core/raw.js";
import type { ProgressHandler } from "../core/progress.js";
import type { TroveItem } from "../types/item.js";

const DEFAULT_CDP_URL = "http://127.0.0.1:9222";
const CLAUDE_HOST = "claude.ai";
const ORG_ID_PATTERN = /\/api\/organizations\/([^/]+)\//;
const LIST_PAGE_SIZE = 30;
const MAX_STALLED_LIST_PAGES = 3;

interface ClaudeSyncOptions {
  cdpUrl?: string;
  limit?: number;
  onProgress?: ProgressHandler;
}

export interface ClaudeSyncResult {
  items: TroveItem[];
  rawPath: string;
  contentPath: string;
}

interface ClaudeFetchResponse {
  ok: boolean;
  status: number;
  url: string;
  body: unknown;
}

interface ClaudeConversationSummary {
  id: string;
  title: string;
  updatedAt: string;
  excerpt?: string;
  raw: Record<string, unknown>;
}

interface ClaudeConversationDetail {
  id: string;
  title: string;
  url: string;
  createdAt: string;
  updatedAt: string;
  model?: string;
  summary?: string;
  messages: ClaudeMessage[];
  raw: Record<string, unknown>;
}

interface ClaudeMessage {
  id: string;
  sender: string;
  createdAt?: string;
  updatedAt?: string;
  content: ClaudeContentBlock[];
  attachments: unknown[];
  files: unknown[];
  raw: Record<string, unknown>;
}

interface ClaudeContentBlock {
  type: string;
  raw: Record<string, unknown>;
}

export async function syncClaudeChats(options: ClaudeSyncOptions): Promise<ClaudeSyncResult> {
  const cdpUrl = options.cdpUrl?.trim() || DEFAULT_CDP_URL;
  const rawSink = createJsonlSink("claude", createTimestampedFileName("live-browser"));
  const paths = ensureTroveDirs();
  const contentDir = path.join(paths.contentDir, "claude");
  fs.mkdirSync(contentDir, { recursive: true });

  const browser = await chromium.connectOverCDP(cdpUrl);
  emitProgress(options.onProgress, "bootstrap", "Attaching to Claude browser session");
  const page = await getClaudePage(browser);
  emitProgress(options.onProgress, "bootstrap", "Discovering Claude organization");
  const orgId = await discoverOrganizationId(page);
  const requestedLimit = options.limit;
  const summaries = await fetchConversationSummaries(page, orgId, requestedLimit, rawSink, options.onProgress);

  const items: TroveItem[] = [];
  const total = summaries.length;
  let completed = 0;

  for (const summary of summaries) {
    emitProgress(options.onProgress, "detail", `Fetching Claude conversation ${completed + 1}`, completed, total);
    const detailResponse = await fetchClaudeJson(
      page,
      `/api/organizations/${orgId}/chat_conversations/${summary.id}?tree=True&rendering_mode=messages&render_all_tools=true&consistency=eventual`,
    );
    assertSuccessfulResponse(detailResponse, `Claude conversation ${summary.id}`);

    const detail = parseConversationDetail(detailResponse.body);
    rawSink.append({
      kind: "detail",
      orgId,
      conversationId: summary.id,
      payload: detailResponse.body as Record<string, unknown>,
    });

    const markdown = renderConversationMarkdown(detail);
    const markdownPath = writeConversationMarkdown(contentDir, detail, markdown);
    items.push(toTroveItem(summary, detail, markdown, markdownPath));
    completed += 1;
    emitProgress(options.onProgress, "detail", `Rendered Claude conversation ${completed}`, completed, total);
  }

  return { items, rawPath: rawSink.path, contentPath: contentDir };
}

async function getClaudePage(browser: Browser): Promise<Page> {
  for (const context of browser.contexts()) {
    for (const page of context.pages()) {
      if (!page.url().includes(CLAUDE_HOST)) {
        continue;
      }

      await page.bringToFront();
      await page.waitForLoadState("domcontentloaded");
      return page;
    }
  }

  throw new Error(`No live ${CLAUDE_HOST} page was found in the attached browser session.`);
}

async function discoverOrganizationId(page: Page): Promise<string> {
  const orgIdFromUrl = extractOrganizationIdFromText(page.url());

  if (orgIdFromUrl) {
    return orgIdFromUrl;
  }

  const resourceUrls = await page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .map((entry) => entry.name)
      .filter((name) => name.includes("/api/organizations/")),
  );
  const orgIdFromResources = resourceUrls
    .map((url) => extractOrganizationIdFromText(url))
    .find((candidate): candidate is string => typeof candidate === "string");

  if (orgIdFromResources) {
    return orgIdFromResources;
  }

  const discoverableResponse = await fetchClaudeJson(page, "/api/organizations/discoverable");
  assertSuccessfulResponse(discoverableResponse, "Claude discoverable organizations");
  const orgIdFromDiscoverable = extractOrganizationIdFromPayload(discoverableResponse.body);

  if (orgIdFromDiscoverable) {
    return orgIdFromDiscoverable;
  }

  throw new Error("Could not determine the active Claude organization id from the live browser session.");
}

function extractOrganizationIdFromText(value: string): string | null {
  const match = ORG_ID_PATTERN.exec(value);
  return match?.[1] ?? null;
}

function extractOrganizationIdFromPayload(payload: unknown): string | null {
  for (const record of collectRecords(payload)) {
    const candidate = readString(record, "uuid") ?? readString(record, "organization_uuid") ?? readString(record, "id");
    if (candidate && /^[0-9a-f-]{16,}$/i.test(candidate)) {
      return candidate;
    }
  }

  return null;
}

async function fetchConversationSummaries(
  page: Page,
  orgId: string,
  requestedLimit: number | undefined,
  rawSink: ReturnType<typeof createJsonlSink>,
  onProgress?: ProgressHandler,
): Promise<ClaudeConversationSummary[]> {
  const summaries: ClaudeConversationSummary[] = [];
  const seenIds = new Set<string>();
  let offset = 0;
  let hasMore = true;
  let pageNumber = 1;
  let stalledPages = 0;

  while (hasMore && (requestedLimit === undefined || summaries.length < requestedLimit)) {
    emitProgress(onProgress, "page", `Fetching Claude conversations page ${pageNumber}`, summaries.length);
    const response = await fetchClaudeJson(
      page,
      `/api/organizations/${orgId}/chat_conversations_v2?limit=${LIST_PAGE_SIZE}&offset=${offset}&starred=false&consistency=eventual`,
    );
    assertSuccessfulResponse(response, `Claude conversation list page at offset ${offset}`);
    rawSink.append({
      kind: "list",
      orgId,
      offset,
      payload: response.body as Record<string, unknown>,
    });

    const pageSummaries = extractConversationSummaries(response.body);
    let importedCount = 0;

    for (const summary of pageSummaries) {
      if (seenIds.has(summary.id)) {
        continue;
      }

      summaries.push(summary);
      seenIds.add(summary.id);
      importedCount += 1;
    }

    hasMore = readHasMore(response.body);

    if (pageSummaries.length === 0) {
      break;
    }

    stalledPages = importedCount === 0 ? stalledPages + 1 : 0;

    if (stalledPages >= MAX_STALLED_LIST_PAGES) {
      break;
    }

    offset += LIST_PAGE_SIZE;
    emitProgress(onProgress, "page", `Fetched Claude conversations page ${pageNumber}`, summaries.length);
    pageNumber += 1;
  }

  return requestedLimit === undefined ? summaries : summaries.slice(0, requestedLimit);
}

async function fetchClaudeJson(page: Page, pathValue: string): Promise<ClaudeFetchResponse> {
  return page.evaluate(async (relativePath) => {
    const response = await fetch(relativePath, {
      credentials: "include",
      headers: {
        accept: "application/json",
      },
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
  }, pathValue);
}

function assertSuccessfulResponse(response: ClaudeFetchResponse, label: string) {
  if (response.ok) {
    return;
  }

  const preview = typeof response.body === "string" ? response.body.slice(0, 200) : JSON.stringify(response.body).slice(0, 200);
  throw new Error(`${label} failed with ${response.status}: ${preview}`);
}

function readHasMore(payload: unknown): boolean {
  const record = asRecord(payload);
  return record?.has_more === true;
}

function extractConversationSummaries(payload: unknown): ClaudeConversationSummary[] {
  for (const record of collectRecords(payload)) {
    const conversations = collectConversationArray(record);

    if (conversations.length > 0) {
      return conversations;
    }
  }

  if (Array.isArray(payload)) {
    return payload
      .map((entry) => toConversationSummary(asRecord(entry)))
      .filter((entry): entry is ClaudeConversationSummary => entry !== null);
  }

  return [];
}

function collectConversationArray(record: Record<string, unknown>): ClaudeConversationSummary[] {
  for (const value of Object.values(record)) {
    if (!Array.isArray(value)) {
      continue;
    }

    const conversations = value
      .map((entry) => toConversationSummary(asRecord(entry)))
      .filter((entry): entry is ClaudeConversationSummary => entry !== null);

    if (conversations.length > 0) {
      return conversations;
    }
  }

  return [];
}

function toConversationSummary(record: Record<string, unknown> | null): ClaudeConversationSummary | null {
  if (!record) {
    return null;
  }

  const id = readString(record, "uuid") ?? readString(record, "conversation_uuid");

  if (!id) {
    return null;
  }

  const title = firstString(record, ["name", "title", "chat_name"]) ?? `Claude chat ${id.slice(0, 8)}`;
  const updatedAt =
    firstString(record, ["updated_at", "created_at", "last_message_at", "last_activity_at"]) ?? new Date().toISOString();
  const excerpt = firstString(record, ["summary", "preview", "first_message", "latest_message"]);

  return {
    id,
    title,
    updatedAt,
    ...(excerpt ? { excerpt } : {}),
    raw: record,
  };
}

function parseConversationDetail(payload: unknown): ClaudeConversationDetail {
  const record = asRecord(payload);

  if (!record) {
    throw new Error("Claude conversation detail payload was not an object.");
  }

  const id = readString(record, "uuid");
  const title = firstString(record, ["name", "title"]) ?? "Untitled Claude chat";

  if (!id) {
    throw new Error("Claude conversation detail payload was missing uuid.");
  }

  const model = firstString(record, ["model"]);
  const summary = firstString(record, ["summary"]);

  return {
    id,
    title,
    url: `https://claude.ai/chat/${id}`,
    createdAt: toIsoString(firstString(record, ["created_at"]) ?? new Date().toISOString()),
    updatedAt: toIsoString(firstString(record, ["updated_at", "created_at"]) ?? new Date().toISOString()),
    ...(model ? { model } : {}),
    ...(summary ? { summary } : {}),
    messages: readMessages(record),
    raw: record,
  };
}

function readMessages(record: Record<string, unknown>): ClaudeMessage[] {
  const value = record.chat_messages;

  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => toClaudeMessage(asRecord(entry)))
    .filter((entry): entry is ClaudeMessage => entry !== null)
    .sort((left, right) => {
      const leftIndex = readNumericIndex(left.raw.index);
      const rightIndex = readNumericIndex(right.raw.index);
      return leftIndex - rightIndex;
    });
}

function toClaudeMessage(record: Record<string, unknown> | null): ClaudeMessage | null {
  if (!record) {
    return null;
  }

  const id = readString(record, "uuid");
  const sender = readString(record, "sender");

  if (!id || !sender) {
    return null;
  }

  const contentValue = Array.isArray(record.content) ? record.content : [];
  const attachments = Array.isArray(record.attachments) ? record.attachments : [];
  const files = Array.isArray(record.files) ? record.files : [];

  return {
    id,
    sender,
    ...(readString(record, "created_at") ? { createdAt: toIsoString(readString(record, "created_at")!) } : {}),
    ...(readString(record, "updated_at") ? { updatedAt: toIsoString(readString(record, "updated_at")!) } : {}),
    content: contentValue.map(toClaudeContentBlock),
    attachments,
    files,
    raw: record,
  };
}

function toClaudeContentBlock(value: unknown): ClaudeContentBlock {
  const record = asRecord(value) ?? {};
  return {
    type: readString(record, "type") ?? "unknown",
    raw: record,
  };
}

function renderConversationMarkdown(detail: ClaudeConversationDetail): string {
  const lines: string[] = [];

  lines.push(`# ${detail.title}`);
  lines.push("");
  lines.push(`- URL: ${detail.url}`);
  lines.push(`- Created: ${detail.createdAt}`);
  lines.push(`- Updated: ${detail.updatedAt}`);

  if (detail.model) {
    lines.push(`- Model: ${detail.model}`);
  }

  lines.push("");

  for (const message of detail.messages) {
    const renderedBlocks = message.content
      .map(renderContentBlock)
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0);

    if (renderedBlocks.length === 0) {
      continue;
    }

    lines.push(`## ${formatSender(message.sender)}`);
    lines.push("");

    if (message.createdAt) {
      lines.push(`_Created: ${message.createdAt}_`);
      lines.push("");
    }

    for (const block of renderedBlocks) {
      lines.push(block.trimEnd());
      lines.push("");
    }

    const attachmentLines = renderAttachmentLines(message);
    if (attachmentLines.length > 0) {
      lines.push(...attachmentLines);
      lines.push("");
    }
  }

  return `${lines.join("\n").trim()}\n`;
}

function formatSender(sender: string): string {
  if (sender === "human") {
    return "User";
  }

  if (sender === "assistant") {
    return "Claude";
  }

  return sender.charAt(0).toUpperCase() + sender.slice(1);
}

function renderContentBlock(block: ClaudeContentBlock): string | null {
  switch (block.type) {
    case "text":
      return renderTextBlock(block.raw);
    case "thinking":
      return null;
    case "tool_use":
      return renderToolUseBlock(block.raw);
    case "tool_result":
      return renderToolResultBlock(block.raw);
    default:
      return renderUnknownBlock(block);
  }
}

function renderTextBlock(record: Record<string, unknown>): string | null {
  const text = readString(record, "text");
  return text ? normalizeMarkdownText(text) : null;
}

function renderToolUseBlock(record: Record<string, unknown>): string {
  const name = firstString(record, ["name", "integration_name"]) ?? "tool";
  const input = record.input;
  const lines = [`### Tool: ${name}`];

  if (readString(record, "message")) {
    lines.push("");
    lines.push(readString(record, "message")!);
  }

  if (input !== undefined) {
    lines.push("");
    lines.push("```json");
    lines.push(JSON.stringify(input, null, 2));
    lines.push("```");
  }

  return lines.join("\n");
}

function renderToolResultBlock(record: Record<string, unknown>): string | null {
  const name = firstString(record, ["name"]) ?? "tool";
  const nested = Array.isArray(record.content) ? record.content : [];
  const renderedNested = nested
    .map((entry) => renderToolResultContent(asRecord(entry)))
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0);

  if (renderedNested.length === 0) {
    const message = readString(record, "message");
    return message ? `### Tool result: ${name}\n\n${normalizeMarkdownText(message)}` : null;
  }

  return [`### Tool result: ${name}`, "", renderedNested.join("\n\n")].join("\n");
}

function renderToolResultContent(record: Record<string, unknown> | null): string | null {
  if (!record) {
    return null;
  }

  const type = readString(record, "type") ?? "unknown";

  if (type === "text") {
    const text = readString(record, "text");
    return text ? normalizeMarkdownText(text) : null;
  }

  if (type === "knowledge") {
    const title = firstString(record, ["title"]) ?? "Knowledge";
    const url = readString(record, "url");
    const text = readString(record, "text");
    const lines = [url ? `- [${title}](${url})` : `- ${title}`];

    if (text) {
      const excerpt = deriveKnowledgeExcerpt(text);
      lines.push("");
      lines.push(excerpt);
    }

    return lines.join("\n");
  }

  return `- Unsupported tool result block: ${type}`;
}

function renderUnknownBlock(block: ClaudeContentBlock): string {
  return [`### Unsupported block: ${block.type}`, "", "```json", JSON.stringify(block.raw, null, 2), "```"].join("\n");
}

function renderAttachmentLines(message: ClaudeMessage): string[] {
  const lines: string[] = [];

  if (message.attachments.length > 0) {
    lines.push(`Attachments: ${message.attachments.length}`);
  }

  if (message.files.length > 0) {
    lines.push(`Files: ${message.files.length}`);
  }

  return lines;
}

function normalizeMarkdownText(value: string): string {
  return value.replace(/\r\n/g, "\n").trim();
}

function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength).trimEnd()}...`;
}

function deriveKnowledgeExcerpt(value: string): string {
  const normalized = normalizeMarkdownText(value);
  const paragraphs = normalized
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  const meaningful = paragraphs.find((part) => !/^(skip to content|navigation menu|sign in|appearance settings)$/i.test(part));
  return truncateText(meaningful ?? normalized, 400);
}

function writeConversationMarkdown(contentDir: string, detail: ClaudeConversationDetail, markdown: string): string {
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

  return normalized.length > 0 ? normalized : "claude-chat";
}

function toTroveItem(
  summary: ClaudeConversationSummary,
  detail: ClaudeConversationDetail,
  markdown: string,
  markdownPath: string,
): TroveItem {
  return {
    source: "claude",
    kind: "chat",
    externalId: detail.id,
    title: detail.title,
    url: detail.url,
    savedAt: detail.updatedAt,
    ...(summary.excerpt ? { excerpt: summary.excerpt } : {}),
    content: markdown,
    tags: ["claude", "chat"],
    raw: {
      ...detail.raw,
      markdownPath,
    },
  };
}

function toIsoString(value: string): string {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : new Date().toISOString();
}

function collectRecords(payload: unknown): Record<string, unknown>[] {
  const queue: unknown[] = [payload];
  const records: Record<string, unknown>[] = [];

  while (queue.length > 0) {
    const current = queue.shift();

    if (Array.isArray(current)) {
      queue.push(...current);
      continue;
    }

    const record = asRecord(current);

    if (!record) {
      continue;
    }

    records.push(record);
    queue.push(...Object.values(record));
  }

  return records;
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

function readNumericIndex(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER;
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

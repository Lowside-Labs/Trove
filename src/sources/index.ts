import type { ProgressHandler } from "../core/progress.js";
import type { CommandReport } from "../core/output.js";
import type { SyncStateRecord } from "../db/database.js";
import type { SupportedBrowserId } from "../types/browser.js";
import type { TroveItem } from "../types/item.js";
import { syncClaudeChats } from "./claude.js";
import { syncChatGptChats } from "./chatgpt.js";
import { formatAvailableGitHubBrowserList, syncGitHubStars } from "./github.js";
import { syncHnFavorites } from "./hn/index.js";
import { syncSubstackSaved } from "./substack.js";
import { formatAvailableBrowserList, syncXBookmarks } from "./x.js";

export interface SyncCommandOptions {
  browser: string;
  profile?: string;
  limit?: string;
  cdpUrl?: string;
  headful?: boolean;
  debugRawPages?: boolean;
  user?: string;
  kind?: string;
}

export interface SyncSourceResult {
  items: TroveItem[];
  rawPath: string;
  nextCursor?: string;
  debugRawPagesPath?: string;
  contentPath?: string;
}

export type SyncSummary = CommandReport;

export interface SyncKindMetadata {
  id: string;
  aliases?: string[];
  default?: boolean;
}

export interface SyncSourceMetadata {
  displayName: string;
  authMode: "cookie" | "public" | "cdp";
  kinds: SyncKindMetadata[];
  requiresBrowser?: boolean;
  requiresUser?: boolean;
}

export interface SyncSourceDefinition {
  id: string;
  metadata: SyncSourceMetadata;
  expandSyncRuns?(options: SyncCommandOptions): SyncCommandOptions[];
  createScope(options: SyncCommandOptions): string;
  shouldPersistState?: boolean;
  sync(args: {
    options: SyncCommandOptions;
    state: SyncStateRecord | null;
    limit?: number;
    onProgress?: ProgressHandler;
  }): Promise<SyncSourceResult>;
  buildSyncState?(args: {
    options: SyncCommandOptions;
    importedCount: number;
    result: SyncSourceResult;
    scope: string;
  }): SyncStateRecord | null;
  getSummary?(args: {
    options: SyncCommandOptions;
    state: SyncStateRecord | null;
    result: SyncSourceResult;
    scope: string;
  }): SyncSummary;
}

const claudeSource: SyncSourceDefinition = {
  id: "claude",
  metadata: {
    displayName: "Claude",
    authMode: "cdp",
    kinds: [],
  },
  expandSyncRuns(options) {
    return [options];
  },
  createScope(options) {
    return options.cdpUrl ?? "http://127.0.0.1:9222";
  },
  async sync({ options, limit, onProgress }) {
    return syncClaudeChats({
      ...(options.cdpUrl ? { cdpUrl: options.cdpUrl } : {}),
      ...(limit !== undefined ? { limit } : {}),
      ...(onProgress ? { onProgress } : {}),
    });
  },
  getSummary({ result, scope }) {
    return {
      headline: "Fetched Claude chats through a live browser attachment.",
      sections: [
        {
          title: "Artifacts",
          entries: [
            { label: "Raw JSONL", value: result.rawPath },
            { label: "Markdown", value: result.contentPath ?? "Not written", tone: result.contentPath ? "default" : "muted" },
          ],
        },
        {
          title: "Context",
          entries: [{ label: "CDP URL", value: scope, tone: "muted" }],
        },
      ],
    };
  },
};

const chatGptSource: SyncSourceDefinition = {
  id: "chatgpt",
  metadata: {
    displayName: "ChatGPT",
    authMode: "cdp",
    kinds: [],
  },
  expandSyncRuns(options) {
    return [options];
  },
  createScope(options) {
    return options.cdpUrl ?? "http://127.0.0.1:9222";
  },
  async sync({ options, limit, onProgress }) {
    return syncChatGptChats({
      ...(options.cdpUrl ? { cdpUrl: options.cdpUrl } : {}),
      ...(limit !== undefined ? { limit } : {}),
      ...(onProgress ? { onProgress } : {}),
    });
  },
  getSummary({ result, scope }) {
    return {
      headline: "Fetched ChatGPT chats through a live browser attachment.",
      sections: [
        {
          title: "Artifacts",
          entries: [
            { label: "Raw JSONL", value: result.rawPath },
            { label: "Markdown", value: result.contentPath ?? "Not written", tone: result.contentPath ? "default" : "muted" },
          ],
        },
        {
          title: "Context",
          entries: [{ label: "CDP URL", value: scope, tone: "muted" }],
        },
      ],
    };
  },
};

const githubSource: SyncSourceDefinition = {
  id: "github",
  metadata: {
    displayName: "GitHub",
    authMode: "cookie",
    kinds: [{ id: "stars", aliases: ["star"], default: true }],
    requiresBrowser: true,
  },
  expandSyncRuns(options) {
    return expandKindRuns(this.metadata, options);
  },
  createScope(options) {
    return `${options.browser}:${options.profile ?? "Default"}:stars`;
  },
  shouldPersistState: true,
  async sync({ options, state, limit, onProgress }) {
    const browserId = options.browser as SupportedBrowserId;

    return syncGitHubStars({
      browserId,
      ...(options.profile ? { profile: options.profile } : {}),
      ...(options.kind ? { kind: options.kind } : {}),
      ...(limit !== undefined ? { limit } : {}),
      ...(state?.cursor ? { cursor: state.cursor } : {}),
      ...(onProgress ? { onProgress } : {}),
    });
  },
  buildSyncState({ options, importedCount, result, scope }) {
    return {
      source: "github",
      scope,
      ...(result.nextCursor ? { cursor: result.nextCursor } : {}),
      metadata: {
        browserId: options.browser,
        profile: options.profile ?? "Default",
        kind: "stars",
        lastImportCount: importedCount,
      },
    };
  },
  getSummary({ state, result, scope }) {
    return {
      headline: state?.cursor ? "Resumed GitHub stars sync from a saved cursor." : "Started a fresh GitHub stars sync.",
      sections: [
        {
          title: "Artifacts",
          entries: [{ label: "Raw JSONL", value: result.rawPath }],
        },
        {
          title: "Context",
          entries: [
            { label: "Scope", value: scope, tone: "muted" },
            { label: "Browsers", value: formatAvailableGitHubBrowserList(), tone: "muted" },
          ],
        },
      ],
    };
  },
};

const xSource: SyncSourceDefinition = {
  id: "x",
  metadata: {
    displayName: "X",
    authMode: "cookie",
    kinds: [
      { id: "bookmarks", aliases: ["bookmark"], default: true },
      { id: "likes", aliases: ["like"], default: true },
    ],
    requiresBrowser: true,
  },
  expandSyncRuns(options) {
    return expandKindRuns(this.metadata, options);
  },
  createScope(options) {
    return `${options.browser}:${options.profile ?? "Default"}:${normalizeXKind(options.kind)}`;
  },
  shouldPersistState: true,
  async sync({ options, state, limit, onProgress }) {
    const browserId = options.browser as SupportedBrowserId;

    return syncXBookmarks({
      browserId,
      ...(options.profile ? { profile: options.profile } : {}),
      ...(limit !== undefined ? { limit } : {}),
      ...(options.headful ? { headful: true } : {}),
      ...(state?.cursor ? { cursor: state.cursor } : {}),
      ...(options.debugRawPages ? { debugRawPages: true } : {}),
      ...(options.kind ? { kind: options.kind } : {}),
      ...(onProgress ? { onProgress } : {}),
    });
  },
  buildSyncState({ options, importedCount, result, scope }) {
    const kind = normalizeXKind(options.kind);

    return {
      source: "x",
      scope,
      ...(result.nextCursor ? { cursor: result.nextCursor } : {}),
      metadata: {
        browserId: options.browser,
        profile: options.profile ?? "Default",
        kind,
        lastImportCount: importedCount,
      },
    };
  },
  getSummary({ options, state, result, scope }) {
    const kind = normalizeXKind(options.kind);
    const label = kind === "likes" ? "Likes" : "Bookmarks";
    const artifactEntries = [{ label: `${label} JSONL`, value: result.rawPath }];

    if (result.debugRawPagesPath) {
      artifactEntries.push({ label: "Debug pages", value: result.debugRawPagesPath });
    }

    return {
      headline: state?.cursor ? `Resumed X ${kind} sync from a saved cursor.` : `Started a fresh X ${kind} sync.`,
      sections: [
        {
          title: "Artifacts",
          entries: artifactEntries,
        },
        {
          title: "Context",
          entries: [
            { label: "Scope", value: scope, tone: "muted" },
            { label: "Browsers", value: formatAvailableBrowserList(), tone: "muted" },
          ],
        },
      ],
    };
  },
};

const hnSource: SyncSourceDefinition = {
  id: "hn",
  metadata: {
    displayName: "Hacker News",
    authMode: "public",
    kinds: [
      { id: "favorites", default: true },
      { id: "favorite-comments", default: true },
    ],
    requiresUser: true,
  },
  expandSyncRuns(options) {
    return expandKindRuns(this.metadata, options);
  },
  createScope(options) {
    return `${options.user ?? "unknown"}:${options.kind ?? "favorites"}`;
  },
  shouldPersistState: true,
  async sync({ options, state, limit, onProgress }) {
    return syncHnFavorites({
      ...(options.user ? { user: options.user } : {}),
      ...(options.kind ? { kind: options.kind } : {}),
      ...(limit !== undefined ? { limit } : {}),
      ...(state?.cursor ? { cursor: state.cursor } : {}),
      ...(onProgress ? { onProgress } : {}),
    });
  },
  buildSyncState({ options, importedCount, result, scope }) {
    return {
      source: "hn",
      scope,
      ...(result.nextCursor ? { cursor: result.nextCursor } : {}),
      metadata: {
        user: options.user,
        kind: options.kind ?? "favorites",
        lastImportCount: importedCount,
      },
    };
  },
  getSummary({ options, result, scope, state }) {
    return {
      headline: state?.cursor ? "Resumed Hacker News sync from the last saved marker." : "Started a fresh Hacker News sync.",
      sections: [
        {
          title: "Artifacts",
          entries: [{ label: "Raw JSONL", value: result.rawPath }],
        },
        {
          title: "Context",
          entries: [
            { label: "Scope", value: scope, tone: "muted" },
            { label: "User", value: options.user ?? "Unknown", tone: "muted" },
            { label: "Kind", value: options.kind ?? "favorites", tone: "muted" },
          ],
        },
      ],
      notes: ["Saved timestamps use the original HN item time because favorites pages do not expose favorited-at time."],
    };
  },
};

const substackSource: SyncSourceDefinition = {
  id: "substack",
  metadata: {
    displayName: "Substack",
    authMode: "cookie",
    kinds: [
      { id: "saved", default: true },
      { id: "likes", aliases: ["like"], default: true },
    ],
    requiresBrowser: true,
  },
  expandSyncRuns(options) {
    return expandKindRuns(this.metadata, options);
  },
  createScope(options) {
    return `${options.browser}:${options.profile ?? "Default"}:${options.kind ?? "saved"}`;
  },
  shouldPersistState: true,
  async sync({ options, state, limit, onProgress }) {
    const browserId = options.browser as SupportedBrowserId;

    return syncSubstackSaved({
      browserId,
      ...(options.profile ? { profile: options.profile } : {}),
      ...(options.kind ? { kind: options.kind } : {}),
      ...(limit !== undefined ? { limit } : {}),
      ...(state?.cursor ? { cursor: state.cursor } : {}),
      ...(onProgress ? { onProgress } : {}),
    });
  },
  buildSyncState({ options, importedCount, result, scope }) {
    return {
      source: "substack",
      scope,
      ...(result.nextCursor ? { cursor: result.nextCursor } : {}),
      metadata: {
        browserId: options.browser,
        profile: options.profile ?? "Default",
        lastImportCount: importedCount,
      },
    };
  },
  getSummary({ options, state, result, scope }) {
    const kind = options.kind ?? "saved";

    return {
      headline: state?.cursor ? `Resumed Substack ${kind} sync from a saved cursor.` : `Started a fresh Substack ${kind} sync.`,
      sections: [
        {
          title: "Artifacts",
          entries: [{ label: `${kind} JSONL`, value: result.rawPath }],
        },
        {
          title: "Context",
          entries: [{ label: "Scope", value: scope, tone: "muted" }],
        },
      ],
    };
  },
};

const syncSources = [claudeSource, chatGptSource, githubSource, hnSource, substackSource, xSource];

function normalizeXKind(kind?: string): "bookmarks" | "likes" {
  if (!kind || kind === "bookmarks" || kind === "bookmark") {
    return "bookmarks";
  }

  if (kind === "likes" || kind === "like") {
    return "likes";
  }

  return "bookmarks";
}

export function getSyncSource(id: string): SyncSourceDefinition | undefined {
  return syncSources.find((source) => source.id === id);
}

export function listSyncSourceIds(): string[] {
  return syncSources.map((source) => source.id);
}

export function listSyncSources(): SyncSourceDefinition[] {
  return [...syncSources];
}

export function canonicalizeKind(source: SyncSourceDefinition, kind?: string): string | undefined {
  if (!kind) {
    return undefined;
  }

  for (const entry of source.metadata.kinds) {
    if (entry.id === kind || entry.aliases?.includes(kind)) {
      return entry.id;
    }
  }

  return undefined;
}

export function assertSupportedKind(source: SyncSourceDefinition, kind: string): string {
  const canonicalKind = canonicalizeKind(source, kind);

  if (canonicalKind) {
    return canonicalKind;
  }

  throw new Error(
    `Unsupported kind "${kind}" for source "${source.id}". Supported kinds: ${source.metadata.kinds.map((entry) => entry.id).join(", ")}.`,
  );
}

export function formatSupportedKindsHelp(): string {
  return syncSources
    .filter((source) => source.metadata.kinds.length > 0)
    .map((source) => `${source.id}: ${source.metadata.kinds.map((entry) => entry.id).join(" | ")}`)
    .join("; ");
}

function expandKindRuns(metadata: SyncSourceMetadata, options: SyncCommandOptions): SyncCommandOptions[] {
  const canonicalKind = options.kind ? canonicalizeMetadataKind(metadata, options.kind) ?? options.kind : undefined;

  if (canonicalKind) {
    return [{ ...options, kind: canonicalKind }];
  }

  const defaultKinds = metadata.kinds.filter((entry) => entry.default).map((entry) => entry.id);

  if (defaultKinds.length === 0) {
    return [options];
  }

  return defaultKinds.map((kind) => ({ ...options, kind }));
}

function canonicalizeMetadataKind(metadata: SyncSourceMetadata, kind: string): string | undefined {
  for (const entry of metadata.kinds) {
    if (entry.id === kind || entry.aliases?.includes(kind)) {
      return entry.id;
    }
  }

  return undefined;
}

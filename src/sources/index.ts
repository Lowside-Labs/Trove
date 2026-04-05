import type { SyncProgressHandler } from "../core/progress.js";
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

export interface SyncSourceDefinition {
  id: string;
  expandSyncRuns?(options: SyncCommandOptions): SyncCommandOptions[];
  createScope(options: SyncCommandOptions): string;
  shouldPersistState?: boolean;
  sync(args: {
    options: SyncCommandOptions;
    state: SyncStateRecord | null;
    limit?: number;
    onProgress?: SyncProgressHandler;
  }): Promise<SyncSourceResult>;
  buildSyncState?(args: {
    options: SyncCommandOptions;
    importedCount: number;
    result: SyncSourceResult;
    scope: string;
  }): SyncStateRecord | null;
  getSummaryLines?(args: {
    options: SyncCommandOptions;
    state: SyncStateRecord | null;
    result: SyncSourceResult;
    scope: string;
  }): string[];
}

const claudeSource: SyncSourceDefinition = {
  id: "claude",
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
  getSummaryLines({ result, scope }) {
    return [
      `Fetched Claude chats through live browser attachment at ${scope}.`,
      `Claude raw JSONL: ${result.rawPath}`,
      `Claude Markdown: ${result.contentPath}`,
    ];
  },
};

const chatGptSource: SyncSourceDefinition = {
  id: "chatgpt",
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
  getSummaryLines({ result, scope }) {
    return [
      `Fetched ChatGPT chats through live browser attachment at ${scope}.`,
      `ChatGPT raw JSONL: ${result.rawPath}`,
      `ChatGPT Markdown: ${result.contentPath}`,
    ];
  },
};

const githubSource: SyncSourceDefinition = {
  id: "github",
  expandSyncRuns(options) {
    return options.kind ? [options] : [{ ...options, kind: "stars" }];
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
  getSummaryLines({ state, result, scope }) {
    return [
      state?.cursor ? `Resumed GitHub stars sync for ${scope}.` : `Started fresh GitHub stars sync for ${scope}.`,
      `GitHub stars JSONL: ${result.rawPath}`,
      `Browsers detected: ${formatAvailableGitHubBrowserList()}`,
    ];
  },
};

const xSource: SyncSourceDefinition = {
  id: "x",
  expandSyncRuns(options) {
    return options.kind ? [options] : [{ ...options, kind: "bookmarks" }, { ...options, kind: "likes" }];
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
  getSummaryLines({ options, state, result, scope }) {
    const kind = normalizeXKind(options.kind);
    const label = kind === "likes" ? "Likes" : "Bookmarks";
    const lines = [state?.cursor ? `Resumed from saved cursor for ${scope}.` : `Started fresh sync for ${scope}.`];

    lines.push(`${label} JSONL: ${result.rawPath}`);

    if (result.debugRawPagesPath) {
      lines.push(`Debug raw pages: ${result.debugRawPagesPath}`);
    }

    lines.push(`Browsers detected: ${formatAvailableBrowserList()}`);

    return lines;
  },
};

const hnSource: SyncSourceDefinition = {
  id: "hn",
  expandSyncRuns(options) {
    if (options.kind) {
      return [options];
    }

    return [{ ...options, kind: "favorites" }, { ...options, kind: "favorite-comments" }];
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
  getSummaryLines({ options, result, scope, state }) {
    return [
      state?.cursor ? `Resumed HN sync for ${scope}.` : `Started fresh HN sync for ${scope}.`,
      `HN favorites JSONL: ${result.rawPath}`,
      `Saved timestamps use the original HN item time because HN favorites pages do not expose favorited-at time.`,
      `User: ${options.user ?? ""}, kind: ${options.kind ?? "favorites"}.`,
    ];
  },
};

const substackSource: SyncSourceDefinition = {
  id: "substack",
  expandSyncRuns(options) {
    return options.kind ? [options] : [{ ...options, kind: "saved" }, { ...options, kind: "likes" }];
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
  getSummaryLines({ options, state, result, scope }) {
    const kind = options.kind ?? "saved";

    return [
      state?.cursor ? `Resumed Substack ${kind} sync for ${scope}.` : `Started fresh Substack ${kind} sync for ${scope}.`,
      `Substack ${kind} JSONL: ${result.rawPath}`,
    ];
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

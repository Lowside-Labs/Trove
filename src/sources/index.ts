import type { SyncStateRecord } from "../db/database.js";
import type { SupportedBrowserId } from "../types/browser.js";
import type { TroveItem } from "../types/item.js";
import { getDemoItems } from "./demo.js";
import { syncHnFavorites } from "./hn/index.js";
import { syncSubstackSaved } from "./substack.js";
import { formatAvailableBrowserList, syncXBookmarks } from "./x.js";

export interface SyncCommandOptions {
  browser: string;
  profile?: string;
  limit?: string;
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
}

export interface SyncSourceDefinition {
  id: string;
  createScope(options: SyncCommandOptions): string;
  shouldPersistState?: boolean;
  sync(args: {
    options: SyncCommandOptions;
    state: SyncStateRecord | null;
    limit?: number;
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

const demoSource: SyncSourceDefinition = {
  id: "demo",
  createScope: () => "default",
  sync: async () => ({ items: getDemoItems(), rawPath: "" }),
};

const xSource: SyncSourceDefinition = {
  id: "x",
  createScope(options) {
    return `${options.browser}:${options.profile ?? "Default"}`;
  },
  shouldPersistState: true,
  async sync({ options, state, limit }) {
    const browserId = options.browser as SupportedBrowserId;

    return syncXBookmarks({
      browserId,
      ...(options.profile ? { profile: options.profile } : {}),
      ...(limit !== undefined ? { limit } : {}),
      ...(options.headful ? { headful: true } : {}),
      ...(state?.cursor ? { cursor: state.cursor } : {}),
      ...(options.debugRawPages ? { debugRawPages: true } : {}),
    });
  },
  buildSyncState({ options, importedCount, result, scope }) {
    return {
      source: "x",
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
    const lines = [state?.cursor ? `Resumed from saved cursor for ${scope}.` : `Started fresh sync for ${scope}.`];

    lines.push(`Bookmarks JSONL: ${result.rawPath}`);

    if (result.debugRawPagesPath) {
      lines.push(`Debug raw pages: ${result.debugRawPagesPath}`);
    }

    lines.push(`Browsers detected: ${formatAvailableBrowserList()}`);

    return lines;
  },
};

const hnSource: SyncSourceDefinition = {
  id: "hn",
  createScope(options) {
    return `${options.user ?? "unknown"}:${options.kind ?? "favorites"}`;
  },
  shouldPersistState: true,
  async sync({ options, state, limit }) {
    return syncHnFavorites({
      ...(options.user ? { user: options.user } : {}),
      ...(options.kind ? { kind: options.kind } : {}),
      ...(limit !== undefined ? { limit } : {}),
      ...(state?.cursor ? { cursor: state.cursor } : {}),
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
  createScope(options) {
    return `${options.browser}:${options.profile ?? "Default"}:${options.kind ?? "saved"}`;
  },
  shouldPersistState: true,
  async sync({ options, state, limit }) {
    const browserId = options.browser as SupportedBrowserId;

    return syncSubstackSaved({
      browserId,
      ...(options.profile ? { profile: options.profile } : {}),
      ...(options.kind ? { kind: options.kind } : {}),
      ...(limit !== undefined ? { limit } : {}),
      ...(state?.cursor ? { cursor: state.cursor } : {}),
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

const syncSources = [demoSource, hnSource, substackSource, xSource];

export function getSyncSource(id: string): SyncSourceDefinition | undefined {
  return syncSources.find((source) => source.id === id);
}

export function listSyncSourceIds(): string[] {
  return syncSources.map((source) => source.id);
}

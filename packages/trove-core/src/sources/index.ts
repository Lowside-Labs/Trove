import type {
  ProgressHandler,
  SyncCommandOptions,
  SyncKindMetadata,
  SyncSourceMetadata,
  SyncSourceResult,
  SyncSummary,
} from "trove-contracts";
import { getSavedSourceBrowserTarget } from "../core/paths.js";
import type { SyncStateRecord } from "../db/database.js";
import { findAttachableCdpUrl } from "../auth/cdp.js";
import { findChromiumTab } from "../auth/google-chrome.js";
import {
  getChromiumSession,
  isSupportedBrowserId,
  listChromiumBrowsers,
  listChromiumProfiles,
} from "../auth/chromium.js";
import { SUPPORTED_BROWSER_IDS, type SupportedBrowserId } from "../types/browser.js";
import { syncClaudeChats } from "./claude.js";
import { syncChatGptChats } from "./chatgpt.js";
import {
  formatAvailableGitHubBrowserList,
  syncGitHubStars,
  validateGitHubSession,
} from "./github.js";
import { syncHnFavorites, validateHnSession } from "./hn/index.js";
import { syncInstagramSaved, validateInstagramSession } from "./instagram.js";
import { syncSubstackSaved, validateSubstackSession } from "./substack.js";
import { formatAvailableBrowserList, syncXBookmarks, validateXSession } from "./x.js";

const CHATGPT_HOST = "chatgpt.com";
const CLAUDE_HOST = "claude.ai";
export type {
  SyncCommandOptions,
  SyncKindMetadata,
  SyncSourceMetadata,
  SyncSourceResult,
  SyncSummary,
} from "trove-contracts";

export interface SyncSourceDefinition {
  id: string;
  metadata: SyncSourceMetadata;
  expandSyncRuns?(options: SyncCommandOptions): SyncCommandOptions[];
  resolveOptions?(args: {
    options: SyncCommandOptions;
    onProgress?: ProgressHandler;
  }): Promise<SyncCommandOptions>;
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
    return formatInteractiveScope(options);
  },
  shouldPersistState: true,
  async resolveOptions({ options, onProgress }) {
    return resolveInteractiveBrowserOptions(
      options,
      {
        sourceId: "claude",
        sourceLabel: "Claude",
        chromeHosts: [CLAUDE_HOST],
      },
      onProgress,
    );
  },
  async sync({ options, state, limit, onProgress }) {
    return syncClaudeChats({
      ...(isSupportedBrowserId(options.browser) ? { browser: options.browser } : {}),
      ...(options.cdpUrl ? { cdpUrl: options.cdpUrl } : {}),
      ...(options.sessionMode ? { sessionMode: options.sessionMode } : {}),
      ...(limit !== undefined ? { limit } : {}),
      ...(state?.cursor ? { cursor: state.cursor } : {}),
      ...(onProgress ? { onProgress } : {}),
    });
  },
  buildSyncState({ importedCount, result, scope }) {
    return {
      source: "claude",
      scope,
      ...(result.nextCursor ? { cursor: result.nextCursor } : {}),
      metadata: {
        lastImportCount: importedCount,
      },
    };
  },
  getSummary({ result, scope, options }) {
    return {
      headline:
        options.sessionMode === "chrome-live"
          ? "Fetched Claude chats through the active Google Chrome tab."
          : "Fetched Claude chats through a live browser attachment.",
      sections: [
        {
          title: "Artifacts",
          entries: [
            { label: "Raw JSONL", value: result.rawPath },
            {
              label: "Markdown",
              value: result.contentPath ?? "Not written",
              tone: result.contentPath ? "default" : "muted",
            },
          ],
        },
        {
          title: "Context",
          entries: [{ label: "Session", value: scope, tone: "muted" }],
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
    return formatInteractiveScope(options);
  },
  shouldPersistState: true,
  async resolveOptions({ options, onProgress }) {
    return resolveInteractiveBrowserOptions(
      options,
      {
        sourceId: "chatgpt",
        sourceLabel: "ChatGPT",
        chromeHosts: [CHATGPT_HOST],
      },
      onProgress,
    );
  },
  async sync({ options, state, limit, onProgress }) {
    return syncChatGptChats({
      ...(isSupportedBrowserId(options.browser) ? { browser: options.browser } : {}),
      ...(options.cdpUrl ? { cdpUrl: options.cdpUrl } : {}),
      ...(options.sessionMode ? { sessionMode: options.sessionMode } : {}),
      ...(limit !== undefined ? { limit } : {}),
      ...(state?.cursor ? { cursor: state.cursor } : {}),
      ...(onProgress ? { onProgress } : {}),
    });
  },
  buildSyncState({ importedCount, result, scope }) {
    return {
      source: "chatgpt",
      scope,
      ...(result.nextCursor ? { cursor: result.nextCursor } : {}),
      metadata: {
        lastImportCount: importedCount,
      },
    };
  },
  getSummary({ result, scope, options }) {
    return {
      headline:
        options.sessionMode === "chrome-live"
          ? "Fetched ChatGPT chats through the active Google Chrome tab."
          : "Fetched ChatGPT chats through a live browser attachment.",
      sections: [
        {
          title: "Artifacts",
          entries: [
            { label: "Raw JSONL", value: result.rawPath },
            {
              label: "Markdown",
              value: result.contentPath ?? "Not written",
              tone: result.contentPath ? "default" : "muted",
            },
          ],
        },
        {
          title: "Context",
          entries: [{ label: "Session", value: scope, tone: "muted" }],
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
  async resolveOptions({ options, onProgress }) {
    return resolveCookieBackedOptions(
      "github",
      options,
      {
        sourceLabel: "GitHub",
        domains: ["https://github.com/"],
        validateSession: validateGitHubSession,
      },
      onProgress,
    );
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
      headline: state?.cursor
        ? "Resumed GitHub stars sync from a saved cursor."
        : "Started a fresh GitHub stars sync.",
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
      { id: "bookmark", aliases: ["bookmarks"], default: true },
      { id: "like", aliases: ["likes"], default: true },
    ],
    requiresBrowser: true,
  },
  expandSyncRuns(options) {
    return expandKindRuns(this.metadata, options);
  },
  async resolveOptions({ options, onProgress }) {
    return resolveCookieBackedOptions(
      "x",
      options,
      {
        sourceLabel: "X",
        domains: ["https://x.com/", "https://twitter.com/"],
        validateSession: validateXSession,
      },
      onProgress,
    );
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
      headline: state?.cursor
        ? `Resumed X ${kind} sync from a saved cursor.`
        : `Started a fresh X ${kind} sync.`,
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
    authMode: "cookie",
    kinds: [
      { id: "upvoted", default: true },
      { id: "upvoted-comment", aliases: ["upvoted-comments"], default: true },
    ],
    requiresBrowser: true,
    requiresUser: true,
  },
  expandSyncRuns(options) {
    return expandKindRuns(this.metadata, options);
  },
  async resolveOptions({ options, onProgress }) {
    return resolveCookieBackedOptions(
      "hn",
      options,
      {
        sourceLabel: "Hacker News",
        domains: ["https://news.ycombinator.com/"],
        validateSession: validateHnSession,
      },
      onProgress,
    );
  },
  createScope(options) {
    return `${options.browser}:${options.profile ?? "Default"}:${options.user ?? "unknown"}:${options.kind ?? "upvoted"}`;
  },
  shouldPersistState: true,
  async sync({ options, state, limit, onProgress }) {
    const browserId = options.browser as SupportedBrowserId;
    const session = await getChromiumSession(
      browserId,
      options.profile,
      ["https://news.ycombinator.com/"],
      "Hacker News",
    );

    return syncHnFavorites({
      ...(options.user ? { user: options.user } : {}),
      ...(options.kind ? { kind: options.kind } : {}),
      cookieHeader: session.cookieHeader,
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
        kind: options.kind ?? "upvoted",
        lastImportCount: importedCount,
      },
    };
  },
  getSummary({ options, result, scope, state }) {
    return {
      headline: state?.cursor
        ? "Resumed Hacker News sync from the last saved marker."
        : "Started a fresh Hacker News sync.",
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
            { label: "Kind", value: options.kind ?? "upvoted", tone: "muted" },
          ],
        },
      ],
      notes: [
        "Saved timestamps use the original HN item time because upvoted pages do not expose exact vote time.",
      ],
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
      { id: "like", aliases: ["likes"], default: true },
    ],
    requiresBrowser: true,
  },
  expandSyncRuns(options) {
    return expandKindRuns(this.metadata, options);
  },
  async resolveOptions({ options, onProgress }) {
    return resolveCookieBackedOptions(
      "substack",
      options,
      {
        sourceLabel: "Substack",
        domains: ["https://substack.com/", "https://www.substack.com/"],
        validateSession: validateSubstackSession,
      },
      onProgress,
    );
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
      headline: state?.cursor
        ? `Resumed Substack ${kind} sync from a saved cursor.`
        : `Started a fresh Substack ${kind} sync.`,
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

const instagramSource: SyncSourceDefinition = {
  id: "instagram",
  metadata: {
    displayName: "Instagram",
    authMode: "cookie",
    kinds: [{ id: "saved", default: true }],
    requiresBrowser: true,
  },
  expandSyncRuns(options) {
    return expandKindRuns(this.metadata, options);
  },
  async resolveOptions({ options, onProgress }) {
    return resolveCookieBackedOptions(
      "instagram",
      options,
      {
        sourceLabel: "Instagram",
        domains: ["https://www.instagram.com/"],
        validateSession: validateInstagramSession,
      },
      onProgress,
    );
  },
  createScope(options) {
    return `${options.browser}:${options.profile ?? "Default"}:saved`;
  },
  shouldPersistState: true,
  async sync({ options, state, limit, onProgress }) {
    const browserId = options.browser as SupportedBrowserId;

    return syncInstagramSaved({
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
      source: "instagram",
      scope,
      ...(result.nextCursor ? { cursor: result.nextCursor } : {}),
      metadata: {
        browserId: options.browser,
        profile: options.profile ?? "Default",
        kind: "saved",
        lastImportCount: importedCount,
      },
    };
  },
  getSummary({ state, result, scope }) {
    return {
      headline: state?.cursor
        ? "Resumed Instagram saved sync from a saved cursor."
        : "Started a fresh Instagram saved sync.",
      sections: [
        {
          title: "Artifacts",
          entries: [{ label: "Saved JSONL", value: result.rawPath }],
        },
        {
          title: "Context",
          entries: [
            { label: "Scope", value: scope, tone: "muted" },
            { label: "Browsers", value: formatAvailableBrowserList(), tone: "muted" },
          ],
        },
      ],
      notes: [
        "Saved timestamps currently use the original media timestamp because Instagram's saved feed does not expose exact saved-at times.",
      ],
    };
  },
};

interface CookieSourceAuthConfig {
  sourceLabel: string;
  domains: string[];
  validateSession(cookieHeader: string): Promise<void>;
}

interface CookieProbeCandidate {
  browserId: SupportedBrowserId;
  profile?: string;
}

interface CookieProbeFailure extends CookieProbeCandidate {
  message: string;
}

const syncSources = [
  claudeSource,
  chatGptSource,
  githubSource,
  hnSource,
  instagramSource,
  substackSource,
  xSource,
];

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

async function resolveCookieBackedOptions(
  sourceId: string,
  options: SyncCommandOptions,
  auth: CookieSourceAuthConfig,
  onProgress?: ProgressHandler,
): Promise<SyncCommandOptions> {
  if (process.platform !== "darwin") {
    throw new Error(
      "The seamless Chromium session provider is only implemented for macOS right now.",
    );
  }

  const requestedBrowser = normalizeRequestedBrowser(options.browser);
  const rememberedTarget = getRememberedCookieTarget(sourceId, requestedBrowser);
  const candidates = buildCookieProbeCandidates(
    requestedBrowser,
    options.profile,
    rememberedTarget,
  );

  if (candidates.length === 0) {
    throw new Error(formatMissingChromiumCandidateError(auth.sourceLabel));
  }

  if (candidates.length > 1) {
    onProgress?.({
      phase: "bootstrap",
      message: `Scanning Chromium sessions for ${auth.sourceLabel}`,
    });
  }

  const failures: CookieProbeFailure[] = [];

  for (const candidate of candidates) {
    const label = formatCookieProbeLabel(candidate);
    onProgress?.({
      phase: "bootstrap",
      message: `Checking ${label} for ${auth.sourceLabel}`,
    });

    try {
      const session = await getChromiumSession(
        candidate.browserId,
        candidate.profile,
        auth.domains,
        auth.sourceLabel,
      );
      await auth.validateSession(session.cookieHeader);
      onProgress?.({
        phase: "bootstrap",
        message: `Using ${label} for ${auth.sourceLabel}`,
      });
      return {
        ...options,
        browser: candidate.browserId,
        ...(candidate.profile ? { profile: candidate.profile } : {}),
      };
    } catch (error) {
      failures.push({
        ...candidate,
        message: compactErrorMessage(error),
      });
    }
  }

  throw new Error(formatCookieProbeError(auth.sourceLabel, failures));
}

function formatInteractiveScope(options: SyncCommandOptions): string {
  if (options.sessionMode === "chrome-live") {
    return `chrome-live:${isSupportedBrowserId(options.browser) ? options.browser : "chrome"}`;
  }

  if (options.cdpUrl) {
    return options.cdpUrl;
  }

  if (isSupportedBrowserId(options.browser)) {
    return `${options.browser}:${options.profile ?? "Default"}`;
  }

  return "http://127.0.0.1:9222";
}

async function resolveInteractiveBrowserOptions(
  options: SyncCommandOptions,
  config: {
    sourceId: string;
    sourceLabel: string;
    chromeHosts: string[];
  },
  onProgress?: ProgressHandler,
): Promise<SyncCommandOptions> {
  const explicitCdpUrl = options.cdpUrl?.trim();
  let tabDiscoveryError: string | undefined;

  if (explicitCdpUrl) {
    return {
      ...options,
      cdpUrl: explicitCdpUrl,
      sessionMode: "cdp",
    };
  }

  const requestedBrowser = normalizeRequestedBrowser(options.browser);
  const canUseLiveTab = process.platform === "darwin" && !options.profile;

  if (canUseLiveTab) {
    const browsersToProbe = buildInteractiveTabCandidates(config.sourceId, requestedBrowser);

    for (const browserId of browsersToProbe) {
      onProgress?.({
        phase: "bootstrap",
        message: `Checking for an open ${formatInteractiveBrowserLabel(browserId)} tab for ${config.sourceLabel}`,
      });

      try {
        const tab = await findChromiumTab(browserId, config.chromeHosts);

        if (!tab) {
          continue;
        }

        onProgress?.({
          phase: "bootstrap",
          message: `Using ${formatInteractiveBrowserLabel(browserId)} tab ${new URL(tab.url).host} for ${config.sourceLabel}`,
        });

        return {
          ...options,
          browser: browserId,
          sessionMode: "chrome-live",
        };
      } catch (error) {
        tabDiscoveryError = compactErrorMessage(error);
      }
    }

    if (tabDiscoveryError) {
      onProgress?.({
        phase: "bootstrap",
        message: `Live tab detection failed for ${config.sourceLabel}; trying CDP fallback`,
      });
    }
  }

  onProgress?.({
    phase: "bootstrap",
    message: `Checking for an attachable ${config.sourceLabel} browser session`,
  });

  const attachableCdpUrl = await findAttachableCdpUrl();

  if (attachableCdpUrl) {
    onProgress?.({
      phase: "bootstrap",
      message: `Attaching to ${config.sourceLabel} browser session at ${attachableCdpUrl}`,
    });

    return {
      ...options,
      cdpUrl: attachableCdpUrl,
      sessionMode: "cdp",
    };
  }

  if (requestedBrowser && requestedBrowser !== "chrome") {
    throw new Error(
      `No open ${formatInteractiveBrowserLabel(requestedBrowser)} tab for ${config.sourceLabel} was found, and no attachable CDP browser was detected. Open ${config.sourceLabel} in ${formatInteractiveBrowserLabel(requestedBrowser)} or pass \`--cdp-url <url>\`.`,
    );
  }

  const supportedLabels = buildInteractiveTabCandidates(config.sourceId, requestedBrowser)
    .map((browserId) => formatInteractiveBrowserLabel(browserId))
    .join(", ");
  const baseMessage = `No open Chromium tab for ${config.sourceLabel} was found in ${supportedLabels}, and no attachable CDP browser was detected. Open ${config.sourceLabel} in one of those browsers or pass \`--cdp-url <url>\`.`;
  throw new Error(
    tabDiscoveryError
      ? `${baseMessage} Live tab detection failed: ${tabDiscoveryError}.`
      : baseMessage,
  );
}

function buildInteractiveTabCandidates(
  sourceId: string,
  requestedBrowser: SupportedBrowserId | undefined,
): SupportedBrowserId[] {
  if (requestedBrowser) {
    return [requestedBrowser];
  }

  const rememberedRaw = getSavedSourceBrowserTarget(sourceId)?.browserId;
  const remembered =
    rememberedRaw && isSupportedBrowserId(rememberedRaw) ? rememberedRaw : undefined;
  const installed = listChromiumBrowsers()
    .filter((browser) => browser.installed)
    .map((browser) => browser.id);
  const ordered =
    remembered && installed.includes(remembered) ? [remembered, ...installed] : installed;

  return Array.from(new Set(ordered)) as SupportedBrowserId[];
}

function formatInteractiveBrowserLabel(browserId: SupportedBrowserId): string {
  return (
    listChromiumBrowsers().find((browser) => browser.id === browserId)?.name ?? browserId
  );
}

function normalizeRequestedBrowser(browser: string | undefined): SupportedBrowserId | undefined {
  const normalized = browser?.trim().toLowerCase();

  if (!normalized || normalized === "auto") {
    return undefined;
  }

  if (!isSupportedBrowserId(normalized)) {
    throw new Error(
      `Unsupported browser "${browser}". Supported browsers: auto, ${SUPPORTED_BROWSER_IDS.join(", ")}.`,
    );
  }

  return normalized;
}

function getRememberedCookieTarget(
  sourceId: string,
  requestedBrowser: SupportedBrowserId | undefined,
): CookieProbeCandidate | undefined {
  const target = getSavedSourceBrowserTarget(sourceId);

  if (!target || !isSupportedBrowserId(target.browserId)) {
    return undefined;
  }

  if (requestedBrowser && target.browserId !== requestedBrowser) {
    return undefined;
  }

  return {
    browserId: target.browserId,
    ...(target.profile ? { profile: target.profile } : {}),
  };
}

function buildCookieProbeCandidates(
  requestedBrowser: SupportedBrowserId | undefined,
  requestedProfile: string | undefined,
  rememberedTarget: CookieProbeCandidate | undefined,
): CookieProbeCandidate[] {
  const candidates: CookieProbeCandidate[] = [];
  const seen = new Set<string>();
  const browsers = listChromiumBrowsers();
  const selectedBrowsers = requestedBrowser
    ? browsers.filter((browser) => browser.id === requestedBrowser)
    : browsers
        .filter((browser) => browser.installed)
        .sort((left, right) =>
          compareCookieProbeBrowsers(left, right, rememberedTarget?.browserId),
        );

  for (const browser of selectedBrowsers) {
    const rememberedProfile =
      rememberedTarget?.browserId === browser.id ? rememberedTarget.profile : undefined;
    const profiles = requestedProfile
      ? [requestedProfile]
      : prioritizeRememberedProfile(listChromiumProfiles(browser.id), rememberedProfile);

    if (profiles.length === 0) {
      if (requestedBrowser === browser.id) {
        pushCookieProbeCandidate(
          candidates,
          seen,
          browser.id,
          rememberedProfile ?? browser.defaultProfile,
        );
      }
      continue;
    }

    for (const profile of profiles) {
      pushCookieProbeCandidate(candidates, seen, browser.id, profile);
    }
  }

  if (!requestedBrowser && rememberedTarget) {
    pushCookieProbeCandidate(
      candidates,
      seen,
      rememberedTarget.browserId,
      rememberedTarget.profile,
    );
  }

  return candidates;
}

function compareCookieProbeBrowsers(
  left: ReturnType<typeof listChromiumBrowsers>[number],
  right: ReturnType<typeof listChromiumBrowsers>[number],
  rememberedBrowserId?: SupportedBrowserId,
): number {
  if (rememberedBrowserId && left.id === rememberedBrowserId && right.id !== rememberedBrowserId) {
    return -1;
  }

  if (rememberedBrowserId && right.id === rememberedBrowserId && left.id !== rememberedBrowserId) {
    return 1;
  }

  if (left.cookieSupport !== right.cookieSupport) {
    return left.cookieSupport === "verified" ? -1 : 1;
  }

  return SUPPORTED_BROWSER_IDS.indexOf(left.id) - SUPPORTED_BROWSER_IDS.indexOf(right.id);
}

function prioritizeRememberedProfile(profiles: string[], rememberedProfile?: string): string[] {
  if (!rememberedProfile || !profiles.includes(rememberedProfile)) {
    return profiles;
  }

  return [rememberedProfile, ...profiles.filter((profile) => profile !== rememberedProfile)];
}

function pushCookieProbeCandidate(
  candidates: CookieProbeCandidate[],
  seen: Set<string>,
  browserId: SupportedBrowserId,
  profile?: string,
): void {
  const key = `${browserId}:${profile ?? ""}`;

  if (seen.has(key)) {
    return;
  }

  seen.add(key);
  candidates.push({
    browserId,
    ...(profile ? { profile } : {}),
  });
}

function formatMissingChromiumCandidateError(sourceLabel: string): string {
  const installedBrowsers = listChromiumBrowsers().filter((browser) => browser.installed);

  if (installedBrowsers.length === 0) {
    return `No supported Chromium browsers were found for ${sourceLabel}. Install Chrome, Dia, Brave, or Arc, or override the browser selection manually.`;
  }

  return `No Chromium profiles with cookies were found for ${sourceLabel}. Confirm that you have signed in through one of the installed browsers first.`;
}

function formatCookieProbeError(sourceLabel: string, failures: CookieProbeFailure[]): string {
  const details = failures
    .map((failure) => `${formatCookieProbeLabel(failure)}: ${failure.message}`)
    .join("; ");
  return `Could not find an authenticated ${sourceLabel} session automatically. Checked ${details}.`;
}

function formatCookieProbeLabel(candidate: CookieProbeCandidate): string {
  return `${candidate.browserId}/${candidate.profile ?? "Default"}`;
}

function compactErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/\s+/g, " ").trim();
}

function expandKindRuns(
  metadata: SyncSourceMetadata,
  options: SyncCommandOptions,
): SyncCommandOptions[] {
  const canonicalKind = options.kind
    ? (canonicalizeMetadataKind(metadata, options.kind) ?? options.kind)
    : undefined;

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

export const __internal = {
  buildCookieProbeCandidates,
  compactErrorMessage,
  formatCookieProbeError,
  normalizeRequestedBrowser,
  prioritizeRememberedProfile,
  resolveCookieBackedOptions,
};

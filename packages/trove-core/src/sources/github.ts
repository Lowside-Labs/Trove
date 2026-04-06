import type { ProgressHandler } from "../core/progress.js";
import path from "node:path";
import { parse } from "node-html-parser";
import { getChromiumSession, listChromiumBrowsers } from "../auth/chromium.js";
import { createJsonlSink, createTimestampedFileName } from "../core/raw.js";
import type { SupportedBrowserId } from "../types/browser.js";
import type { TroveItem } from "../types/item.js";

const GITHUB_BASE_URL = "https://github.com";
const MAX_STALLED_PAGES = 3;

interface GitHubSyncOptions {
  browserId: SupportedBrowserId;
  profile?: string;
  kind?: string;
  limit?: number;
  cursor?: string;
  onProgress?: ProgressHandler;
}

export interface GitHubSyncResult {
  items: TroveItem[];
  rawPath: string;
  nextCursor?: string;
}

interface ParsedStarsPage {
  username?: string;
  items: TroveItem[];
  rawItems: Record<string, unknown>[];
  nextPageUrl?: string;
}

export async function syncGitHubStars(options: GitHubSyncOptions): Promise<GitHubSyncResult> {
  const kind = normalizeKind(options.kind);

  if (kind !== "stars") {
    throw new Error('GitHub sync kind must be "stars".');
  }

  const session = await getChromiumSession(
    options.browserId,
    options.profile,
    ["https://github.com/"],
    "GitHub",
  );
  const scope = `${options.browserId}-${(options.profile ?? "Default").replaceAll(path.sep, "-")}-${kind}`;
  const rawSink = createJsonlSink("github", createTimestampedFileName(scope));
  const items: TroveItem[] = [];
  const seenIds = new Set<string>();
  const markerId = options.cursor;
  emitProgress(options.onProgress, "bootstrap", "Loading GitHub stars landing page");
  const bootstrapHtml = await fetchStarsPage(session.cookieHeader, `${GITHUB_BASE_URL}/stars`);
  const bootstrapPage = parseStarsPage(bootstrapHtml);
  const username = bootstrapPage.username;

  if (!username) {
    throw new Error("Could not determine the authenticated GitHub username from the stars page.");
  }

  emitProgress(options.onProgress, "bootstrap", `Resolved authenticated user ${username}`);
  let nextPageUrl = buildStarsRepositoriesUrl(username);
  let nextCursor: string | undefined;
  let pageNumber = 1;
  let stalledPages = 0;

  while (nextPageUrl) {
    const requestedPageUrl = nextPageUrl;
    emitProgress(options.onProgress, "page", `Fetching stars page ${pageNumber}`);
    const html = await fetchStarsPage(session.cookieHeader, nextPageUrl);
    const page = parseStarsPage(html);
    let importedCount = 0;

    if (!nextCursor) {
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
        return nextCursor
          ? { items, rawPath: rawSink.path, nextCursor }
          : { items, rawPath: rawSink.path };
      }

      if (seenIds.has(item.externalId)) {
        continue;
      }

      items.push(item);
      seenIds.add(item.externalId);
      importedCount += 1;

      if (typeof options.limit === "number" && items.length >= options.limit) {
        return nextCursor
          ? { items, rawPath: rawSink.path, nextCursor }
          : { items, rawPath: rawSink.path };
      }
    }

    emitProgress(options.onProgress, "page", `Fetched stars page ${pageNumber}`, items.length);

    if (!page.nextPageUrl || page.items.length === 0) {
      break;
    }

    if (page.nextPageUrl === requestedPageUrl) {
      break;
    }

    stalledPages = importedCount === 0 ? stalledPages + 1 : 0;

    if (stalledPages >= MAX_STALLED_PAGES) {
      break;
    }

    nextPageUrl = page.nextPageUrl;
    pageNumber += 1;
  }

  return nextCursor
    ? { items, rawPath: rawSink.path, nextCursor }
    : { items, rawPath: rawSink.path };
}

export async function validateGitHubSession(cookieHeader: string): Promise<void> {
  await fetchStarsPage(cookieHeader, `${GITHUB_BASE_URL}/stars`);
}

export function formatAvailableGitHubBrowserList(): string {
  return listChromiumBrowsers()
    .filter((browser) => browser.installed)
    .map((browser) => `${browser.id} (${browser.name})`)
    .join(", ");
}

async function fetchStarsPage(cookieHeader: string, url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      accept: "text/html,*/*",
      cookie: cookieHeader,
      "user-agent": "Mozilla/5.0",
    },
    redirect: "follow",
  });

  const html = await response.text();

  if (!response.ok) {
    throw new Error(`GitHub stars request failed with ${response.status}: ${html.slice(0, 200)}`);
  }

  if (response.url.includes("/login?return_to=") || html.includes('class="html-auth"')) {
    throw new Error("GitHub is not logged in in the selected browser profile.");
  }

  return html;
}

function parseStarsPage(html: string): ParsedStarsPage {
  const root = parse(html);
  const username = extractUsername(root);
  const items: TroveItem[] = [];
  const rawItems: Record<string, unknown>[] = [];

  for (const entry of root.querySelectorAll("li.source")) {
    const parsed = parseStarEntry(entry);

    if (!parsed) {
      continue;
    }

    items.push(parsed.item);
    rawItems.push(parsed.raw);
  }

  const nextPageHref = extractNextPageHref(root);

  return {
    ...(username ? { username } : {}),
    items,
    rawItems,
    ...(nextPageHref ? { nextPageUrl: toAbsoluteUrl(nextPageHref) } : {}),
  };
}

function extractUsername(root: ReturnType<typeof parse>): string | undefined {
  const filters = root.querySelectorAll('.filter-list a[href^="/stars/"]');

  for (const filter of filters) {
    const href = filter.getAttribute("href");
    const username = href?.match(/^\/stars\/([^/?#]+)/)?.[1];

    if (username) {
      return username;
    }
  }

  return undefined;
}

function buildStarsRepositoriesUrl(username: string): string {
  return `${GITHUB_BASE_URL}/stars/${username}/repositories?filter=all`;
}

function extractNextPageHref(root: ReturnType<typeof parse>): string | undefined {
  const href =
    root.querySelector("a.next_page")?.getAttribute("href") ??
    root.querySelector('a[rel="next"]')?.getAttribute("href") ??
    root
      .querySelectorAll("a")
      .find((link) => link.text.trim() === "Next" && typeof link.getAttribute("href") === "string")
      ?.getAttribute("href") ??
    undefined;

  return href ? href.replaceAll("&amp;", "&") : undefined;
}

function parseStarEntry(
  entry: ReturnType<typeof parse>,
): { item: TroveItem; raw: Record<string, unknown> } | null {
  const repoLink = entry.querySelector("h3 a");
  const starredAt = entry.querySelector("relative-time")?.getAttribute("datetime");

  if (!repoLink || !starredAt) {
    return null;
  }

  const href = repoLink.getAttribute("href");

  if (!href) {
    return null;
  }

  const normalizedRepoName = normalizeWhitespace(repoLink.text);
  const fullName = normalizedRepoName.replace(/\s*\/\s*/g, "/");
  const [owner, repo] = fullName.split("/");

  if (!owner || !repo) {
    return null;
  }

  const url = toAbsoluteUrl(href);
  const description = entry.querySelector(".py-1 p")?.text.trim() ?? undefined;
  const language =
    entry.querySelector('[itemprop="programmingLanguage"]')?.text.trim() ?? undefined;
  const starCount = readMetric(entry, "/stargazers");
  const forkCount = readMetric(entry, "/forks");
  const item: TroveItem = {
    source: "github",
    kind: "star",
    externalId: fullName,
    title: fullName,
    url,
    savedAt: new Date(starredAt).toISOString(),
    author: owner,
    tags: ["github", "star"],
    ...(description ? { excerpt: description, content: description } : {}),
  };

  const raw: Record<string, unknown> = {
    platform: "github",
    kind: "star",
    owner,
    repo,
    fullName,
    repoUrl: url,
    starredAt,
    ...(description ? { description } : {}),
    ...(language ? { language } : {}),
    ...(starCount !== undefined ? { starCount } : {}),
    ...(forkCount !== undefined ? { forkCount } : {}),
  };

  return { item, raw };
}

function readMetric(entry: ReturnType<typeof parse>, hrefSuffix: string): number | undefined {
  const link = entry.querySelector(`a[href$="${hrefSuffix}"]`);
  const value = link?.text.trim().replaceAll(",", "");
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function toAbsoluteUrl(value: string): string {
  return new URL(value, GITHUB_BASE_URL).toString();
}

function normalizeKind(kind?: string): "stars" {
  if (!kind || kind === "stars" || kind === "star") {
    return "stars";
  }

  throw new Error('GitHub sync kind must be "stars".');
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
  buildStarsRepositoriesUrl,
  extractNextPageHref,
  extractUsername,
  normalizeWhitespace,
  parseStarsPage,
};

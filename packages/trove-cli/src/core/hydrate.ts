import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import TurndownService from "turndown";
import type { ProgressHandler } from "./progress.js";
import { runArchivePostProcessing } from "./archive.js";
import {
  buildHydratedContentRelativePath,
  renderMarkdownFrontmatter,
  writeHydratedMarkdown,
} from "./content.js";
import { ensureTroveDirs } from "./fs.js";
import type { VaultArtifacts } from "./vault.js";
import { listItems, openDatabase, updateItemHydration, type StoredItem } from "../db/database.js";

const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36";
const BLOCKED_HOSTS = new Set([
  "claude.ai",
  "github.com",
  "news.ycombinator.com",
  "x.com",
  "twitter.com",
  "chatgpt.com",
]);
const turndown = new TurndownService({
  codeBlockStyle: "fenced",
  headingStyle: "atx",
});

export interface HydrateOptions {
  limit?: number;
  source?: string;
  force?: boolean;
  onProgress?: ProgressHandler;
}

export interface HydrateResult {
  hydratedCount: number;
  skippedCount: number;
  failedCount: number;
  contentPaths: string[];
  vaultArtifacts: VaultArtifacts;
}

export async function hydrateArchive(
  root: string | undefined,
  options: HydrateOptions,
): Promise<HydrateResult> {
  const paths = ensureTroveDirs(root);
  const db = openDatabase(paths.root);

  try {
    emitProgress(options.onProgress, "scan", "Scanning archive for hydration candidates");
    const items = listItems(db, {
      ...(options.source ? { source: options.source } : {}),
      ...(options.force ? {} : { missingContentOnly: true }),
    });
    const candidates = items.filter(isHydrationCandidate).slice(0, options.limit);
    emitProgress(
      options.onProgress,
      "scan",
      `Found ${candidates.length} hydration candidate${candidates.length === 1 ? "" : "s"}`,
      candidates.length,
      candidates.length,
    );
    const contentPaths: string[] = [];
    let hydratedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const [index, item] of candidates.entries()) {
      try {
        emitProgress(
          options.onProgress,
          "fetch",
          `Fetching ${item.title}`,
          index,
          candidates.length,
        );
        const fetched = await fetchHtml(item.url);
        emitProgress(
          options.onProgress,
          "extract",
          `Extracting ${item.title}`,
          index,
          candidates.length,
        );
        const document = extractReadableDocument(fetched.html, item.url);

        if (!document.content || document.content.trim().length === 0) {
          skippedCount += 1;
          emitProgress(
            options.onProgress,
            "persist",
            `Skipped ${item.title}`,
            index + 1,
            candidates.length,
          );
          continue;
        }

        const markdown = renderHydratedMarkdown(item, document);
        const outputPath = writeHydratedMarkdown(paths, item, markdown);
        updateItemHydration(db, item.id, {
          content: document.content,
          ...(document.excerpt ? { excerpt: item.excerpt ?? document.excerpt } : {}),
        });
        contentPaths.push(outputPath);
        hydratedCount += 1;
        emitProgress(
          options.onProgress,
          "persist",
          `Hydrated ${item.title}`,
          index + 1,
          candidates.length,
        );
      } catch {
        failedCount += 1;
        emitProgress(
          options.onProgress,
          "persist",
          `Failed ${item.title}`,
          index + 1,
          candidates.length,
        );
      }
    }

    const vaultArtifacts = runArchivePostProcessing(paths.root, options.onProgress);

    return {
      hydratedCount,
      skippedCount,
      failedCount,
      contentPaths,
      vaultArtifacts,
    };
  } finally {
    db.close();
  }
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

function isHydrationCandidate(item: StoredItem): boolean {
  if (typeof item.content === "string" && item.content.trim().length > 0) {
    return false;
  }

  try {
    const url = new URL(item.url);

    if (!["http:", "https:"].includes(url.protocol)) {
      return false;
    }

    if (BLOCKED_HOSTS.has(url.hostname)) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

async function fetchHtml(url: string): Promise<{ html: string }> {
  const response = await fetch(url, {
    headers: {
      accept: "text/html,application/xhtml+xml",
      "user-agent": DEFAULT_USER_AGENT,
    },
  });

  if (!response.ok) {
    throw new Error(`Hydration request failed with ${response.status}`);
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (!/html|xhtml/i.test(contentType)) {
    throw new Error(`Hydration response was not HTML: ${contentType}`);
  }

  return {
    html: await response.text(),
  };
}

function extractReadableDocument(
  html: string,
  url: string,
): {
  title: string;
  author?: string;
  excerpt?: string;
  content: string;
  markdown: string;
} {
  const dom = new JSDOM(html, { url });
  const article = new Readability(dom.window.document).parse();

  if (article?.textContent && article.content) {
    const title = cleanText(article.title) ?? url;
    const content = normalizeExtractedText(article.textContent);
    const author = cleanText(article.byline);
    const excerpt = cleanText(article.excerpt);
    const markdown = normalizeMarkdown(
      stripLeadingMarkdownTitle(turndown.turndown(article.content), title),
    );

    return {
      title,
      ...(author ? { author } : {}),
      ...(excerpt ? { excerpt } : {}),
      content,
      markdown,
    };
  }

  const fallback = extractFallbackDocument(html, url);

  return fallback;
}

function renderHydratedMarkdown(
  item: StoredItem,
  document: {
    title: string;
    author?: string;
    excerpt?: string;
    content: string;
    markdown: string;
  },
): string {
  const frontmatter = renderMarkdownFrontmatter({
    source: item.source,
    kind: item.kind,
    external_id: item.externalId,
    title: item.title,
    url: item.url,
    author: item.author ?? document.author,
    saved_at: item.savedAt,
    hydrated_at: new Date().toISOString(),
    tags: item.tags ?? [],
  });
  const body = [
    frontmatter,
    "",
    `# ${document.title || item.title}`,
    "",
    `Original URL: ${item.url}`,
    "",
    ...(document.excerpt ? [document.excerpt, ""] : []),
    document.markdown,
  ];

  return `${body.join("\n").trim()}\n`;
}

function extractFallbackDocument(
  html: string,
  url: string,
): {
  title: string;
  author?: string;
  excerpt?: string;
  content: string;
  markdown: string;
} {
  const dom = new JSDOM(html, { url });
  const document = dom.window.document;
  const title =
    readMetaContent(document, 'meta[property="og:title"]') ??
    readMetaContent(document, 'meta[name="twitter:title"]') ??
    cleanText(document.querySelector("title")?.textContent) ??
    cleanText(document.querySelector("h1")?.textContent) ??
    url;
  const author =
    readMetaContent(document, 'meta[name="author"]') ??
    readMetaContent(document, 'meta[property="article:author"]');
  const excerpt =
    readMetaContent(document, 'meta[name="description"]') ??
    readMetaContent(document, 'meta[property="og:description"]') ??
    firstMeaningfulParagraph(document);
  const contentRoot =
    document.querySelector("article") ??
    document.querySelector("main") ??
    document.querySelector("#content") ??
    document.querySelector(".content") ??
    document.body ??
    document.documentElement;
  const content = normalizeExtractedText(contentRoot?.textContent ?? "");
  const markdown = normalizeMarkdown(
    stripLeadingMarkdownTitle(turndown.turndown(contentRoot?.innerHTML ?? ""), title),
  );

  return {
    title,
    ...(author ? { author } : {}),
    ...(excerpt ? { excerpt } : {}),
    content,
    markdown,
  };
}

function readMetaContent(document: Document, selector: string): string | undefined {
  const value = document.querySelector(selector)?.getAttribute("content");
  return cleanText(value);
}

function firstMeaningfulParagraph(document: Document): string | undefined {
  for (const node of document.querySelectorAll("p")) {
    const text = cleanText(node.textContent);

    if (text && text.length >= 80) {
      return text;
    }
  }

  return undefined;
}

function normalizeExtractedText(value: string): string {
  return value
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter((line, index, lines) => {
      if (line.length === 0) {
        return index > 0 && lines[index - 1] !== "";
      }

      return !/^(sign in|subscribe|advertisement|share)$/i.test(line);
    })
    .join("\n")
    .trim();
}

function normalizeMarkdown(value: string): string {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function stripLeadingMarkdownTitle(markdown: string, title: string): string {
  const normalizedTitle = title.trim().toLowerCase();
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");

  if (
    lines[0]
      ?.replace(/^#+\s*/, "")
      .trim()
      .toLowerCase() === normalizedTitle
  ) {
    return lines.slice(1).join("\n").trim();
  }

  if (
    lines.length >= 2 &&
    lines[0]?.trim().toLowerCase() === normalizedTitle &&
    /^=+$/.test(lines[1]?.trim() ?? "")
  ) {
    return lines.slice(2).join("\n").trim();
  }

  return markdown;
}

function cleanText(value: string | undefined | null): string | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > 0 ? normalized : undefined;
}

export const __internal = {
  BLOCKED_HOSTS,
  extractReadableDocument,
  extractFallbackDocument,
  isHydrationCandidate,
  normalizeMarkdown,
  normalizeExtractedText,
  renderHydratedMarkdown,
  stripLeadingMarkdownTitle,
  buildHydratedContentRelativePath,
};

import fs from "node:fs";
import path from "node:path";
import { getArchiveOverview, getSourceStats, getTopAuthors, listItems, withDatabase, type StoredItem } from "../db/database.js";
import { listSyncSourceIds } from "../sources/index.js";
import { ensureTroveDirs } from "./fs.js";
import { buildHydratedContentRelativePath } from "./content.js";

const RECENT_WINDOW_DAYS = 30;
const RECENT_ITEM_LIMIT = 25;
const TOP_AUTHOR_LIMIT = 10;

export interface VaultArtifacts {
  indexPath: string;
  agentsPath: string;
  claudePath: string;
}

export function generateVaultArtifacts(root?: string): VaultArtifacts {
  const paths = ensureTroveDirs(root);
  const snapshot = withDatabase((db) => {
    const items = listItems(db);

    return {
      overview: getArchiveOverview(db),
      sourceStats: getSourceStats(db),
      topAuthors: getTopAuthors(db, TOP_AUTHOR_LIMIT),
      items,
    };
  }, paths.root);

  const indexPath = path.join(paths.root, "INDEX.md");
  const agentsPath = path.join(paths.root, "AGENTS.md");
  const claudePath = path.join(paths.root, "CLAUDE.md");

  fs.writeFileSync(indexPath, renderIndexMarkdown(snapshot), "utf8");

  const agentGuide = renderAgentGuideMarkdown();
  const claudeGuide = renderClaudeGuideMarkdown();
  fs.writeFileSync(agentsPath, agentGuide, "utf8");
  fs.writeFileSync(claudePath, claudeGuide, "utf8");

  return {
    indexPath,
    agentsPath,
    claudePath,
  };
}

function renderIndexMarkdown(snapshot: {
  overview: ReturnType<typeof getArchiveOverview>;
  sourceStats: ReturnType<typeof getSourceStats>;
  topAuthors: ReturnType<typeof getTopAuthors>;
  items: StoredItem[];
}): string {
  const now = new Date();
  const recentThreshold = new Date(now.getTime() - RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const sourceStatsById = new Map(snapshot.sourceStats.map((entry) => [entry.source, entry]));
  const itemsBySource = new Map<string, StoredItem[]>();
  const contentCount = snapshot.items.filter((item) => typeof item.content === "string" && item.content.trim().length > 0).length;

  for (const item of snapshot.items) {
    const bucket = itemsBySource.get(item.source) ?? [];
    bucket.push(item);
    itemsBySource.set(item.source, bucket);
  }

  const lines = [
    "# Trove Workspace Index",
    "",
    "This folder is meant to be opened directly in Claude Code, Codex, and other agent tools.",
    "",
    `Last updated: ${now.toISOString()}`,
    `Total items: ${snapshot.overview.totalItems}`,
    `Items with content: ${contentCount}`,
    "",
    "## Start here",
    "",
    "- `CLAUDE.md` — entry point for Claude Code",
    "- `AGENTS.md` — canonical guide for AGENTS-aware tools",
    "- `INDEX.md` — human-readable snapshot of sources, recent items, and authors",
    "- `content/<source>/*.md` — markdown for hydrated articles and exported chats",
    "",
    "## Sources",
    "",
  ];

  for (const sourceId of listSyncSourceIds()) {
    const sourceStats = sourceStatsById.get(sourceId);
    const items = itemsBySource.get(sourceId) ?? [];
    const kindSummary = formatKindSummary(items);
    const countLabel = `${sourceStats?.count ?? 0} item${sourceStats?.count === 1 ? "" : "s"}`;
    const suffix = sourceStats?.lastSyncedAt ? `, last synced ${sourceStats.lastSyncedAt.slice(0, 10)}` : "";
    lines.push(`- ${sourceId}: ${countLabel}${kindSummary ? ` (${kindSummary})` : ""}${suffix}`);
  }

  lines.push("", `## Recent items (last ${RECENT_WINDOW_DAYS} days)`, "");

  const recentItems = snapshot.items
    .filter((item) => {
      const parsed = Date.parse(item.savedAt);
      return Number.isFinite(parsed) && parsed >= recentThreshold.getTime();
    })
    .slice(0, RECENT_ITEM_LIMIT);

  if (recentItems.length === 0) {
    lines.push("- No recent items yet.");
  } else {
    for (const item of recentItems) {
      const kind = formatDisplayKind(item);
      const author = item.author ? ` — ${item.author}` : "";
      lines.push(`- [${item.savedAt.slice(0, 10)}] ${item.source}/${kind} [${escapeMarkdown(item.title)}](${item.url})${author}`);
    }
  }

  lines.push("", "## Top authors", "");

  if (snapshot.topAuthors.length === 0) {
    lines.push("- No authors captured yet.");
  } else {
    for (const entry of snapshot.topAuthors) {
      lines.push(`- ${entry.author} (${entry.count})`);
    }
  }

  lines.push(
    "",
    "## File layout",
    "",
    "- `AGENTS.md`, `CLAUDE.md`, `INDEX.md` — workspace guides for agents and humans",
    "- `raw/<source>/*.jsonl` — compact raw source payloads",
    "- `content/<source>/*.md` — hydrated readable content and chat exports",
    "- `data/trove.db` — SQLite archive and FTS5 search index",
    "",
    "## Suggested questions",
    "",
    "- What have I been saving about distributed systems in the last 6 months?",
    "- Which authors or publications recur across my saved items?",
    "- What did I like on Substack recently about local-first software?",
    "- Which items mention SQLite, FTS, or search infrastructure?",
  );

  return `${lines.join("\n")}\n`;
}

function renderAgentGuideMarkdown(): string {
  return [
    "# Trove Workspace Guide",
    "",
    "This is the canonical agent guide for this Trove workspace.",
    "",
    "This directory is a local-first knowledge workspace built from saved items, likes, stars, favorites, and chat exports collected by Trove.",
    "`CLAUDE.md` imports this file so Claude Code and AGENTS-aware tools share the same working context.",
    "",
    "## Start here",
    "",
    "1. Read `INDEX.md` first for source counts, recent items, and top authors.",
    "2. Use `trove search \"<query>\"` when the CLI is available from inside this workspace.",
    "3. If the CLI is not available, query `data/trove.db` directly with `sqlite3`.",
    "4. Read `content/<source>/*.md` for hydrated articles and exported chat transcripts.",
    "5. Read `raw/<source>/*.jsonl` when you need the source-native payload shape.",
    "",
    "## Useful commands",
    "",
    "```bash",
    "trove search 'distributed systems'",
    "sqlite3 data/trove.db \"SELECT title, url, source, saved_at FROM items WHERE id IN (SELECT rowid FROM items_fts WHERE items_fts MATCH 'distributed systems' ORDER BY bm25(items_fts) LIMIT 20);\"",
    "rg -n \"local-first|sqlite|crdt\" content/",
    "```",
    "",
    "## Schema",
    "",
    "Each item in `data/trove.db` stores: `source`, `kind`, `external_id`, `title`, `url`, `excerpt`, `content`, `author`, `saved_at`, `imported_at`, `tags_json`, and `raw_json`.",
    "",
    "## Working style",
    "",
    "- Prefer grounded answers using the item title, URL, and quotes from `content/` when available.",
    "- For source-specific details, inspect `raw_json` via SQLite or the matching `raw/<source>/*.jsonl` file.",
    "- If an item has no hydrated markdown yet, recommend running `trove hydrate`.",
  ].join("\n");
}

function renderClaudeGuideMarkdown(): string {
  return [
    "@AGENTS.md",
    "",
    "## Claude Code",
    "",
    "- Treat this folder as the working directory for questions about the saved material.",
    "- Start from `INDEX.md` for a quick snapshot of what is in the workspace.",
  ].join("\n");
}

function formatKindSummary(items: StoredItem[]): string {
  const counts = new Map<string, number>();

  for (const item of items) {
    const key = formatDisplayKind(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([kind, count]) => `${kind}: ${count}`)
    .join(", ");
}

function formatDisplayKind(item: StoredItem): string {
  switch (item.kind) {
    case "bookmark":
      return "bookmarks";
    case "like":
      return "likes";
    case "saved":
      return "saved";
    case "star":
      return "stars";
    case "favorite":
      return "favorites";
    case "favorite-comment":
      return "favorite-comments";
    case "chat":
      return "chats";
    default:
      break;
  }

  return item.source;
}

function escapeMarkdown(value: string): string {
  return value.replace(/[[\]]/g, "\\$&");
}

export const __internal = {
  formatDisplayKind,
  formatKindSummary,
  renderClaudeGuideMarkdown,
  renderAgentGuideMarkdown,
  renderIndexMarkdown,
  buildHydratedContentRelativePath,
};

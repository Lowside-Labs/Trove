import type { TroveItem } from "../types/item.js";

export function getDemoItems(): TroveItem[] {
  const now = new Date().toISOString();

  return [
    {
      source: "demo",
      externalId: "x-bookmark-1",
      title: "Browser cookie extraction patterns for local-first tools",
      url: "https://example.com/browser-cookie-extraction",
      excerpt: "Notes on extracting authenticated browser state without forcing a fresh login flow.",
      content:
        "A local-first sync tool should separate authentication strategy from source adapters. Cookie reuse can be fast, but it must be treated as a fragile capability and backed by more durable fallbacks.",
      author: "Trove Demo",
      savedAt: "2026-04-01T18:30:00.000Z",
      importedAt: now,
      tags: ["auth", "browser", "local-first"],
      raw: { platform: "x", kind: "bookmark" },
    },
    {
      source: "demo",
      externalId: "history-1",
      title: "Research memory and why browsing history matters",
      url: "https://example.com/research-memory",
      excerpt: "Turning scattered reading sessions into a structured research timeline.",
      content:
        "Browsing history is more than a log of URLs. It is a record of attention. When grouped into sessions and enriched with content, it becomes a useful memory system for future search and synthesis.",
      author: "Trove Demo",
      savedAt: "2026-04-02T09:15:00.000Z",
      importedAt: now,
      tags: ["history", "memory", "research"],
      raw: { platform: "history", kind: "visit" },
    },
    {
      source: "demo",
      externalId: "github-star-1",
      title: "SQLite FTS5 as the default search layer",
      url: "https://example.com/sqlite-fts5",
      excerpt: "Why one embedded database can cover indexing, ranking, and portability for a CLI.",
      content:
        "FTS5 is a strong default for personal knowledge tools. It keeps the stack small, avoids external services, and still supports fast full-text lookup with ranking.",
      author: "Trove Demo",
      savedAt: "2026-04-03T14:45:00.000Z",
      importedAt: now,
      tags: ["sqlite", "fts5", "search"],
      raw: { platform: "github", kind: "star" },
    },
  ];
}

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  getArchiveOverview,
  getSourceStats,
  getSyncState,
  openDatabase,
  searchItems,
  upsertItems,
  upsertSyncState,
  withDatabase,
} from "./database.js";
import type { TroveItem } from "../types/item.js";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("database", () => {
  it("indexes and searches imported items", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "trove-test-"));
    roots.push(root);

    const db = openDatabase(root);
    upsertItems(db, getFixtureItems());

    const results = searchItems(db, "browser", 5);

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.title).toContain("Browser");

    db.close();
  });

  it("distinguishes newly inserted rows from updated rows", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "trove-test-"));
    roots.push(root);

    const db = openDatabase(root);
    const firstResult = upsertItems(db, getFixtureItems());
    const secondResult = upsertItems(
      db,
      getFixtureItems().map((item) => ({
        ...item,
        title: `${item.title} refreshed`,
      })),
    );

    expect(firstResult).toEqual({ insertedCount: 2, updatedCount: 0 });
    expect(secondResult).toEqual({ insertedCount: 0, updatedCount: 2 });

    db.close();
  });

  it("persists sync state records", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "trove-test-"));
    roots.push(root);

    const db = openDatabase(root);
    upsertSyncState(db, {
      source: "x",
      scope: "chrome:Default",
      cursor: "cursor-123",
      metadata: { browserId: "chrome" },
    });

    const state = getSyncState(db, "x", "chrome:Default");

    expect(state?.cursor).toBe("cursor-123");
    expect(state?.metadata).toEqual({ browserId: "chrome" });

    db.close();
  });

  it("reports source stats and archive freshness", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "trove-test-"));
    roots.push(root);

    const db = openDatabase(root);
    upsertItems(db, getFixtureItems());
    upsertSyncState(db, {
      source: "fixture",
      scope: "fixture:default",
      cursor: "cursor-123",
      lastSyncedAt: "2026-04-05T08:00:00.000Z",
    });

    expect(getSourceStats(db)).toEqual([
      {
        source: "fixture",
        count: 2,
        lastSyncedAt: "2026-04-05T08:00:00.000Z",
      },
    ]);
    expect(getArchiveOverview(db)).toEqual({
      totalItems: 2,
      totalSources: 1,
      lastSyncedAt: "2026-04-05T08:00:00.000Z",
    });

    db.close();
  });

  it("uses stemming and diacritic folding in FTS search", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "trove-test-"));
    roots.push(root);

    const items: TroveItem[] = [
      {
        source: "fixture",
        externalId: "stemming-1",
        title: "Distributed systems",
        url: "https://example.com/distributed",
        content: "A distributed cache can synchronize state.",
        savedAt: new Date("2026-04-04T00:00:00.000Z").toISOString(),
        tags: ["cafe"],
      },
      {
        source: "fixture",
        externalId: "accent-1",
        title: "Cafe notes",
        url: "https://example.com/cafe",
        content: "Meeting notes from the cafe.",
        savedAt: new Date("2026-04-04T00:00:00.000Z").toISOString(),
        tags: ["cafe"],
      },
    ];

    const db = openDatabase(root);
    upsertItems(db, items);

    expect(searchItems(db, "distribute", 5).map((item) => item.externalId)).toContain("stemming-1");
    expect(searchItems(db, "café", 5).map((item) => item.externalId)).toContain("accent-1");
    expect(searchItems(db, "tags:cafe", 5).map((item) => item.externalId)).toEqual(
      expect.arrayContaining(["stemming-1", "accent-1"]),
    );

    db.close();
  });

  it("closes the database when using withDatabase", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "trove-test-"));
    roots.push(root);

    const result = withDatabase((db) => {
      upsertItems(db, getFixtureItems());
      return searchItems(db, "browser", 1).length;
    }, root);

    expect(result).toBe(1);
  });
});

function getFixtureItems(): TroveItem[] {
  const now = new Date().toISOString();

  return [
    {
      source: "fixture",
      externalId: "browser-1",
      title: "Browser cookie extraction patterns for local-first tools",
      url: "https://example.com/browser-cookie-extraction",
      excerpt: "Notes on extracting authenticated browser state without forcing a fresh login flow.",
      content:
        "A local-first sync tool should separate authentication strategy from source adapters. Cookie reuse can be fast, but it must be treated as a fragile capability and backed by more durable fallbacks.",
      author: "Trove Test Fixture",
      savedAt: "2026-04-01T18:30:00.000Z",
      importedAt: now,
      tags: ["auth", "browser", "local-first"],
      raw: { platform: "fixture", kind: "bookmark" },
    },
    {
      source: "fixture",
      externalId: "history-1",
      title: "Research memory and why browsing history matters",
      url: "https://example.com/research-memory",
      excerpt: "Turning scattered reading sessions into a structured research timeline.",
      content:
        "Browsing history is more than a log of URLs. It is a record of attention. When grouped into sessions and enriched with content, it becomes a useful memory system for future search and synthesis.",
      author: "Trove Test Fixture",
      savedAt: "2026-04-02T09:15:00.000Z",
      importedAt: now,
      tags: ["history", "memory", "research"],
      raw: { platform: "fixture", kind: "visit" },
    },
  ];
}

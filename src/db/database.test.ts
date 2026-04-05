import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { getSyncState, openDatabase, searchItems, upsertItems, upsertSyncState, withDatabase } from "./database.js";
import { getDemoItems } from "../sources/demo.js";
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
    upsertItems(db, getDemoItems());

    const results = searchItems(db, "browser", 5);

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.title).toContain("Browser");

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

  it("uses stemming and diacritic folding in FTS search", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "trove-test-"));
    roots.push(root);

    const items: TroveItem[] = [
      {
        source: "demo",
        externalId: "stemming-1",
        title: "Distributed systems",
        url: "https://example.com/distributed",
        content: "A distributed cache can synchronize state.",
        savedAt: new Date("2026-04-04T00:00:00.000Z").toISOString(),
        tags: ["cafe"],
      },
      {
        source: "demo",
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
      upsertItems(db, getDemoItems());
      return searchItems(db, "browser", 1).length;
    }, root);

    expect(result).toBe(1);
  });
});

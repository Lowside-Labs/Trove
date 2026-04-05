import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { getSyncState, openDatabase, searchItems, upsertItems, upsertSyncState } from "./database.js";
import { getDemoItems } from "../sources/demo.js";

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
});

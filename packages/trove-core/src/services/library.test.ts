import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { openDatabase, upsertItems } from "../db/database.js";
import { getLibraryItem, listLibraryItems } from "./library.js";
import type { TroveItem } from "../types/item.js";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("library services", () => {
  it("lists the newest library items with desktop-friendly fields", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "trove-library-service-test-"));
    roots.push(root);

    const db = openDatabase(root);
    upsertItems(db, getFixtureItems());
    db.close();

    const items = listLibraryItems({}, root);

    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      source: "chatgpt",
      kind: "chat",
      hasContent: true,
    });
  });

  it("returns detailed item content and detects markdown-backed sources", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "trove-library-detail-test-"));
    roots.push(root);

    const db = openDatabase(root);
    upsertItems(db, getFixtureItems());
    db.close();

    const item = getLibraryItem({ id: 1 }, { root });

    expect(item).toMatchObject({
      id: 1,
      source: "chatgpt",
      contentFormat: "markdown",
    });
  });

  it("filters search results by source when a query is present", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "trove-library-search-test-"));
    roots.push(root);

    const db = openDatabase(root);
    upsertItems(db, getFixtureItems());
    db.close();

    const items = listLibraryItems(
      {
        query: "agent",
        source: "github",
      },
      root,
    );

    expect(items).toHaveLength(1);
    expect(items[0]?.source).toBe("github");
  });
});

function getFixtureItems(): TroveItem[] {
  return [
    {
      source: "chatgpt",
      kind: "chat",
      externalId: "chat-1",
      title: "Planning the desktop app",
      url: "https://chatgpt.com/c/chat-1",
      excerpt: "Notes on process boundaries for the new desktop app.",
      content: "# Desktop plan\n\nKeep the renderer thin and call into core.",
      author: "OpenAI",
      savedAt: "2026-04-05T09:00:00.000Z",
      importedAt: "2026-04-05T09:30:00.000Z",
      tags: ["chatgpt", "planning"],
      raw: {
        markdownPath: "/tmp/chat-1.md",
      },
    },
    {
      source: "github",
      kind: "star",
      externalId: "repo-1",
      title: "Electron agent patterns",
      url: "https://github.com/example/electron-agent-patterns",
      excerpt: "A repository about agent-friendly Electron workflows.",
      author: "example",
      savedAt: "2026-04-04T09:00:00.000Z",
      importedAt: "2026-04-04T09:30:00.000Z",
      tags: ["github", "agent"],
    },
  ];
}

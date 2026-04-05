import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { openDatabase, upsertItems, upsertSyncState } from "../db/database.js";
import { generateVaultArtifacts } from "./vault.js";
import type { TroveItem } from "../types/item.js";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("vault artifacts", () => {
  it("writes INDEX.md, AGENTS.md, and CLAUDE.md from the current archive state", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "trove-vault-test-"));
    roots.push(root);

    const db = openDatabase(root);
    const items: TroveItem[] = [
      {
        source: "substack",
        kind: "saved",
        externalId: "post-1",
        title: "Local-first search notes",
        url: "https://example.substack.com/p/local-first-search",
        savedAt: "2026-04-04T12:00:00.000Z",
        author: "Jane Doe",
        tags: ["substack", "saved"],
        raw: { kind: "saved" },
      },
      {
        source: "x",
        kind: "like",
        externalId: "likes:1",
        title: "@author: Browser session reuse",
        url: "https://x.com/author/status/1",
        savedAt: "2026-04-03T12:00:00.000Z",
        author: "Author",
        content: "Browser session reuse can be a fast auth strategy.",
        tags: ["x", "like"],
        raw: { kind: "like" },
      },
      {
        source: "claude",
        kind: "chat",
        externalId: "chat-1",
        title: "Research session",
        url: "https://claude.ai/chat/chat-1",
        savedAt: "2026-04-02T12:00:00.000Z",
        tags: ["claude", "chat"],
      },
    ];

    upsertItems(db, items);
    upsertSyncState(db, {
      source: "substack",
      scope: "dia:Default:saved",
      lastSyncedAt: "2026-04-05T08:00:00.000Z",
    });
    db.close();

    const artifacts = generateVaultArtifacts(root);
    const index = fs.readFileSync(artifacts.indexPath, "utf8");
    const agents = fs.readFileSync(artifacts.agentsPath, "utf8");
    const claude = fs.readFileSync(artifacts.claudePath, "utf8");

    expect(index).toContain("# Trove Workspace Index");
    expect(index).toContain("Total items: 3");
    expect(index).toContain("Items with content: 1");
    expect(index).toContain("substack: 1 item (saved: 1), last synced 2026-04-05");
    expect(index).toContain("x: 1 item (likes: 1)");
    expect(index).toContain("claude: 1 item (chats: 1)");
    expect(index).toContain("Local-first search notes");
    expect(agents).toContain("Read `INDEX.md` first");
    expect(agents).toContain("`CLAUDE.md` imports this file");
    expect(claude).toContain("@AGENTS.md");
  });
});

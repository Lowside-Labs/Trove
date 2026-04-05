import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { listItems, openDatabase, upsertItems, withDatabase } from "../db/database.js";
import { hydrateArchive, __internal } from "./hydrate.js";
import type { TroveItem } from "../types/item.js";

const roots: string[] = [];

afterEach(() => {
  vi.unstubAllGlobals();

  for (const root of roots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("hydrate", () => {
  it("hydrates external links into markdown files and SQLite content", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "trove-hydrate-test-"));
    roots.push(root);

    const db = openDatabase(root);
    const items: TroveItem[] = [
      {
        source: "hn",
        kind: "favorite",
        externalId: "story-1",
        title: "Interesting systems article",
        url: "https://example.com/article",
        savedAt: "2026-04-05T08:00:00.000Z",
        tags: ["hn", "favorite"],
        raw: { kind: "favorite" },
      },
    ];
    upsertItems(db, items);
    db.close();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        headers: {
          get: (name: string) => (name.toLowerCase() === "content-type" ? "text/html; charset=utf-8" : null),
        },
        text: async () => `
          <html>
            <head>
              <title>Interesting systems article</title>
              <meta name="description" content="A useful article about local-first systems.">
              <meta name="author" content="Ada Lovelace">
            </head>
            <body>
              <article>
                <h1>Interesting systems article</h1>
                <p>A useful article about local-first systems.</p>
                <p>Distributed systems are easier to reason about when you understand the consistency model.</p>
              </article>
            </body>
          </html>
        `,
      }),
    );

    const result = await hydrateArchive(root, { limit: 10 });

    expect(result.hydratedCount).toBe(1);
    expect(result.failedCount).toBe(0);
    expect(result.skippedCount).toBe(0);
    expect(result.contentPaths).toHaveLength(1);

    const markdown = fs.readFileSync(result.contentPaths[0] as string, "utf8");
    expect(markdown).toContain('source: "hn"');
    expect(markdown).toContain("# Interesting systems article");
    expect(markdown).toContain("Distributed systems are easier to reason about");

    const hydratedItem = withDatabase((hydrationDb) => listItems(hydrationDb, { source: "hn" })[0], root);
    expect(hydratedItem?.content).toContain("Distributed systems are easier to reason about");
    expect(hydratedItem?.excerpt).toBe("A useful article about local-first systems.");
    expect(fs.existsSync(result.vaultArtifacts.indexPath)).toBe(true);
  });

  it("skips blocked native hosts during the external hydration pass", () => {
    expect(
      __internal.isHydrationCandidate({
        id: 1,
        source: "github",
        kind: "star",
        externalId: "owner/repo",
        title: "owner/repo",
        url: "https://github.com/owner/repo",
        savedAt: "2026-04-05T08:00:00.000Z",
        tags: ["github", "star"],
      }),
    ).toBe(false);
  });
});

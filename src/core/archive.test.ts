import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { openDatabase, upsertItems } from "../db/database.js";
import { buildVaultSummarySection, runArchivePostProcessing } from "./archive.js";
import type { TroveItem } from "../types/item.js";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("archive post-processing", () => {
  it("refreshes vault artifacts and emits a reusable summary section", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "trove-archive-test-"));
    roots.push(root);

    const db = openDatabase(root);
    upsertItems(db, [
      {
        source: "hn",
        kind: "favorite",
        externalId: "story-1",
        title: "Archive hooks",
        url: "https://example.com/archive-hooks",
        savedAt: "2026-04-05T08:00:00.000Z",
        tags: ["hn", "favorite"],
      } satisfies TroveItem,
    ]);
    db.close();

    const events: string[] = [];
    const vaultArtifacts = runArchivePostProcessing(root, (event) => {
      events.push(`${event.phase}:${event.message}`);
    });
    const section = buildVaultSummarySection(vaultArtifacts);

    expect(events).toEqual(["index:Refreshing workspace guides"]);
    expect(fs.existsSync(vaultArtifacts.indexPath)).toBe(true);
    expect(section.title).toBe("Workspace");
    expect(section.entries.map((entry) => entry.label)).toEqual(["Root", "Index", "AGENTS", "CLAUDE"]);
  });
});

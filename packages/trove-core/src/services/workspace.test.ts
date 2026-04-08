import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { saveSourceBrowserTarget } from "../core/paths.js";
import { afterEach, describe, expect, it } from "vitest";
import { openDatabase, upsertItems, upsertSyncState } from "../db/database.js";
import { getWorkspaceOverview, getWorkspaceSourceStatuses } from "./workspace.js";
import type { TroveItem } from "../types/item.js";

const roots: string[] = [];
const originalXdgConfigHome = process.env.XDG_CONFIG_HOME;

afterEach(() => {
  for (const root of roots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }

  if (originalXdgConfigHome === undefined) {
    delete process.env.XDG_CONFIG_HOME;
  } else {
    process.env.XDG_CONFIG_HOME = originalXdgConfigHome;
  }
});

describe("workspace services", () => {
  it("returns overview counts for a workspace root", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "trove-workspace-overview-test-"));
    const configHome = fs.mkdtempSync(path.join(os.tmpdir(), "trove-config-test-"));
    roots.push(root, configHome);
    process.env.XDG_CONFIG_HOME = configHome;

    const db = openDatabase(root);
    upsertItems(db, getFixtureItems());
    upsertSyncState(db, {
      source: "x",
      scope: "x:bookmarks",
      lastSyncedAt: "2026-04-05T10:00:00.000Z",
    });
    db.close();

    expect(getWorkspaceOverview(root)).toEqual({
      root,
      totalItems: 2,
      totalSources: 2,
      lastSyncedAt: "2026-04-05T10:00:00.000Z",
    });
  });

  it("includes every known source in source status, even with zero items", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "trove-source-status-test-"));
    const configHome = fs.mkdtempSync(path.join(os.tmpdir(), "trove-config-test-"));
    roots.push(root, configHome);
    process.env.XDG_CONFIG_HOME = configHome;

    const db = openDatabase(root);
    upsertItems(db, getFixtureItems());
    upsertSyncState(db, {
      source: "x",
      scope: "x:bookmarks",
      lastSyncedAt: "2026-04-05T10:00:00.000Z",
    });
    db.close();

    const statuses = getWorkspaceSourceStatuses(root);
    const xStatus = statuses.find((status) => status.id === "x");
    const chatGptStatus = statuses.find((status) => status.id === "chatgpt");

    expect(xStatus).toMatchObject({
      id: "x",
      displayName: "X",
      status: "active",
      itemCount: 1,
      lastSyncedAt: "2026-04-05T10:00:00.000Z",
    });
    expect(chatGptStatus).toMatchObject({
      id: "chatgpt",
      displayName: "ChatGPT",
      status: "available",
      itemCount: 0,
    });
  });

  it("marks sources with saved connection state but no items as connected-empty", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "trove-source-connected-empty-test-"));
    const configHome = fs.mkdtempSync(path.join(os.tmpdir(), "trove-config-test-"));
    roots.push(root, configHome);
    process.env.XDG_CONFIG_HOME = configHome;

    const db = openDatabase(root);
    db.close();

    saveSourceBrowserTarget("substack", {
      browserId: "chromium",
      profile: "Profile 1",
    });

    const statuses = getWorkspaceSourceStatuses(root);
    const substackStatus = statuses.find((status) => status.id === "substack");

    expect(substackStatus).toMatchObject({
      id: "substack",
      displayName: "Substack",
      status: "connected-empty",
      itemCount: 0,
    });
  });
});

function getFixtureItems(): TroveItem[] {
  return [
    {
      source: "x",
      kind: "bookmark",
      externalId: "x-bookmark-1",
      title: "Shipping a desktop shell",
      url: "https://x.com/example/status/1",
      savedAt: "2026-04-05T09:00:00.000Z",
      importedAt: "2026-04-05T09:10:00.000Z",
      tags: ["x"],
    },
    {
      source: "github",
      kind: "star",
      externalId: "repo-1",
      title: "Electron packaging notes",
      url: "https://github.com/example/electron-packaging-notes",
      savedAt: "2026-04-05T08:00:00.000Z",
      importedAt: "2026-04-05T08:10:00.000Z",
      tags: ["github"],
    },
  ];
}

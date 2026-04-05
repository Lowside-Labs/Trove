import { describe, expect, it } from "vitest";
import type { SearchResult } from "../types/item.js";
import { TerminalOutput, formatRelativeTime, renderCommandReport, renderCommandRunReports, renderInitReport, renderSearchResults, truncateText, wrapText } from "./output.js";

describe("output helpers", () => {
  it("wraps long text into readable lines", () => {
    expect(wrapText("Trove turns scattered saves into one archive.", 18)).toEqual([
      "Trove turns",
      "scattered saves",
      "into one archive.",
    ]);
  });

  it("preserves long uninterrupted tokens across wrapped lines", () => {
    expect(wrapText("abcdefghi", 4)).toEqual(["abcd", "efgh", "i"]);
  });

  it("truncates long values with ellipsis", () => {
    expect(truncateText("bookmarks-and-likes", 12)).toBe("bookmarks...");
  });

  it("formats relative time for recent timestamps", () => {
    expect(formatRelativeTime("2026-04-05T11:58:00.000Z", new Date("2026-04-05T12:00:00.000Z"))).toBe("2m ago");
  });

  it("reports only the displayed search result count", () => {
    const lines: string[] = [];
    const output = new TerminalOutput({
      stdout: {
        write: (chunk: string) => {
          lines.push(chunk);
          return true;
        },
        isTTY: false,
      },
      stderr: {
        write: () => true,
        isTTY: false,
      },
    });
    const results: SearchResult[] = [
      {
        id: 1,
        source: "x",
        kind: "bookmark",
        externalId: "bookmark-1",
        title: "Browser notes",
        url: "https://example.com/1",
        excerpt: "First result",
        savedAt: "2026-04-01T00:00:00.000Z",
        importedAt: "2026-04-05T00:00:00.000Z",
        tags: [],
        rank: 1,
      },
      {
        id: 2,
        source: "x",
        kind: "bookmark",
        externalId: "bookmark-2",
        title: "Browser details",
        url: "https://example.com/2",
        excerpt: "Second result",
        savedAt: "2026-04-02T00:00:00.000Z",
        importedAt: "2026-04-05T00:00:00.000Z",
        tags: [],
        rank: 2,
      },
    ];

    renderSearchResults(output, "browser", results, 2);

    const rendered = lines.join("");
    expect(rendered).toContain('Showing 2 results for "browser"');
    expect(rendered).not.toContain("Showing the requested limit");
    expect(rendered).not.toContain("2 matches");
  });

  it("renders the shared command report format", () => {
    const lines: string[] = [];
    const output = new TerminalOutput({
      stdout: {
        write: (chunk: string) => {
          lines.push(chunk);
          return true;
        },
        isTTY: false,
      },
      stderr: {
        write: () => true,
        isTTY: false,
      },
    });

    renderCommandReport(output, {
      headline: "Updated Trove vault artifacts.",
      sections: [
        {
          title: "Files",
          entries: [{ label: "Index", value: "/tmp/INDEX.md" }],
        },
      ],
      notes: ["Agents can now start from INDEX.md."],
    });

    const rendered = lines.join("");
    expect(rendered).toContain("Updated Trove vault artifacts.");
    expect(rendered).toContain("Files");
    expect(rendered).toContain("Index:");
    expect(rendered).toContain("/tmp/INDEX.md");
    expect(rendered).toContain("Agents can now start from INDEX.md.");
  });

  it("renders an agent-first init report", () => {
    const lines: string[] = [];
    const output = new TerminalOutput({
      stdout: {
        write: (chunk: string) => {
          lines.push(chunk);
          return true;
        },
        isTTY: false,
      },
      stderr: {
        write: () => true,
        isTTY: false,
      },
    });

    renderInitReport(
      output,
      {
        root: "/tmp/trove-workspace",
        dataDir: "/tmp/trove-workspace/data",
        rawDir: "/tmp/trove-workspace/raw",
        contentDir: "/tmp/trove-workspace/content",
        indexDir: "/tmp/trove-workspace/index",
        logDir: "/tmp/trove-workspace/logs",
        dbPath: "/tmp/trove-workspace/data/trove.db",
      },
      {
        indexPath: "/tmp/trove-workspace/INDEX.md",
        agentsPath: "/tmp/trove-workspace/AGENTS.md",
        claudePath: "/tmp/trove-workspace/CLAUDE.md",
      },
    );

    const rendered = lines.join("");
    expect(rendered).toContain("Initialized Trove workspace in /tmp/trove-workspace.");
    expect(rendered).toContain("AGENTS:");
    expect(rendered).toContain("/tmp/trove-workspace/AGENTS.md");
    expect(rendered).toContain("From inside this folder, `trove` commands target this workspace automatically.");
    expect(rendered).toContain("Trove will remember this workspace for future commands.");
    expect(rendered).toContain("cd /tmp/trove-workspace && claude");
  });

  it("renders multi-run command reports through the shared format", () => {
    const lines: string[] = [];
    const output = new TerminalOutput({
      stdout: {
        write: (chunk: string) => {
          lines.push(chunk);
          return true;
        },
        isTTY: false,
      },
      stderr: {
        write: () => true,
        isTTY: false,
      },
    });

    renderCommandRunReports(output, "x", [
      {
        label: "x/bookmarks",
        count: 3,
        headline: "Started a fresh X bookmarks sync.",
        sections: [],
      },
      {
        label: "x/likes",
        count: 2,
        headline: "Started a fresh X likes sync.",
        sections: [],
      },
    ]);

    const rendered = lines.join("");
    expect(rendered).toContain("Completed 2 sync runs for x. Imported 5 total items.");
    expect(rendered).toContain("X/BOOKMARKS");
    expect(rendered).toContain("X/LIKES");
  });
});

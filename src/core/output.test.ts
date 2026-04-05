import { describe, expect, it } from "vitest";
import type { SearchResult } from "../types/item.js";
import { TerminalOutput, formatRelativeTime, renderSearchResults, truncateText, wrapText } from "./output.js";

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
});

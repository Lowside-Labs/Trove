import { describe, expect, it } from "vitest";
import { __internal } from "./chatgpt.js";

function createSummary(id: string) {
  return {
    id,
    title: `Conversation ${id}`,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    raw: {},
  };
}

describe("chatgpt source helpers", () => {
  it("caps the recent refresh window to a small fixed size", () => {
    expect(__internal.resolveRecentRefreshLimit(20)).toBe(10);
    expect(__internal.resolveRecentRefreshLimit(50)).toBe(10);
    expect(__internal.resolveRecentRefreshLimit(5)).toBe(5);
  });

  it("parses stored backfill offsets safely", () => {
    expect(__internal.parseStoredOffset("40")).toBe(40);
    expect(__internal.parseStoredOffset("0")).toBe(0);
    expect(__internal.parseStoredOffset("-1")).toBeUndefined();
    expect(__internal.parseStoredOffset("bad")).toBeUndefined();
    expect(__internal.parseStoredOffset(undefined)).toBeUndefined();
  });

  it("only advances the backfill cursor through the contiguous successful prefix", () => {
    expect(
      __internal.countSuccessfulBackfillPrefix(
        [createSummary("a"), createSummary("b"), createSummary("c")],
        new Set(["a", "c"]),
      ),
    ).toBe(1);

    expect(
      __internal.resolveHybridNextCursor(
        {
          existingCursor: 10,
          backfillOffset: 10,
          backfillSummaries: [createSummary("a"), createSummary("b"), createSummary("c")],
          recentSummaries: [createSummary("r1"), createSummary("r2")],
        },
        new Set(["a", "c", "r1", "r2"]),
      ),
    ).toBe("11");
  });
});

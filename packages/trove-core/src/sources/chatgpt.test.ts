import { describe, expect, it } from "vitest";
import { __internal } from "./chatgpt.js";

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
        [{ id: "a" }, { id: "b" }, { id: "c" }],
        new Set(["a", "c"]),
      ),
    ).toBe(1);

    expect(
      __internal.resolveHybridNextCursor(
        {
          existingCursor: 10,
          backfillOffset: 10,
          backfillSummaries: [{ id: "a" }, { id: "b" }, { id: "c" }],
          recentSummaries: [{ id: "r1" }, { id: "r2" }],
        },
        new Set(["a", "c", "r1", "r2"]),
      ),
    ).toBe("11");
  });
});

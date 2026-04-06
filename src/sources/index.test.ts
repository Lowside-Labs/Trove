import { describe, expect, it } from "vitest";
import { assertSupportedKind, formatSupportedKindsHelp, getSyncSource } from "./index.js";

describe("source registry metadata", () => {
  it("canonicalizes supported kind aliases through the registry", () => {
    const xSource = getSyncSource("x");

    expect(xSource).toBeDefined();
    expect(assertSupportedKind(xSource as NonNullable<typeof xSource>, "bookmark")).toBe("bookmarks");
    expect(assertSupportedKind(xSource as NonNullable<typeof xSource>, "like")).toBe("likes");
  });

  it("expands default kinds from source metadata", () => {
    const instagramSource = getSyncSource("instagram");
    const substackSource = getSyncSource("substack");
    const hnSource = getSyncSource("hn");

    expect(instagramSource?.expandSyncRuns?.({ browser: "chrome" })).toEqual([
      { browser: "chrome", kind: "saved" },
    ]);
    expect(substackSource?.expandSyncRuns?.({ browser: "chrome" })).toEqual([
      { browser: "chrome", kind: "saved" },
      { browser: "chrome", kind: "likes" },
    ]);
    expect(hnSource?.expandSyncRuns?.({ browser: "chrome", user: "pg" })).toEqual([
      { browser: "chrome", user: "pg", kind: "favorites" },
      { browser: "chrome", user: "pg", kind: "favorite-comments" },
    ]);
  });

  it("formats kind help text from source metadata", () => {
    expect(formatSupportedKindsHelp()).toContain("github: stars");
    expect(formatSupportedKindsHelp()).toContain("instagram: saved");
    expect(formatSupportedKindsHelp()).toContain("x: bookmarks | likes");
    expect(formatSupportedKindsHelp()).toContain("substack: saved | likes");
  });
});

import { describe, expect, it } from "vitest";
import { assertSupportedKind, formatSupportedKindsHelp, getSyncSource } from "./index.js";

describe("source registry metadata", () => {
  it("canonicalizes supported kind aliases through the registry", () => {
    const xSource = getSyncSource("x");

    expect(xSource).toBeDefined();
    expect(assertSupportedKind(xSource as NonNullable<typeof xSource>, "bookmark")).toBe(
      "bookmark",
    );
    expect(assertSupportedKind(xSource as NonNullable<typeof xSource>, "like")).toBe("like");
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
      { browser: "chrome", kind: "like" },
    ]);
    expect(hnSource?.expandSyncRuns?.({ browser: "chrome", user: "pg" })).toEqual([
      { browser: "chrome", user: "pg", kind: "upvoted" },
      { browser: "chrome", user: "pg", kind: "upvoted-comment" },
    ]);
  });

  it("formats kind help text from source metadata", () => {
    expect(formatSupportedKindsHelp()).toContain("github: stars");
    expect(formatSupportedKindsHelp()).toContain("hn: upvoted | upvoted-comment");
    expect(formatSupportedKindsHelp()).toContain("instagram: saved");
    expect(formatSupportedKindsHelp()).toContain("x: bookmark | like");
    expect(formatSupportedKindsHelp()).toContain("substack: saved | like");
  });
});

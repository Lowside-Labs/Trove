import { describe, expect, it } from "vitest";
import { __internal } from "./google-chrome.js";

describe("google chrome applescript helpers", () => {
  it("parses tab records emitted by the AppleScript listing", () => {
    expect(__internal.parseGoogleChromeTabLine("101\t202\thttps://chatgpt.com/\ttrue")).toEqual({
      windowId: 101,
      tabId: 202,
      url: "https://chatgpt.com/",
      isActive: true,
    });
  });

  it("matches exact hosts and subdomains", () => {
    expect(__internal.matchesHosts("https://chatgpt.com/", ["chatgpt.com"])).toBe(true);
    expect(__internal.matchesHosts("https://foo.claude.ai/chat", ["claude.ai"])).toBe(true);
    expect(__internal.matchesHosts("https://example.com/", ["chatgpt.com"])).toBe(false);
  });

  it("builds a synchronous XHR script with the provided headers", () => {
    const script = __internal.buildSynchronousFetchScript({
      path: "/api/example",
      headers: {
        authorization: "Bearer test-token",
      },
    });

    expect(script).toContain('xhr.open(request.method || "GET", request.path, false)');
    expect(script).toContain('"path":"/api/example"');
    expect(script).toContain('"authorization":"Bearer test-token"');
  });
});

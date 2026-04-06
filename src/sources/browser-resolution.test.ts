import { beforeEach, describe, expect, it, vi } from "vitest";

const getChromiumSession = vi.fn();
const findGoogleChromeTab = vi.fn();
const isSupportedBrowserId = vi.fn((value: string) => ["chrome", "dia", "brave", "arc"].includes(value));
const listChromiumBrowsers = vi.fn();
const listChromiumProfiles = vi.fn();
const findAttachableCdpUrl = vi.fn();
const getSavedSourceBrowserTarget = vi.fn();
const validateGitHubSession = vi.fn();
const validateSubstackSession = vi.fn();
const validateXSession = vi.fn();

vi.mock("../auth/cdp.js", () => ({
  findAttachableCdpUrl,
}));

vi.mock("../auth/google-chrome.js", () => ({
  findGoogleChromeTab,
}));

vi.mock("../auth/chromium.js", () => ({
  getChromiumSession,
  isSupportedBrowserId,
  listChromiumBrowsers,
  listChromiumProfiles,
}));

vi.mock("../core/paths.js", () => ({
  getSavedSourceBrowserTarget,
}));

vi.mock("./claude.js", () => ({
  syncClaudeChats: vi.fn(),
}));

vi.mock("./chatgpt.js", () => ({
  syncChatGptChats: vi.fn(),
}));

vi.mock("./github.js", () => ({
  formatAvailableGitHubBrowserList: vi.fn(() => "chrome, dia"),
  syncGitHubStars: vi.fn(),
  validateGitHubSession,
}));

vi.mock("./hn/index.js", () => ({
  syncHnFavorites: vi.fn(),
}));

vi.mock("./substack.js", () => ({
  syncSubstackSaved: vi.fn(),
  validateSubstackSession,
}));

vi.mock("./x.js", () => ({
  formatAvailableBrowserList: vi.fn(() => "chrome, dia"),
  syncXBookmarks: vi.fn(),
  validateXSession,
}));

function createBrowser(id: "chrome" | "dia", name: string) {
  return {
    id,
    name,
    executablePath: `/Applications/${name}.app`,
    userDataDir: `/Users/test/Library/Application Support/${name}`,
    defaultProfile: "Default",
    cookieSupport: "verified" as const,
    installed: true,
  };
}

async function buildModule() {
  return import("./index.js");
}

describe("cookie-backed browser resolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();

    listChromiumBrowsers.mockReturnValue([createBrowser("chrome", "Google Chrome"), createBrowser("dia", "Dia")]);
    listChromiumProfiles.mockImplementation(() => ["Default"]);
    findAttachableCdpUrl.mockResolvedValue(undefined);
    findGoogleChromeTab.mockResolvedValue(null);
    getSavedSourceBrowserTarget.mockReturnValue(undefined);
    getChromiumSession.mockImplementation(async (browserId: string, profile?: string) => ({
      cookieHeader: `${browserId}:${profile ?? "Default"}`,
    }));
  });

  it("falls back to another installed browser when the default browser is not authenticated", async () => {
    const { getSyncSource } = await buildModule();
    validateSubstackSession.mockImplementation(async (cookieHeader: string) => {
      if (cookieHeader.startsWith("chrome:")) {
        throw new Error("Substack saved request failed with 401");
      }
    });

    const source = getSyncSource("substack");
    const resolved = await source?.resolveOptions?.({
      options: { browser: "auto" },
    });

    expect(validateSubstackSession).toHaveBeenNthCalledWith(1, "chrome:Default");
    expect(validateSubstackSession).toHaveBeenNthCalledWith(2, "dia:Default");
    expect(resolved).toEqual({
      browser: "dia",
      profile: "Default",
    });
  });

  it("prefers the remembered profile before probing other profiles in the same browser", async () => {
    const { getSyncSource } = await buildModule();
    getSavedSourceBrowserTarget.mockReturnValue({
      browserId: "dia",
      profile: "Profile 2",
    });
    listChromiumProfiles.mockImplementation((browserId: string) =>
      browserId === "dia" ? ["Default", "Profile 1", "Profile 2"] : ["Default"],
    );

    const source = getSyncSource("substack");
    const resolved = await source?.resolveOptions?.({
      options: { browser: "dia" },
    });

    expect(getChromiumSession).toHaveBeenCalledTimes(1);
    expect(getChromiumSession).toHaveBeenCalledWith("dia", "Profile 2", expect.any(Array), "Substack");
    expect(resolved).toEqual({
      browser: "dia",
      profile: "Profile 2",
    });
  });

  it("uses the active Google Chrome tab for ChatGPT when one is available", async () => {
    const { getSyncSource } = await buildModule();
    findGoogleChromeTab.mockResolvedValue({
      windowId: 1,
      tabId: 2,
      url: "https://chatgpt.com/",
      isActive: true,
    });

    const source = getSyncSource("chatgpt");
    const resolved = await source?.resolveOptions?.({
      options: { browser: "auto" },
    });

    expect(findAttachableCdpUrl).not.toHaveBeenCalled();
    expect(resolved).toEqual({
      browser: "chrome",
      sessionMode: "chrome-live",
    });
  });

  it("falls back to an attachable CDP browser when no active Google Chrome tab is available", async () => {
    const { getSyncSource } = await buildModule();
    findAttachableCdpUrl.mockResolvedValue("http://127.0.0.1:9223");

    const source = getSyncSource("chatgpt");
    const resolved = await source?.resolveOptions?.({
      options: { browser: "auto" },
    });

    expect(findAttachableCdpUrl).toHaveBeenCalledTimes(1);
    expect(resolved).toEqual({
      browser: "auto",
      cdpUrl: "http://127.0.0.1:9223",
      sessionMode: "cdp",
    });
  });

  it("falls back to CDP when Google Chrome tab discovery throws", async () => {
    const { getSyncSource } = await buildModule();
    findGoogleChromeTab.mockRejectedValue(new Error("Automation permission denied"));
    findAttachableCdpUrl.mockResolvedValue("http://127.0.0.1:9223");

    const source = getSyncSource("chatgpt");
    const resolved = await source?.resolveOptions?.({
      options: { browser: "auto" },
    });

    expect(findAttachableCdpUrl).toHaveBeenCalledTimes(1);
    expect(resolved).toEqual({
      browser: "auto",
      cdpUrl: "http://127.0.0.1:9223",
      sessionMode: "cdp",
    });
  });

  it("uses the same active Google Chrome tab strategy for Claude", async () => {
    const { getSyncSource } = await buildModule();
    findGoogleChromeTab.mockResolvedValue({
      windowId: 3,
      tabId: 4,
      url: "https://claude.ai/chats/example",
      isActive: true,
    });

    const source = getSyncSource("claude");
    const resolved = await source?.resolveOptions?.({
      options: { browser: "auto" },
    });

    expect(resolved).toEqual({
      browser: "chrome",
      sessionMode: "chrome-live",
    });
  });
});

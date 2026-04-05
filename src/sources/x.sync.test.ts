import { beforeEach, describe, expect, it, vi } from "vitest";

const sinks: Array<{ path: string; append: ReturnType<typeof vi.fn> }> = [];
const getChromiumSession = vi.fn();
const launch = vi.fn();
const createTimestampedFileName = vi.fn(() => "test.jsonl");
let bookmarksResponse: {
  url: () => string;
  json: ReturnType<typeof vi.fn>;
  request: () => {
    url: () => string;
    allHeaders: ReturnType<typeof vi.fn>;
  };
};

vi.mock("../auth/chromium.js", () => ({
  getChromiumSession,
  listChromiumBrowsers: vi.fn(() => []),
}));

vi.mock("../core/raw.js", () => ({
  createJsonlSink: vi.fn((source: string, fileName: string) => {
    const sink = {
      path: `/tmp/${source.replaceAll("/", "-")}-${fileName}`,
      append: vi.fn(),
    };
    sinks.push(sink);
    return sink;
  }),
  createTimestampedFileName,
}));

vi.mock("playwright-core", () => ({
  chromium: {
    launch,
  },
}));

function createTweetEntry(id: string, text: string, screenName = "emad") {
  return {
    entryId: `tweet-${id}`,
    content: {
      itemContent: {
        tweet_results: {
          result: {
            __typename: "Tweet",
            rest_id: id,
            legacy: {
              full_text: text,
              created_at: "Sat Apr 04 20:00:00 +0000 2026",
            },
            core: {
              user_results: {
                result: {
                  legacy: {
                    screen_name: screenName,
                    name: screenName,
                  },
                },
              },
            },
          },
        },
      },
    },
  };
}

function createCursorEntry(value: string) {
  return {
    entryId: "cursor-bottom-0",
    content: {
      cursorType: "Bottom",
      value,
    },
  };
}

function createPayload(entries: unknown[]) {
  return {
    data: {
      bookmark_timeline_v2: {
        timeline: {
          instructions: [
            {
              type: "TimelineAddEntries",
              entries,
            },
          ],
        },
      },
    },
  };
}

async function buildSyncModule() {
  return import("./x.js");
}

describe("x bookmark sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.unstubAllGlobals();
    sinks.length = 0;

    getChromiumSession.mockResolvedValue({
      browser: {
        executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      },
      playwrightCookies: [],
    });

    bookmarksResponse = {
      url: () => "https://x.com/i/api/graphql/query-id/Bookmarks?variables=%7B%22count%22%3A20%7D",
      json: vi.fn(),
      request: () => ({
        url: () => "https://x.com/i/api/graphql/query-id/Bookmarks?variables=%7B%22count%22%3A20%7D",
        allHeaders: vi.fn(async () => ({
          authorization: "Bearer token",
          cookie: "auth=1",
        })),
      }),
    };

    const page = {
      waitForResponse: vi.fn().mockResolvedValue(bookmarksResponse),
      goto: vi.fn(),
    };

    const context = {
      addCookies: vi.fn(),
      newPage: vi.fn().mockResolvedValue(page),
    };

    launch.mockResolvedValue({
      newContext: vi.fn().mockResolvedValue(context),
      close: vi.fn(),
    });
  });

  it("includes newly added top-page bookmarks during an incremental sync", async () => {
    const { syncXBookmarks } = await buildSyncModule();
    const seedPayload = createPayload([
      createTweetEntry("new-1", "Newest bookmark"),
      createTweetEntry("new-2", "Second newest bookmark"),
      createCursorEntry("cursor-old"),
    ]);
    const replayPayload = createPayload([createTweetEntry("old-1", "Older bookmark")]);
    bookmarksResponse.json.mockResolvedValue(seedPayload);

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => replayPayload,
      })),
    );

    const result = await syncXBookmarks({
      browserId: "chrome",
      cursor: "cursor-old",
    });

    expect(result.items.map((item) => item.externalId)).toEqual(["new-1", "new-2", "old-1"]);
  });

  it("deduplicates overlap between the latest page and resumed pages", async () => {
    const { syncXBookmarks } = await buildSyncModule();
    const seedPayload = createPayload([
      createTweetEntry("new-1", "Newest bookmark"),
      createTweetEntry("old-1", "Already seen bookmark"),
      createCursorEntry("cursor-old"),
    ]);
    const replayPayload = createPayload([
      createTweetEntry("old-1", "Already seen bookmark"),
      createTweetEntry("old-2", "Older bookmark"),
    ]);
    bookmarksResponse.json.mockResolvedValue(seedPayload);

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => replayPayload,
      })),
    );

    const result = await syncXBookmarks({
      browserId: "chrome",
      cursor: "cursor-old",
    });

    expect(result.items.map((item) => item.externalId)).toEqual(["new-1", "old-1", "old-2"]);
  });
});

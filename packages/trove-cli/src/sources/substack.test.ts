import { beforeEach, describe, expect, it, vi } from "vitest";

const sinks: Array<{ path: string; append: ReturnType<typeof vi.fn> }> = [];
const getChromiumSession = vi.fn();
const createTimestampedFileName = vi.fn(() => "test.jsonl");

vi.mock("../../../trove-core/src/auth/chromium.js", () => ({
  getChromiumSession,
}));

vi.mock("../../../trove-core/src/core/raw.js", () => ({
  createJsonlSink: vi.fn((source: string, fileName: string) => {
    const sink = {
      path: `/tmp/${source}-${fileName}`,
      append: vi.fn(),
    };
    sinks.push(sink);
    return sink;
  }),
  createTimestampedFileName,
}));

async function buildModule() {
  return import("./substack.js");
}

function createSavedPayload(args: {
  ids: number[];
  more?: boolean;
  savedAtById?: Record<number, string>;
  publicationId?: number;
}) {
  const publicationId = args.publicationId ?? 313411;

  return {
    posts: args.ids.map((id) => ({
      id,
      publication_id: publicationId,
      title: `Saved post ${id}`,
      canonical_url: `https://example.substack.com/p/${id}`,
      subtitle: `Excerpt ${id}`,
      post_date: "2026-04-01T00:00:00.000Z",
    })),
    publications: [
      {
        id: publicationId,
        name: "Example Pub",
        author_name: "Example Author",
        subdomain: "example",
      },
    ],
    savedPosts: args.ids.map((id) => ({
      post_id: id,
      created_at: args.savedAtById?.[id] ?? `2026-04-${String(id).padStart(2, "0")}T00:00:00.000Z`,
    })),
    inboxItems: args.ids.map((id) => ({
      post_id: id,
      publication_id: publicationId,
      saved_at: args.savedAtById?.[id] ?? `2026-04-${String(id).padStart(2, "0")}T00:00:00.000Z`,
    })),
    more: args.more ?? false,
  };
}

describe("substack saved sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.unstubAllGlobals();
    sinks.length = 0;

    getChromiumSession.mockResolvedValue({
      cookieHeader: "substack.lli=test",
    });
  });

  it("syncs saved posts and records the newest post id as the next cursor", async () => {
    const { syncSubstackSaved } = await buildModule();

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => createSavedPayload({ ids: [11, 10] }),
      })),
    );

    const result = await syncSubstackSaved({
      browserId: "dia",
    });

    expect(result.nextCursor).toBe("11");
    expect(result.items.map((item) => item.externalId)).toEqual(["11", "10"]);
    expect(result.items[0]?.savedAt).toBe("2026-04-11T00:00:00.000Z");
    expect(sinks[0]?.append).toHaveBeenCalledTimes(2);
    expect(sinks[0]?.append).toHaveBeenCalledWith(
      expect.objectContaining({
        platform: "substack",
        kind: "saved",
        postId: 11,
        title: "Saved post 11",
        savedAt: "2026-04-11T00:00:00.000Z",
      }),
    );
  });

  it("uses offset pagination and stops when it reaches the saved marker", async () => {
    const { syncSubstackSaved } = await buildModule();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => createSavedPayload({ ids: [13, 12], more: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => createSavedPayload({ ids: [11, 10], more: true }),
      });

    vi.stubGlobal("fetch", fetchMock);

    const result = await syncSubstackSaved({
      browserId: "dia",
      cursor: "11",
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        href: "https://substack.com/api/v1/reader/posts?inboxType=saved&limit=20&offset=0",
      }),
      expect.any(Object),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        href: "https://substack.com/api/v1/reader/posts?inboxType=saved&limit=20&offset=2",
      }),
      expect.any(Object),
    );
    expect(result.nextCursor).toBe("13");
    expect(result.items.map((item) => item.externalId)).toEqual(["13", "12"]);
  });

  it("stops saved pagination after repeated pages add no new items", async () => {
    const { syncSubstackSaved } = await buildModule();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => createSavedPayload({ ids: [13, 12], more: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => createSavedPayload({ ids: [13, 12], more: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => createSavedPayload({ ids: [13, 12], more: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => createSavedPayload({ ids: [13, 12], more: true }),
      });

    vi.stubGlobal("fetch", fetchMock);

    const result = await syncSubstackSaved({
      browserId: "dia",
    });

    expect(result.items.map((item) => item.externalId)).toEqual(["13", "12"]);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});

describe("substack likes sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.unstubAllGlobals();
    sinks.length = 0;

    getChromiumSession.mockResolvedValue({
      cookieHeader: "substack.lli=test",
    });
  });

  it("syncs post and note likes and stores the newest entity key as the next cursor", async () => {
    const { syncSubstackSaved } = await buildModule();

    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          text: async () =>
            '<script>window._preloads = JSON.parse("{\\"user\\":{\\"id\\":5511150,\\"handle\\":\\"3omda\\"}}")</script>',
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            items: [
              {
                entity_key: "p-42",
                type: "post",
                context: { type: "post_like", timestamp: "2026-04-01T00:00:00.000Z" },
                post: {
                  id: 42,
                  publication_id: 7,
                  title: "Liked post",
                  canonical_url: "https://example.substack.com/p/liked-post",
                  subtitle: "Post excerpt",
                },
                publication: {
                  id: 7,
                  name: "Example Pub",
                  author_name: "Example Author",
                },
              },
              {
                entity_key: "c-99",
                type: "comment",
                context: { type: "note_like", timestamp: "2026-04-02T00:00:00.000Z" },
                comment: {
                  id: 99,
                  body: "A thoughtful note",
                  name: "Yepicurus",
                  handle: "yepicurus",
                  user_primary_publication: {
                    name: "The Existential List",
                  },
                },
              },
            ],
          }),
        }),
    );

    const result = await syncSubstackSaved({
      browserId: "dia",
      kind: "likes",
    });

    expect(result.nextCursor).toBe("p-42");
    expect(result.items.map((item) => item.externalId)).toEqual(["p-42", "c-99"]);
    expect(result.items[0]?.url).toBe("https://example.substack.com/p/liked-post");
    expect(result.items[1]?.url).toBe("https://substack.com/@yepicurus/note/c-99");
    expect(result.items[1]?.content).toBe("A thoughtful note");
    expect(sinks[0]?.append).toHaveBeenCalledTimes(2);
    expect(sinks[0]?.append).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        platform: "substack",
        kind: "like",
        entityKey: "p-42",
        itemType: "post",
      }),
    );
    expect(sinks[0]?.append).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        platform: "substack",
        kind: "like",
        entityKey: "c-99",
        itemType: "comment",
      }),
    );
  });

  it("uses nextCursor pagination and stops when it reaches the previous like marker", async () => {
    const { syncSubstackSaved } = await buildModule();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          '<script>window._preloads = JSON.parse("{\\"user\\":{\\"id\\":5511150,\\"handle\\":\\"3omda\\"}}")</script>',
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            {
              entity_key: "p-new",
              type: "post",
              context: { type: "post_like", timestamp: "2026-04-03T00:00:00.000Z" },
              post: {
                id: 1,
                title: "New like",
                canonical_url: "https://example.substack.com/p/new-like",
              },
              publication: {
                id: 7,
                name: "Example Pub",
              },
            },
          ],
          nextCursor: "cursor-2",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            {
              entity_key: "p-old",
              type: "post",
              context: { type: "post_like", timestamp: "2026-04-02T00:00:00.000Z" },
              post: {
                id: 2,
                title: "Old like",
                canonical_url: "https://example.substack.com/p/old-like",
              },
              publication: {
                id: 7,
                name: "Example Pub",
              },
            },
          ],
        }),
      });

    vi.stubGlobal("fetch", fetchMock);

    const result = await syncSubstackSaved({
      browserId: "dia",
      kind: "likes",
      cursor: "p-old",
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        href: "https://substack.com/api/v1/reader/feed/profile/5511150?types%5B%5D=like",
      }),
      expect.any(Object),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        href: "https://substack.com/api/v1/reader/feed/profile/5511150?types%5B%5D=like&cursor=cursor-2",
      }),
      expect.any(Object),
    );
    expect(result.nextCursor).toBe("p-new");
    expect(result.items.map((item) => item.externalId)).toEqual(["p-new"]);
  });

  it("stops likes pagination when repeated pages add no new entities", async () => {
    const { syncSubstackSaved } = await buildModule();
    const repeatedLikesPage = {
      items: [
        {
          entity_key: "p-new",
          type: "post",
          context: { type: "post_like", timestamp: "2026-04-03T00:00:00.000Z" },
          post: {
            id: 1,
            title: "New like",
            canonical_url: "https://example.substack.com/p/new-like",
          },
          publication: {
            id: 7,
            name: "Example Pub",
          },
        },
      ],
      nextCursor: "cursor-2",
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          '<script>window._preloads = JSON.parse("{\\"user\\":{\\"id\\":5511150,\\"handle\\":\\"3omda\\"}}")</script>',
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => repeatedLikesPage,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => repeatedLikesPage,
      });

    vi.stubGlobal("fetch", fetchMock);

    const result = await syncSubstackSaved({
      browserId: "dia",
      kind: "likes",
    });

    expect(result.items.map((item) => item.externalId)).toEqual(["p-new"]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});

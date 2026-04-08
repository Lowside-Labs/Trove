import { beforeEach, describe, expect, it, vi } from "vitest";

const sinks: Array<{ path: string; append: ReturnType<typeof vi.fn> }> = [];
const getChromiumSession = vi.fn();
const createTimestampedFileName = vi.fn(() => "test.jsonl");

vi.mock("../auth/chromium.js", () => ({
  getChromiumSession,
}));

vi.mock("../core/raw.js", () => ({
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
  return import("./instagram.js");
}

function createSavedCollectionsPayload() {
  return {
    data: {
      xdt_api__v1__collections__list_graphql_connection: {
        edges: [
          {
            node: {
              collection_id: "ALL_MEDIA_AUTO_COLLECTION",
              collection_name: "All posts",
              collection_media_count: 9,
            },
          },
          {
            node: {
              collection_id: "18056259277534544",
              collection_name: "Workout",
              collection_media_count: 3,
            },
          },
          {
            node: {
              collection_id: "17983249169564052",
              collection_name: "Recipes",
              collection_media_count: 2,
            },
          },
        ],
      },
    },
  };
}

function createSavedMedia(args: {
  pk: string;
  code: string;
  username?: string;
  fullName?: string;
  caption?: string;
  takenAt?: number;
  collectionIds?: string[];
  locationName?: string;
}) {
  return {
    pk: args.pk,
    id: `${args.pk}_123`,
    code: args.code,
    media_type: 2,
    product_type: "clips",
    taken_at: args.takenAt ?? 1_775_045_035,
    saved_collection_ids: args.collectionIds ?? [],
    like_count: 120,
    fb_comment_count: 11,
    play_count: 2_400,
    has_viewer_saved: true,
    image_versions2: {
      candidates: [{ url: `https://cdn.example.com/${args.code}.jpg` }],
    },
    video_versions: [{ url: `https://cdn.example.com/${args.code}.mp4` }],
    user: {
      username: args.username ?? "saved_author",
      full_name: args.fullName ?? "Saved Author",
      profile_pic_url: `https://cdn.example.com/${args.username ?? "saved_author"}-avatar.jpg`,
    },
    caption: args.caption
      ? {
          text: args.caption,
          created_at_utc: args.takenAt ?? 1_775_045_035,
        }
      : undefined,
    location: args.locationName
      ? {
          name: args.locationName,
          lat: 37.7,
          lng: -122.4,
        }
      : undefined,
    clips_metadata: {
      music_info: {
        music_asset_info: {
          display_title: "Track",
          artist_name: "Artist",
        },
      },
    },
  };
}

function createSavedPostsPayload(args: {
  media: Array<ReturnType<typeof createSavedMedia>>;
  nextMaxId?: string;
  moreAvailable?: boolean;
}) {
  return {
    num_results: args.media.length,
    more_available: args.moreAvailable ?? false,
    items: args.media.map((media) => ({ media })),
    ...(args.nextMaxId ? { next_max_id: args.nextMaxId } : {}),
    status: "ok",
  };
}

describe("instagram saved sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.unstubAllGlobals();
    sinks.length = 0;

    getChromiumSession.mockResolvedValue({
      cookieHeader: "csrftoken=test-token; ig_did=test-device; sessionid=test-session",
      playwrightCookies: [
        { name: "csrftoken", value: "test-token" },
        { name: "ig_did", value: "test-device" },
      ],
    });
  });

  it("syncs saved posts, maps collection names, and stores the newest media id as the next cursor", async () => {
    const { syncInstagramSaved } = await buildModule();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          form_data: {
            username: "emadabdulrahimx",
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => createSavedCollectionsPayload(),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () =>
          createSavedPostsPayload({
            media: [
              createSavedMedia({
                pk: "3865194748854083303",
                code: "DWj7iU5Jx7n",
                caption: "Saved workout reel",
                collectionIds: ["18056259277534544"],
                locationName: "Chicago",
              }),
              createSavedMedia({
                pk: "3863633142414935099",
                code: "DWeYd9kEYQ7",
                caption: "Saved recipe reel",
                collectionIds: ["17983249169564052"],
              }),
            ],
            nextMaxId: "cursor-2",
            moreAvailable: true,
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () =>
          createSavedPostsPayload({
            media: [
              createSavedMedia({
                pk: "3830386341985775522",
                code: "DUoRBVyke-i",
                caption: "Older saved reel",
              }),
            ],
          }),
      });

    vi.stubGlobal("fetch", fetchMock);

    const result = await syncInstagramSaved({
      browserId: "dia",
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        href: "https://www.instagram.com/api/v1/accounts/edit/web_form_data/",
      }),
      expect.any(Object),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        href: "https://www.instagram.com/api/v1/feed/saved/posts/",
      }),
      expect.any(Object),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining({
        href: "https://www.instagram.com/api/v1/feed/saved/posts/?max_id=cursor-2",
      }),
      expect.any(Object),
    );
    expect(result.nextCursor).toBe("saved:3865194748854083303");
    expect(result.items.map((item) => item.externalId)).toEqual([
      "saved:3865194748854083303",
      "saved:3863633142414935099",
      "saved:3830386341985775522",
    ]);
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        source: "instagram",
        kind: "saved",
        title: "@saved_author: Saved workout reel",
        url: "https://www.instagram.com/reel/DWj7iU5Jx7n/",
        author: "Saved Author",
        tags: ["instagram", "saved", "clips", "Workout"],
        savedAt: "2026-04-01T12:03:55.000Z",
        raw: expect.objectContaining({
          username: "saved_author",
          fullName: "Saved Author",
          profilePicUrl: "https://cdn.example.com/saved_author-avatar.jpg",
          mediaType: 2,
          imageUrl: "https://cdn.example.com/DWj7iU5Jx7n.jpg",
          videoUrl: "https://cdn.example.com/DWj7iU5Jx7n.mp4",
          videoDuration: null,
        }),
      }),
    );
    expect(sinks[0]?.append).toHaveBeenCalledTimes(3);
    expect(sinks[0]?.append).toHaveBeenCalledWith(
      expect.objectContaining({
        platform: "instagram",
        kind: "saved",
        mediaId: "3865194748854083303",
        code: "DWj7iU5Jx7n",
        collectionNames: ["Workout"],
        locationName: "Chicago",
        savedAtSource: "media.taken_at",
      }),
    );
  });

  it("stops when it reaches the saved marker during pagination", async () => {
    const { syncInstagramSaved } = await buildModule();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          form_data: {
            username: "emadabdulrahimx",
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => createSavedCollectionsPayload(),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () =>
          createSavedPostsPayload({
            media: [
              createSavedMedia({
                pk: "3900000000000000001",
                code: "NEWESTCODE1",
                caption: "Newest saved reel",
                collectionIds: ["18056259277534544"],
              }),
              createSavedMedia({
                pk: "3900000000000000000",
                code: "MARKERCODE0",
                caption: "Previously imported reel",
                collectionIds: ["18056259277534544"],
              }),
            ],
            nextMaxId: "older-page",
            moreAvailable: true,
          }),
      });

    vi.stubGlobal("fetch", fetchMock);

    const result = await syncInstagramSaved({
      browserId: "dia",
      cursor: "saved:3900000000000000000",
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result.nextCursor).toBe("saved:3900000000000000001");
    expect(result.items.map((item) => item.externalId)).toEqual(["saved:3900000000000000001"]);
  });
});

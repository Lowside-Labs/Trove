import { describe, expect, it } from "vitest";
import { __internal } from "./x.js";

describe("x bookmarks parsing", () => {
  it("extracts bookmark items and bottom cursor from a timeline payload", () => {
    const payload = {
      data: {
        bookmark_timeline_v2: {
          timeline: {
            instructions: [
              {
                type: "TimelineAddEntries",
                entries: [
                  {
                    entryId: "tweet-123",
                    content: {
                      itemContent: {
                        tweet_results: {
                          result: {
                            __typename: "Tweet",
                            rest_id: "123",
                            legacy: {
                              full_text: "Browser-auth research thread",
                              created_at: "Sat Apr 04 20:00:00 +0000 2026",
                              favorite_count: 10,
                              retweet_count: 2,
                            },
                            core: {
                              user_results: {
                                result: {
                                  legacy: {
                                    screen_name: "emad",
                                    name: "Emad",
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                  {
                    entryId: "cursor-bottom-0",
                    content: {
                      cursorType: "Bottom",
                      value: "cursor-abc",
                    },
                  },
                ],
              },
            ],
          },
        },
      },
    };

    const page = __internal.parseTimelinePayload(payload, "bookmarks");

    expect(page.nextCursor).toBe("cursor-abc");
    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.externalId).toBe("bookmarks:123");
    expect(page.items[0]?.url).toBe("https://x.com/emad/status/123");
  });

  it("extracts author data from wrapped user_results shapes", () => {
    const tweet = {
      __typename: "Tweet",
      rest_id: "456",
      legacy: {
        full_text: "Wrapped author lookup",
        created_at: "Sat Apr 04 20:00:00 +0000 2026",
      },
      core: {
        user_results: {
          result: {
            __typename: "User",
            legacy: {
              screen_name: "mageba_wav",
              name: "Mageba",
            },
          },
        },
      },
    };

    const normalized = __internal.normalizeTweet(tweet, "bookmarks");
    const raw = __internal.extractRawTweetRecord(tweet, "bookmarks");

    expect(normalized?.url).toBe("https://x.com/mageba_wav/status/456");
    expect(normalized?.author).toBe("Mageba");
    expect(raw?.author).toEqual({
      name: "Mageba",
      screenName: "mageba_wav",
    });
  });

  it("stores media previews in normalized item raw data", () => {
    const tweet = {
      __typename: "Tweet",
      rest_id: "media-123",
      legacy: {
        full_text: "Tweet with media",
        created_at: "Sat Apr 04 20:00:00 +0000 2026",
        extended_entities: {
          media: [
            {
              type: "photo",
              media_url_https: "https://pbs.twimg.com/media/example-1.jpg",
              expanded_url: "https://x.com/emad/status/media-123/photo/1",
            },
            {
              type: "video",
              media_url_https: "https://pbs.twimg.com/ext_tw_video_thumb/example-2.jpg",
              expanded_url: "https://x.com/emad/status/media-123/video/1",
              video_info: {
                variants: [
                  {
                    content_type: "application/x-mpegURL",
                    url: "https://video.twimg.com/example-2.m3u8",
                  },
                  {
                    bitrate: 832000,
                    content_type: "video/mp4",
                    url: "https://video.twimg.com/example-2-832.mp4",
                  },
                  {
                    bitrate: 2176000,
                    content_type: "video/mp4",
                    url: "https://video.twimg.com/example-2-2176.mp4",
                  },
                ],
              },
            },
          ],
        },
      },
      core: {
        user_results: {
          result: {
            legacy: {
              screen_name: "emad",
              name: "Emad",
            },
          },
        },
      },
    };

    const normalized = __internal.normalizeTweet(tweet, "bookmarks");
    const raw = __internal.extractRawTweetRecord(tweet, "bookmarks");

    expect(normalized?.raw).toMatchObject({
      media: [
        {
          type: "photo",
          mediaUrl: "https://pbs.twimg.com/media/example-1.jpg",
          expandedUrl: "https://x.com/emad/status/media-123/photo/1",
        },
        {
          type: "video",
          mediaUrl: "https://pbs.twimg.com/ext_tw_video_thumb/example-2.jpg",
          expandedUrl: "https://x.com/emad/status/media-123/video/1",
          videoUrl: "https://video.twimg.com/example-2-2176.mp4",
        },
      ],
    });
    expect(raw?.media).toHaveLength(2);
  });

  it("ignores quoted tweets nested inside bookmarked entries", () => {
    const payload = {
      data: {
        bookmark_timeline_v2: {
          timeline: {
            instructions: [
              {
                type: "TimelineAddEntries",
                entries: [
                  {
                    entryId: "tweet-123",
                    content: {
                      itemContent: {
                        tweet_results: {
                          result: {
                            __typename: "Tweet",
                            rest_id: "123",
                            legacy: {
                              full_text: "Bookmarked post with a quote",
                              created_at: "Sat Apr 04 20:00:00 +0000 2026",
                            },
                            core: {
                              user_results: {
                                result: {
                                  legacy: {
                                    screen_name: "emad",
                                    name: "Emad",
                                  },
                                },
                              },
                            },
                            quoted_status_result: {
                              result: {
                                __typename: "Tweet",
                                rest_id: "999",
                                legacy: {
                                  full_text: "Quoted tweet that was not bookmarked",
                                  created_at: "Sat Apr 04 19:00:00 +0000 2026",
                                },
                                core: {
                                  user_results: {
                                    result: {
                                      legacy: {
                                        screen_name: "quoted",
                                        name: "Quoted Author",
                                      },
                                    },
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                ],
              },
            ],
          },
        },
      },
    };

    const page = __internal.parseTimelinePayload(payload, "bookmarks");

    expect(page.items.map((item) => item.externalId)).toEqual(["bookmarks:123"]);
    expect(page.rawItems.map((item) => item.id)).toEqual(["123"]);
  });
});

describe("x likes parsing", () => {
  it("extracts liked tweets from the likes timeline payload", () => {
    const payload = {
      data: {
        user: {
          result: {
            timeline: {
              timeline: {
                instructions: [
                  {
                    type: "TimelineAddEntries",
                    entries: [
                      {
                        entryId: "tweet-789",
                        sortIndex: "999999",
                        content: {
                          itemContent: {
                            tweet_results: {
                              result: {
                                __typename: "Tweet",
                                rest_id: "789",
                                legacy: {
                                  full_text: "Post that was liked later",
                                  created_at: "Sat Apr 04 22:00:00 +0000 2026",
                                  favorite_count: 42,
                                },
                                core: {
                                  user_results: {
                                    result: {
                                      legacy: {
                                        screen_name: "liked_author",
                                        name: "Liked Author",
                                      },
                                    },
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                      {
                        entryId: "cursor-bottom-0",
                        content: {
                          cursorType: "Bottom",
                          value: "cursor-likes",
                        },
                      },
                    ],
                  },
                ],
              },
            },
          },
        },
      },
    };

    const page = __internal.parseTimelinePayload(payload, "likes");

    expect(page.nextCursor).toBe("cursor-likes");
    expect(page.items).toHaveLength(1);
    expect(page.items[0]).toMatchObject({
      externalId: "likes:789",
      url: "https://x.com/liked_author/status/789",
      tags: ["x", "like"],
      raw: expect.objectContaining({
        kind: "like",
        savedAtSource: "tweet.created_at",
      }),
    });
    expect(page.rawItems[0]).toMatchObject({
      id: "789",
      kind: "like",
      tags: ["x", "like"],
    });
  });

  it("uses distinct item ids for bookmarks and likes that point to the same tweet", () => {
    const tweet = {
      __typename: "Tweet",
      rest_id: "shared-123",
      legacy: {
        full_text: "Tweet present in both collections",
        created_at: "Sat Apr 04 22:00:00 +0000 2026",
      },
      core: {
        user_results: {
          result: {
            legacy: {
              screen_name: "shared_author",
            },
          },
        },
      },
    };

    const bookmark = __internal.normalizeTweet(tweet, "bookmarks");
    const like = __internal.normalizeTweet(tweet, "likes");

    expect(bookmark?.externalId).toBe("bookmarks:shared-123");
    expect(like?.externalId).toBe("likes:shared-123");
    expect(bookmark?.externalId).not.toBe(like?.externalId);
  });
});

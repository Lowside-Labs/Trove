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

    const page = __internal.parseBookmarksPayload(payload);

    expect(page.nextCursor).toBe("cursor-abc");
    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.externalId).toBe("123");
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

    const normalized = __internal.normalizeTweet(tweet);
    const raw = __internal.extractRawBookmarkRecord(tweet);

    expect(normalized?.url).toBe("https://x.com/mageba_wav/status/456");
    expect(normalized?.author).toBe("Mageba");
    expect(raw?.author).toEqual({
      name: "Mageba",
      screenName: "mageba_wav",
    });
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

    const page = __internal.parseBookmarksPayload(payload);

    expect(page.items.map((item) => item.externalId)).toEqual(["123"]);
    expect(page.rawBookmarks.map((item) => item.id)).toEqual(["123"]);
  });
});

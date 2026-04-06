import { beforeEach, describe, expect, it, vi } from "vitest";

const sinks: Array<{ path: string; append: ReturnType<typeof vi.fn> }> = [];
const getChromiumSession = vi.fn();
const createTimestampedFileName = vi.fn(() => "test.jsonl");

vi.mock("../auth/chromium.js", () => ({
  getChromiumSession,
  listChromiumBrowsers: vi.fn(() => []),
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
  return import("./github.js");
}

describe("github stars parsing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.unstubAllGlobals();
    sinks.length = 0;

    getChromiumSession.mockResolvedValue({
      cookieHeader: "logged_in=yes",
    });
  });

  it("builds the repositories listing url from the authenticated username", async () => {
    const { __internal } = await import("./github.js");
    expect(__internal.buildStarsRepositoriesUrl("moodyxo")).toBe(
      "https://github.com/stars/moodyxo/repositories?filter=all",
    );
  });

  it("extracts starred repositories, username, and next page", async () => {
    const { __internal } = await import("./github.js");
    const html = `
      <main>
        <ul class="filter-list">
          <li>
            <a href="/stars/moodyxo">All stars</a>
          </li>
        </ul>
        <ul id="user-list-repositories">
          <li class="tmp-py-4 border-bottom public source ">
            <div class="d-inline-block mb-1">
              <h3>
                <a href="/afar1/fieldtheory-cli">
                  <span class="text-normal">afar1 / </span>
                  fieldtheory-cli
                </a>
              </h3>
            </div>
            <div class="py-1">
              <p>Sync and locally store all of your X/Twitter bookmarks.</p>
            </div>
            <div class="f6 color-fg-muted mt-2">
              <span class="tmp-mr-3 d-inline-block ml-0 tmp-ml-0">
                <span itemprop="programmingLanguage">TypeScript</span>
              </span>
              <a class="Link--muted tmp-mr-3" href="/afar1/fieldtheory-cli/stargazers">616</a>
              <a class="Link--muted tmp-mr-3" href="/afar1/fieldtheory-cli/forks">65</a>
              <span class="float-right">Starred <relative-time datetime="2026-04-05T00:11:56Z">Apr 4, 2026</relative-time></span>
            </div>
          </li>
        </ul>
        <div class="paginate-container">
          <a class="next_page" href="https://github.com/stars/moodyxo/repositories?direction=desc&amp;filter=all&amp;page=2&amp;sort=created">Next</a>
        </div>
      </main>
    `;

    const page = __internal.parseStarsPage(html);

    expect(page.username).toBe("moodyxo");
    expect(page.nextPageUrl).toBe(
      "https://github.com/stars/moodyxo/repositories?direction=desc&filter=all&page=2&sort=created",
    );
    expect(page.items).toEqual([
      expect.objectContaining({
        source: "github",
        externalId: "afar1/fieldtheory-cli",
        title: "afar1/fieldtheory-cli",
        url: "https://github.com/afar1/fieldtheory-cli",
        excerpt: "Sync and locally store all of your X/Twitter bookmarks.",
        author: "afar1",
        tags: ["github", "star"],
      }),
    ]);
    expect(page.rawItems).toEqual([
      expect.objectContaining({
        kind: "star",
        fullName: "afar1/fieldtheory-cli",
        language: "TypeScript",
        starCount: 616,
        forkCount: 65,
      }),
    ]);
  });

  it("returns no next page when pagination is absent", async () => {
    const { __internal } = await import("./github.js");
    const html = `
      <main>
        <ul class="filter-list">
          <li><a href="/stars/moodyxo">All stars</a></li>
        </ul>
        <ul id="user-list-repositories">
          <li class="tmp-py-4 border-bottom public source ">
            <h3><a href="/foo/bar"><span class="text-normal">foo / </span>bar</a></h3>
            <span class="float-right">Starred <relative-time datetime="2026-04-01T00:00:00Z">Apr 1, 2026</relative-time></span>
          </li>
        </ul>
      </main>
    `;

    const page = __internal.parseStarsPage(html);

    expect(page.nextPageUrl).toBeUndefined();
    expect(page.items).toHaveLength(1);
  });

  it("stops when GitHub pagination repeats without importing new stars", async () => {
    const { syncGitHubStars } = await buildModule();
    const repeatedPageHtml = `
      <main>
        <ul class="filter-list">
          <li><a href="/stars/moodyxo">All stars</a></li>
        </ul>
        <ul id="user-list-repositories">
          <li class="tmp-py-4 border-bottom public source ">
            <h3><a href="/foo/bar"><span class="text-normal">foo / </span>bar</a></h3>
            <span class="float-right">Starred <relative-time datetime="2026-04-01T00:00:00Z">Apr 1, 2026</relative-time></span>
          </li>
        </ul>
        <div class="paginate-container">
          <a class="next_page" href="https://github.com/stars/moodyxo/repositories?direction=desc&amp;filter=all&amp;page=2&amp;sort=created">Next</a>
        </div>
      </main>
    `;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => repeatedPageHtml,
      url: "https://github.com/stars/moodyxo/repositories?direction=desc&filter=all&page=2&sort=created",
    });

    vi.stubGlobal("fetch", fetchMock);

    const result = await syncGitHubStars({
      browserId: "chrome",
    });

    expect(result.items.map((item) => item.externalId)).toEqual(["foo/bar"]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});

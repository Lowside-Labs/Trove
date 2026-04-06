import { describe, expect, it } from "vitest";
import { __internal } from "./index.js";

describe("hn favorites parsing", () => {
  it("extracts favorite story items and next page", () => {
    const html = `
      <table>
        <tr class="athing submission" id="47637757">
          <td class="title">
            <span class="titleline">
              <a href="https://arxiv.org/abs/2604.01193">Embarrassingly simple self-distillation improves code generation</a>
            </span>
          </td>
        </tr>
        <tr>
          <td class="subtext">
            <span class="subline">
              <span class="score" id="score_47637757">572 points</span>
              by <a href="user?id=Anon84" class="hnuser">Anon84</a>
              <span class="age" title="2026-04-04T10:26:21 1775298381"><a href="item?id=47637757">17 hours ago</a></span>
              | <a href="item?id=47637757">169 comments</a>
            </span>
          </td>
        </tr>
        <tr><td class='title'><a href='favorites?id=jamiesonbecker&amp;p=2' class='morelink' rel='next'>More</a></td></tr>
      </table>
    `;

    const page = __internal.parseFavoritesPage(html);

    expect(page.nextPage).toBe(2);
    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.externalId).toBe("47637757");
    expect(page.items[0]?.url).toBe("https://arxiv.org/abs/2604.01193");
    expect(page.items[0]?.author).toBe("Anon84");
    expect(page.items[0]?.savedAt).toBe("2026-04-04T10:26:21.000Z");
  });

  it("extracts favorite comment items", () => {
    const html = `
      <table>
        <tr class="athing" id="46407397">
          <td class="default">
            <div>
              <span class="comhead">
                <a href="user?id=dmazin" class="hnuser">dmazin</a>
                <span class="age" title="2025-12-28T01:16:59 1766884619"><a href="item?id=46407397">3 months ago</a></span>
                <span class="navs">
                  | <a href="item?id=46368177">parent</a>
                  | <a href="item?id=46368177#46407397" rel="nofollow">context</a>
                  <span class="onstory"> | on: <a href="item?id=46368177" title="Clock synchronization is a nightmare">Clock synchronization is a nightmare</a></span>
                </span>
              </span>
            </div>
            <div class="comment">
              <div class="commtext c00">I highly recommend anyone to look up how PTP works.<p>Clock sync is very interesting.</div>
            </div>
          </td>
        </tr>
        <tr><td class='title'><a href='favorites?id=jamiesonbecker&amp;comments=t&amp;p=2' class='morelink' rel='next'>More</a></td></tr>
      </table>
    `;

    const page = __internal.parseFavoriteCommentsPage(html);

    expect(page.nextPage).toBe(2);
    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.externalId).toBe("46407397");
    expect(page.items[0]?.title).toBe("Comment on Clock synchronization is a nightmare");
    expect(page.items[0]?.url).toBe("https://news.ycombinator.com/item?id=46368177#46407397");
    expect(page.items[0]?.author).toBe("dmazin");
    expect(page.items[0]?.content).toContain("PTP works.");
  });
});

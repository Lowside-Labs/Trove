import { describe, expect, it } from "vitest";
import { TerminalOutput } from "./output.js";
import { __internal } from "./progress.js";

describe("progress dashboard", () => {
  it("maps known phase ids to friendlier labels", () => {
    expect(__internal.formatPhaseLabel("bootstrap")).toBe("Prepare");
    expect(__internal.formatPhaseLabel("scan")).toBe("Scan");
    expect(__internal.formatPhaseLabel("fetch")).toBe("Fetch");
    expect(__internal.formatPhaseLabel("extract")).toBe("Extract");
    expect(__internal.formatPhaseLabel("persist")).toBe("Persist");
    expect(__internal.formatPhaseLabel("index")).toBe("Refresh");
    expect(__internal.formatPhaseLabel("detail")).toBe("Render");
    expect(__internal.formatPhaseLabel("seed_request")).toBe("Seed Request");
  });

  it("renders a multi-run dashboard snapshot", () => {
    const output = new TerminalOutput({
      stdout: {
        write: () => true,
        isTTY: false,
      },
      stderr: {
        write: () => true,
        isTTY: false,
      },
    });

    const lines = __internal.buildDashboardLines(
      output,
      "Sync x",
      [
        {
          label: "x/bookmarks",
          status: "complete",
          startedAt: 1,
          completedAt: 2_500,
          itemCount: 42,
          phases: [
            {
              id: "seed",
              label: "Discover",
              status: "complete",
              message: "Discovering bookmarks request",
            },
          ],
        },
        {
          label: "x/likes",
          status: "running",
          startedAt: 1_000,
          phases: [
            {
              id: "page",
              label: "Fetch pages",
              status: "running",
              message: "Fetched likes page 2",
              completed: 18,
            },
          ],
        },
      ] as any,
      0,
    );

    expect(lines[0]).toContain("Sync x");
    expect(lines.join("\n")).toContain("x/bookmarks");
    expect(lines.join("\n")).toContain("42 items");
    expect(lines.join("\n")).toContain("Fetched likes page 2 (18)");
  });
});

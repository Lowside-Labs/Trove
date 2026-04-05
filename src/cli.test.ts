import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const roots: string[] = [];
const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, "..");
const cliPath = path.join(repoRoot, "src", "cli.ts");
const tsxPath = path.join(repoRoot, "node_modules", ".bin", "tsx");

afterEach(() => {
  for (const root of roots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("cli workspace flows", () => {
  it("creates a workspace at --path and auto-detects it from inside the directory", () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), "trove-cli-home-"));
    const workspace = path.join(home, "Trove");
    roots.push(home);

    const init = runCli(["init", "--path", workspace], {
      env: { HOME: home },
    });

    expect(init.status).toBe(0);
    expect(init.stdout).toContain(`Initialized Trove workspace in ${workspace}.`);
    expect(fs.existsSync(path.join(workspace, "AGENTS.md"))).toBe(true);
    expect(fs.existsSync(path.join(workspace, "CLAUDE.md"))).toBe(true);
    expect(fs.existsSync(path.join(workspace, "INDEX.md"))).toBe(true);
    expect(fs.existsSync(path.join(workspace, "data", "trove.db"))).toBe(true);

    const search = runCli(["search", "tags:bookmark"], {
      cwd: workspace,
      env: { HOME: home },
    });

    expect(search.status).toBe(0);
    expect(search.stdout).toContain('No matches for "tags:bookmark".');
    expect(fs.existsSync(path.join(home, ".trove"))).toBe(false);
  });

  it("creates a workspace in the current directory with --here", () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), "trove-cli-here-home-"));
    const workspace = path.join(home, "research-space");
    roots.push(home);
    fs.mkdirSync(workspace, { recursive: true });

    const result = runCli(["init", "--here"], {
      cwd: workspace,
      env: { HOME: home },
    });

    expect(result.status).toBe(0);
    expect(fs.existsSync(path.join(workspace, "AGENTS.md"))).toBe(true);
    expect(fs.existsSync(path.join(workspace, "CLAUDE.md"))).toBe(true);
    expect(fs.existsSync(path.join(workspace, "INDEX.md"))).toBe(true);
    expect(fs.existsSync(path.join(workspace, "data", "trove.db"))).toBe(true);
  });

  it("uses --home from outside the workspace without falling back to ~/.trove", () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), "trove-cli-home-"));
    const workspace = path.join(home, "Trove");
    const elsewhere = path.join(home, "elsewhere");
    roots.push(home);
    fs.mkdirSync(elsewhere, { recursive: true });

    const init = runCli(["init", "--path", workspace], {
      env: { HOME: home },
    });
    expect(init.status).toBe(0);

    const search = runCli(["--home", workspace, "search", "tags:bookmark"], {
      cwd: elsewhere,
      env: { HOME: home },
    });

    expect(search.status).toBe(0);
    expect(search.stdout).toContain('No matches for "tags:bookmark".');
    expect(fs.existsSync(path.join(home, ".trove"))).toBe(false);
  });
});

function runCli(
  args: string[],
  options?: {
    cwd?: string;
    env?: Record<string, string>;
  },
) {
  const result = spawnSync(tsxPath, [cliPath, ...args], {
    cwd: options?.cwd ?? repoRoot,
    env: {
      ...process.env,
      ...options?.env,
    },
    encoding: "utf8",
  });

  if (result.error) {
    throw result.error;
  }

  return result;
}

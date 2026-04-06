import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const roots: string[] = [];
const testDir = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(testDir, "..");
const repoRoot = path.resolve(packageRoot, "..", "..");
const cliPath = path.join(packageRoot, "src", "cli.ts");
const tsxFileName = process.platform === "win32" ? "tsx.cmd" : "tsx";
const tsxCandidates = [
  path.join(packageRoot, "node_modules", ".bin", tsxFileName),
  path.join(repoRoot, "node_modules", ".bin", tsxFileName),
];
const tsxPath = tsxCandidates.find((candidate) => fs.existsSync(candidate));

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
      env: { HOME: home, XDG_CONFIG_HOME: path.join(home, ".config") },
    });

    expect(init.status).toBe(0);
    expect(init.stdout).toContain(`Initialized Trove workspace in ${workspace}.`);
    expect(fs.existsSync(path.join(workspace, "AGENTS.md"))).toBe(true);
    expect(fs.existsSync(path.join(workspace, "CLAUDE.md"))).toBe(true);
    expect(fs.existsSync(path.join(workspace, "INDEX.md"))).toBe(true);
    expect(fs.existsSync(path.join(workspace, "data", "trove.db"))).toBe(true);

    const search = runCli(["search", "tags:bookmark"], {
      cwd: workspace,
      env: { HOME: home, XDG_CONFIG_HOME: path.join(home, ".config") },
    });

    expect(search.status).toBe(0);
    expect(search.stdout).toContain('No matches for "tags:bookmark".');
    expect(fs.existsSync(path.join(home, ".trove"))).toBe(false);
  }, 15_000);

  it("creates a workspace in the current directory with --here", () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), "trove-cli-here-home-"));
    const workspace = path.join(home, "research-space");
    roots.push(home);
    fs.mkdirSync(workspace, { recursive: true });

    const result = runCli(["init", "--here"], {
      cwd: workspace,
      env: { HOME: home, XDG_CONFIG_HOME: path.join(home, ".config") },
    });

    expect(result.status).toBe(0);
    expect(fs.existsSync(path.join(workspace, "AGENTS.md"))).toBe(true);
    expect(fs.existsSync(path.join(workspace, "CLAUDE.md"))).toBe(true);
    expect(fs.existsSync(path.join(workspace, "INDEX.md"))).toBe(true);
    expect(fs.existsSync(path.join(workspace, "data", "trove.db"))).toBe(true);
  }, 15_000);

  it("uses the remembered workspace from outside the workspace after init", () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), "trove-cli-home-"));
    const workspace = path.join(home, "Trove");
    const elsewhere = path.join(home, "elsewhere");
    roots.push(home);
    fs.mkdirSync(elsewhere, { recursive: true });

    const init = runCli(["init", "--path", workspace], {
      env: { HOME: home, XDG_CONFIG_HOME: path.join(home, ".config") },
    });
    expect(init.status).toBe(0);

    const search = runCli(["search", "tags:bookmark"], {
      cwd: elsewhere,
      env: { HOME: home, XDG_CONFIG_HOME: path.join(home, ".config") },
    });

    expect(search.status).toBe(0);
    expect(search.stdout).toContain('No matches for "tags:bookmark".');
    expect(fs.existsSync(path.join(home, ".trove"))).toBe(false);
  }, 15_000);

  it("uses --home from outside the workspace without falling back to ~/.trove", () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), "trove-cli-home-"));
    const workspace = path.join(home, "Trove");
    const elsewhere = path.join(home, "elsewhere");
    roots.push(home);
    fs.mkdirSync(elsewhere, { recursive: true });

    const init = runCli(["init", "--path", workspace], {
      env: { HOME: home, XDG_CONFIG_HOME: path.join(home, ".config") },
    });
    expect(init.status).toBe(0);

    const search = runCli(["--home", workspace, "search", "tags:bookmark"], {
      cwd: elsewhere,
      env: { HOME: home, XDG_CONFIG_HOME: path.join(home, ".config") },
    });

    expect(search.status).toBe(0);
    expect(search.stdout).toContain('No matches for "tags:bookmark".');
    expect(fs.existsSync(path.join(home, ".trove"))).toBe(false);
  }, 15_000);

  it("fails with a clear message when no workspace is configured", () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), "trove-cli-empty-home-"));
    const elsewhere = path.join(home, "elsewhere");
    roots.push(home);
    fs.mkdirSync(elsewhere, { recursive: true });

    const result = runCli(["sync", "x"], {
      cwd: elsewhere,
      env: { HOME: home, XDG_CONFIG_HOME: path.join(home, ".config") },
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "No Trove workspace found. Run `trove init --path ~/Trove` or specify `--home <path>`.",
    );
    expect(fs.existsSync(path.join(home, ".trove"))).toBe(false);
  }, 15_000);

  it("fails with a clear message when --home points to a missing workspace", () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), "trove-cli-missing-home-"));
    const elsewhere = path.join(home, "elsewhere");
    const missingWorkspace = path.join(home, "MissingTrove");
    roots.push(home);
    fs.mkdirSync(elsewhere, { recursive: true });

    const result = runCli(["--home", missingWorkspace, "search", "tags:bookmark"], {
      cwd: elsewhere,
      env: { HOME: home, XDG_CONFIG_HOME: path.join(home, ".config") },
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      `Trove workspace not found at ${missingWorkspace}. Run \`trove init --path ${missingWorkspace}\` first.`,
    );
  }, 15_000);
});

function runCli(
  args: string[],
  options?: {
    cwd?: string;
    env?: Record<string, string>;
  },
) {
  if (!tsxPath) {
    throw new Error("Could not find the tsx executable. Run `pnpm install` first.");
  }

  const result = spawnSync(tsxPath, [cliPath, ...args], {
    cwd: options?.cwd ?? packageRoot,
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

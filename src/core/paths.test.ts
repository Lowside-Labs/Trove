import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  findTroveWorkspaceRoot,
  getSavedWorkspaceRoot,
  getTrovePaths,
  resolveCommandWorkspace,
  resolveWorkspaceRoot,
  saveDefaultWorkspaceRoot,
} from "./paths.js";

const roots: string[] = [];
const originalHome = process.env.HOME;
const originalConfigHome = process.env.XDG_CONFIG_HOME;

afterEach(() => {
  for (const root of roots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }

  if (originalHome === undefined) {
    delete process.env.HOME;
  } else {
    process.env.HOME = originalHome;
  }

  if (originalConfigHome === undefined) {
    delete process.env.XDG_CONFIG_HOME;
  } else {
    process.env.XDG_CONFIG_HOME = originalConfigHome;
  }
});

describe("path helpers", () => {
  it("finds a Trove workspace from a nested directory", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "trove-paths-test-"));
    const nested = path.join(root, "content", "x");
    const previousCwd = process.cwd();
    roots.push(root);

    try {
      fs.mkdirSync(path.join(root, "data"), { recursive: true });
      fs.writeFileSync(path.join(root, "data", "trove.db"), "");
      fs.mkdirSync(nested, { recursive: true });

      expect(findTroveWorkspaceRoot(nested)).toBe(root);

      process.chdir(nested);
      expect(fs.realpathSync(getTrovePaths().root)).toBe(fs.realpathSync(root));
    } finally {
      process.chdir(previousCwd);
    }
  });

  it("resolves init workspace options", () => {
    expect(resolveWorkspaceRoot({ here: true, cwd: "/tmp/demo" })).toBe("/tmp/demo");
    expect(resolveWorkspaceRoot({ path: "../vault", cwd: "/tmp/demo/app" })).toBe("/tmp/demo/vault");
  });

  it("remembers the saved workspace when not running inside one", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "trove-paths-config-test-"));
    const workspace = path.join(root, "Trove");
    const cwd = path.join(root, "elsewhere");
    roots.push(root);

    process.env.HOME = root;
    process.env.XDG_CONFIG_HOME = path.join(root, ".config");
    fs.mkdirSync(path.join(workspace, "data"), { recursive: true });
    fs.writeFileSync(path.join(workspace, "data", "trove.db"), "");
    fs.mkdirSync(cwd, { recursive: true });

    saveDefaultWorkspaceRoot(workspace);

    expect(getSavedWorkspaceRoot()).toBe(workspace);
    expect(resolveCommandWorkspace({ cwd })).toEqual({
      root: workspace,
      source: "saved",
    });
  });

  it("returns a clear error when no workspace is known", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "trove-paths-empty-test-"));
    const cwd = path.join(root, "elsewhere");
    roots.push(root);

    process.env.HOME = root;
    process.env.XDG_CONFIG_HOME = path.join(root, ".config");
    fs.mkdirSync(cwd, { recursive: true });

    expect(resolveCommandWorkspace({ cwd })).toEqual({
      error: "No Trove workspace found. Run `trove init --path ~/Trove` or specify `--home <path>`.",
    });
  });

  it("rejects conflicting workspace flags", () => {
    expect(() => resolveWorkspaceRoot({ here: true, path: "/tmp/trove" })).toThrow("Choose either --here or --path, not both.");
  });
});

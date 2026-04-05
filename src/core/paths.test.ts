import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { findTroveWorkspaceRoot, getTrovePaths, resolveWorkspaceRoot } from "./paths.js";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
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

  it("rejects conflicting workspace flags", () => {
    expect(() => resolveWorkspaceRoot({ here: true, path: "/tmp/trove" })).toThrow("Choose either --here or --path, not both.");
  });
});

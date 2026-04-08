import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { getSavedWorkspaceRoot, saveDefaultWorkspaceRoot } from "trove-core";
import { __internal, resolveDesktopWorkspace } from "./resolve-workspace";

const roots: string[] = [];
const originalEnv = {
  HOME: process.env.HOME,
  XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME,
  ELECTRON_RENDERER_URL: process.env.ELECTRON_RENDERER_URL,
  TROVE_HOME: process.env.TROVE_HOME,
};

afterEach(() => {
  for (const root of roots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }

  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

describe("desktop workspace resolution", () => {
  it("ignores saved dev sandbox workspaces outside dev mode", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "trove-desktop-workspace-test-"));
    const configHome = path.join(root, ".config");
    const devWorkspace = path.join(root, ".tmp", "local-dev", "workspace");
    const defaultWorkspace = path.join(root, ".trove");
    roots.push(root);

    process.env.HOME = root;
    process.env.XDG_CONFIG_HOME = configHome;
    delete process.env.ELECTRON_RENDERER_URL;
    delete process.env.TROVE_HOME;

    fs.mkdirSync(path.join(devWorkspace, "data"), { recursive: true });
    fs.writeFileSync(path.join(devWorkspace, "data", "trove.db"), "");
    fs.mkdirSync(path.join(defaultWorkspace, "data"), { recursive: true });
    fs.writeFileSync(path.join(defaultWorkspace, "data", "trove.db"), "");

    saveDefaultWorkspaceRoot(devWorkspace);

    expect(resolveDesktopWorkspace()).toEqual({
      root: defaultWorkspace,
      source: "legacy",
    });
    expect(getSavedWorkspaceRoot()).toBeUndefined();
  });

  it("keeps the saved dev sandbox workspace in dev mode", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "trove-desktop-workspace-dev-test-"));
    const devWorkspace = path.join(root, ".tmp", "local-dev", "workspace");
    roots.push(root);

    process.env.ELECTRON_RENDERER_URL = "http://localhost:5173";

    expect(__internal.shouldIgnoreSavedWorkspaceRoot(devWorkspace)).toBe(false);
  });
});

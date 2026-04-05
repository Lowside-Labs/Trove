import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const prepare = vi.fn();
const all = vi.fn();
const close = vi.fn();

vi.mock("better-sqlite3", () => ({
  default: vi.fn().mockImplementation(() => ({
    prepare,
    close,
  })),
}));

vi.mock("keytar", () => ({
  default: {
    getPassword: vi.fn(),
  },
}));

const roots: string[] = [];

beforeEach(() => {
  prepare.mockReset();
  all.mockReset();
  close.mockReset();
  prepare.mockReturnValue({ all });
  all.mockReturnValue([]);
});

afterEach(() => {
  vi.restoreAllMocks();
  for (const root of roots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("chromium cookie loading", () => {
  it("removes the temporary cookies directory after reading the copied database", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "trove-chromium-test-"));
    roots.push(root);

    const cookiesPath = path.join(root, "Cookies");
    fs.writeFileSync(cookiesPath, "placeholder");

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "trove-cookies-test-"));
    roots.push(tempDir);

    const mkdtempSpy = vi.spyOn(fs, "mkdtempSync").mockReturnValue(tempDir);
    const rmSpy = vi.spyOn(fs, "rmSync");
    const { __internal } = await import("./chromium.js");

    __internal.loadCookiesFromStore(cookiesPath, ["https://x.com/"], Buffer.alloc(16));

    expect(mkdtempSpy).toHaveBeenCalled();
    expect(rmSpy).toHaveBeenCalledWith(tempDir, { recursive: true, force: true });
  });
});

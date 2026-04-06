import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const execFile = vi.fn();
const Database = vi.fn();
const prepare = vi.fn();
const close = vi.fn();
const all = vi.fn();
const get = vi.fn();
const originalHome = process.env.HOME;

vi.mock("node:child_process", () => ({
  execFile,
}));

vi.mock("better-sqlite3", () => ({
  default: Database,
}));

const roots: string[] = [];

beforeEach(() => {
  vi.resetModules();
  Database.mockReset();
  execFile.mockReset();
  prepare.mockReset();
  close.mockReset();
  all.mockReset();
  get.mockReset();
  Database.mockImplementation(() => ({
    prepare,
    close,
  }));
  prepare.mockImplementation((sql: string) => {
    if (sql.includes("FROM meta")) {
      return { get };
    }

    return { all };
  });
  all.mockReturnValue([]);
  get.mockReturnValue({ value: "24" });
});

afterEach(() => {
  vi.restoreAllMocks();
  for (const root of roots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }

  if (originalHome === undefined) {
    delete process.env.HOME;
  } else {
    process.env.HOME = originalHome;
  }
});

function encryptCookieValue(
  value: string,
  decryptionKey: Buffer,
  includeHostKeyPrefix: boolean,
): Buffer {
  const prefix = includeHostKeyPrefix ? Buffer.alloc(32, 0x61) : Buffer.alloc(0);
  const cipher = crypto.createCipheriv("aes-128-cbc", decryptionKey, Buffer.alloc(16, 0x20));
  const encrypted = Buffer.concat([
    cipher.update(Buffer.concat([prefix, Buffer.from(value, "utf8")])),
    cipher.final(),
  ]);
  return Buffer.concat([Buffer.from("v10"), encrypted]);
}

describe("chromium cookie loading", () => {
  it("lists cookie-backed profiles with Default first and numbered profiles sorted", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "trove-chromium-profiles-test-"));
    const chromeDir = path.join(root, "Library", "Application Support", "Google", "Chrome");
    roots.push(root);

    process.env.HOME = root;
    for (const profile of ["Profile 10", "Profile 2", "Default", "Profile 1"]) {
      fs.mkdirSync(path.join(chromeDir, profile), { recursive: true });
      fs.writeFileSync(path.join(chromeDir, profile, "Cookies"), "placeholder");
    }
    fs.mkdirSync(path.join(chromeDir, "System Profile"), { recursive: true });

    vi.resetModules();
    const { listChromiumProfiles } = await import("./chromium.js");

    expect(listChromiumProfiles("chrome")).toEqual([
      "Default",
      "Profile 1",
      "Profile 2",
      "Profile 10",
    ]);
  });

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

  it("only strips the host key prefix for version 24+ cookie stores", async () => {
    const { __internal } = await import("./chromium.js");
    const key = Buffer.alloc(16, 0x42);
    const plainLegacy = encryptCookieValue("legacy-cookie", key, false);
    const plainV24 = encryptCookieValue("current-cookie", key, true);

    expect(__internal.decryptCookieValue(plainLegacy, key, false)).toBe("legacy-cookie");
    expect(__internal.decryptCookieValue(plainV24, key, true)).toBe("current-cookie");
  });

  it("detects the host key prefix from the cookie DB meta version", async () => {
    const { __internal } = await import("./chromium.js");
    const fakeDb = {
      prepare: vi.fn(() => ({ get: vi.fn(() => ({ value: "24" })) })),
    };
    const legacyDb = {
      prepare: vi.fn(() => ({ get: vi.fn(() => ({ value: "23" })) })),
    };

    expect(__internal.databaseHasHostKeyPrefix(fakeDb as never)).toBe(true);
    expect(__internal.databaseHasHostKeyPrefix(legacyDb as never)).toBe(false);
  });

  it("reads macOS keychain values via the security CLI", async () => {
    execFile.mockImplementation((_file, _args, callback) => {
      callback(null, { stdout: "secret-value\n", stderr: "" });
    });

    const { __internal } = await import("./chromium.js");
    const password = await __internal.getMacosKeychainPassword({
      service: "Chrome Safe Storage",
      account: "Chrome",
    });

    expect(password).toBe("secret-value");
    expect(execFile).toHaveBeenCalledWith(
      "/usr/bin/security",
      ["find-generic-password", "-w", "-a", "Chrome", "-s", "Chrome Safe Storage"],
      expect.any(Function),
    );
  });
});

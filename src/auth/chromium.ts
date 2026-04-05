import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import keytar from "keytar";
import type { BrowserDefinition, BrowserSession, ResolvedBrowserTarget, SupportedBrowserId } from "../types/browser.js";

const homeDir = os.homedir();
const MACOS_SALT = "saltysalt";
const MACOS_KEY_LENGTH = 16;
const MACOS_ITERATIONS = 1003;
const MACOS_IV = Buffer.alloc(MACOS_KEY_LENGTH, 0x20);
const CHROMIUM_EPOCH_OFFSET = 11_644_473_600_000_000;

interface BrowserKeychainTarget {
  service: string;
  account: string;
}

interface RawCookieRow {
  host_key: string;
  name: string;
  value: string;
  encrypted_value: Buffer | null;
  path: string;
  expires_utc: number;
  is_secure: number;
  is_httponly: number;
}

const browserDefinitions: Record<SupportedBrowserId, BrowserDefinition & { keychain?: BrowserKeychainTarget }> = {
  chrome: {
    id: "chrome",
    name: "Google Chrome",
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    userDataDir: path.join(homeDir, "Library", "Application Support", "Google", "Chrome"),
    defaultProfile: "Default",
    cookieSupport: "verified",
    keychain: {
      service: "Chrome Safe Storage",
      account: "Chrome",
    },
  },
  dia: {
    id: "dia",
    name: "Dia",
    executablePath: "/Applications/Dia.app/Contents/MacOS/Dia",
    userDataDir: path.join(homeDir, "Library", "Application Support", "Dia", "User Data"),
    defaultProfile: "Default",
    cookieSupport: "verified",
    keychain: {
      service: "Dia Safe Storage",
      account: "Dia",
    },
  },
  brave: {
    id: "brave",
    name: "Brave",
    executablePath: "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    userDataDir: path.join(homeDir, "Library", "Application Support", "BraveSoftware", "Brave-Browser"),
    defaultProfile: "Default",
    cookieSupport: "experimental",
    notes: "Chromium profile layout is known, but Safe Storage naming is not yet verified in Trove.",
  },
  arc: {
    id: "arc",
    name: "Arc",
    executablePath: "/Applications/Arc.app/Contents/MacOS/Arc",
    userDataDir: path.join(homeDir, "Library", "Application Support", "Arc", "User Data"),
    defaultProfile: "Default",
    cookieSupport: "experimental",
    notes: "Profile and Safe Storage details still need verification in Trove.",
  },
};

export function listChromiumBrowsers(): Array<BrowserDefinition & { installed: boolean }> {
  return Object.values(browserDefinitions).map((browser) => {
    const result: BrowserDefinition & { installed: boolean } = {
      id: browser.id,
      name: browser.name,
      executablePath: browser.executablePath,
      userDataDir: browser.userDataDir,
      defaultProfile: browser.defaultProfile,
      cookieSupport: browser.cookieSupport,
      installed: fs.existsSync(browser.executablePath) && fs.existsSync(browser.userDataDir),
    };

    if (browser.notes) {
      result.notes = browser.notes;
    }

    return result;
  });
}

export function resolveChromiumBrowser(browserId: SupportedBrowserId, profile?: string): ResolvedBrowserTarget {
  const browser = browserDefinitions[browserId];

  if (!browser) {
    throw new Error(`Unsupported browser "${browserId}".`);
  }

  if (!fs.existsSync(browser.executablePath)) {
    throw new Error(`${browser.name} is not installed at ${browser.executablePath}.`);
  }

  if (!fs.existsSync(browser.userDataDir)) {
    throw new Error(`${browser.name} user data directory was not found at ${browser.userDataDir}.`);
  }

  const resolvedProfile = profile ?? browser.defaultProfile;
  const cookiesPath = path.join(browser.userDataDir, resolvedProfile, "Cookies");

  if (!fs.existsSync(cookiesPath)) {
    throw new Error(`Cookies file was not found for ${browser.name} profile "${resolvedProfile}" at ${cookiesPath}.`);
  }

  const result: ResolvedBrowserTarget = {
    id: browser.id,
    name: browser.name,
    executablePath: browser.executablePath,
    userDataDir: browser.userDataDir,
    defaultProfile: browser.defaultProfile,
    cookieSupport: browser.cookieSupport,
    profile: resolvedProfile,
    cookiesPath,
  };

  if (browser.notes) {
    result.notes = browser.notes;
  }

  return result;
}

export async function getChromiumSession(
  browserId: SupportedBrowserId,
  profile?: string,
  domains: string[] = ["https://x.com/", "https://twitter.com/"],
): Promise<BrowserSession> {
  if (process.platform !== "darwin") {
    throw new Error("The seamless Chromium session provider is only implemented for macOS right now.");
  }

  const browser = resolveChromiumBrowser(browserId, profile);
  const browserDefinition = browserDefinitions[browserId];

  if (!browserDefinition.keychain) {
    throw new Error(
      `${browser.name} is detected, but its Safe Storage keychain target is not verified yet. Extend the browser provider before using it.`,
    );
  }

  const decryptionKey = await deriveMacosCookieKey(browserDefinition.keychain);
  const cookies = loadCookiesFromStore(browser.cookiesPath, domains, decryptionKey);

  if (cookies.length === 0) {
    throw new Error(`No cookies were extracted for ${browser.name}. Confirm that you are logged into X in the ${browser.profile} profile.`);
  }

  const dedupedCookies = new Map<string, BrowserSession["playwrightCookies"][number]>();
  for (const cookie of cookies) {
    const key = `${cookie.domain ?? ""}:${cookie.path ?? "/"}:${cookie.name}`;
    dedupedCookies.set(key, cookie);
  }

  return {
    browser,
    cookieHeader: Array.from(dedupedCookies.values())
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join("; "),
    playwrightCookies: Array.from(dedupedCookies.values()),
  };
}

async function deriveMacosCookieKey(target: BrowserKeychainTarget): Promise<Buffer> {
  const password = await keytar.getPassword(target.service, target.account);

  if (!password) {
    throw new Error(`Could not read ${target.service} from macOS Keychain for account ${target.account}.`);
  }

  return crypto.pbkdf2Sync(password, MACOS_SALT, MACOS_ITERATIONS, MACOS_KEY_LENGTH, "sha1");
}

function loadCookiesFromStore(cookiesPath: string, domains: string[], decryptionKey: Buffer): BrowserSession["playwrightCookies"] {
  const { tempDir, tempPath } = copyCookiesDb(cookiesPath);

  try {
    const db = new Database(tempPath, { readonly: true });
    const rows = db
      .prepare<[], RawCookieRow>(
        `
          SELECT host_key, name, value, encrypted_value, path, expires_utc, is_secure, is_httponly
          FROM cookies
        `,
      )
      .all();
    db.close();

    return rows
      .filter((row) => domains.some((domain) => matchesDomain(domain, row.host_key)))
      .map((row) => mapCookieRow(row, decryptionKey))
      .filter((cookie): cookie is BrowserSession["playwrightCookies"][number] => cookie !== null);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function copyCookiesDb(cookiesPath: string): { tempDir: string; tempPath: string } {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "trove-cookies-"));
  const tempPath = path.join(tempDir, "Cookies.sqlite");
  fs.copyFileSync(cookiesPath, tempPath);
  return { tempDir, tempPath };
}

function matchesDomain(rawUrl: string, hostKey: string): boolean {
  const hostname = new URL(rawUrl).hostname;
  const normalizedHostKey = hostKey.startsWith(".") ? hostKey.slice(1) : hostKey;
  return hostname === normalizedHostKey || hostname.endsWith(`.${normalizedHostKey}`);
}

function mapCookieRow(row: RawCookieRow, decryptionKey: Buffer): BrowserSession["playwrightCookies"][number] | null {
  const value = row.value || decryptCookieValue(row.encrypted_value, decryptionKey);

  if (!value) {
    return null;
  }

  const cookie: BrowserSession["playwrightCookies"][number] = {
    name: row.name,
    value,
    domain: row.host_key,
    path: row.path || "/",
    secure: row.is_secure === 1,
    httpOnly: row.is_httponly === 1,
  };

  const expires = chromiumEpochToUnixSeconds(row.expires_utc);
  if (expires > 0) {
    cookie.expires = expires;
  }

  return cookie;
}

function decryptCookieValue(encryptedValue: Buffer | null, decryptionKey: Buffer): string {
  if (!encryptedValue || encryptedValue.length === 0) {
    return "";
  }

  const payload = encryptedValue.subarray(3);
  const decipher = crypto.createDecipheriv("aes-128-cbc", decryptionKey, MACOS_IV);
  decipher.setAutoPadding(false);

  const decrypted = Buffer.concat([decipher.update(payload), decipher.final()]);
  const paddingLength = decrypted.at(-1) ?? 0;
  const trimmed = paddingLength > 0 ? decrypted.subarray(32, decrypted.length - paddingLength) : decrypted.subarray(32);

  return trimmed.toString("utf8");
}

function chromiumEpochToUnixSeconds(value: number): number {
  if (!value || value <= 0) {
    return 0;
  }

  return Math.floor((value - CHROMIUM_EPOCH_OFFSET) / 1_000_000);
}

export const __internal = {
  copyCookiesDb,
  loadCookiesFromStore,
};

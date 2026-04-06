import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);
const GOOGLE_CHROME_APP = "Google Chrome";
const APPLESCRIPT_TAB_SEPARATOR = "\t";
const OSASCRIPT_MAX_BUFFER = 64 * 1024 * 1024;

export interface GoogleChromeTabTarget {
  windowId: number;
  tabId: number;
  url: string;
  isActive: boolean;
}

export interface GoogleChromeFetchResponse {
  ok: boolean;
  status: number;
  url: string;
  body: unknown;
}

export async function findGoogleChromeTab(hosts: string[]): Promise<GoogleChromeTabTarget | null> {
  const tabs = await listGoogleChromeTabs();

  return (
    tabs
      .filter((tab) => matchesHosts(tab.url, hosts))
      .sort((left, right) => Number(right.isActive) - Number(left.isActive))[0] ?? null
  );
}

export async function evaluateGoogleChromeTabScript(target: GoogleChromeTabTarget, script: string): Promise<string> {
  try {
    const { stdout } = await execFile("/usr/bin/osascript", [
      "-e",
      `tell application "${GOOGLE_CHROME_APP}" to tell tab id ${target.tabId} of window id ${target.windowId} to execute javascript ${quoteAppleScriptString(script)}`,
    ], {
      maxBuffer: OSASCRIPT_MAX_BUFFER,
    });

    return stdout.trim();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes("Executing JavaScript through AppleScript is turned off")) {
      throw new Error(
        'Google Chrome is open, but JavaScript from Apple Events is disabled. Enable "View > Developer > Allow JavaScript from Apple Events" in Chrome and retry.',
      );
    }

    throw error;
  }
}

export async function fetchJsonFromGoogleChromeTab(
  target: GoogleChromeTabTarget,
  request: {
    path: string;
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  },
): Promise<GoogleChromeFetchResponse> {
  const raw = await evaluateGoogleChromeTabScript(target, buildSynchronousFetchScript(request));

  try {
    return JSON.parse(raw) as GoogleChromeFetchResponse;
  } catch {
    throw new Error(`Could not parse Google Chrome tab response for ${request.path}.`);
  }
}

async function listGoogleChromeTabs(): Promise<GoogleChromeTabTarget[]> {
  try {
    const { stdout } = await execFile("/usr/bin/osascript", [
      "-e",
      `
        tell application "${GOOGLE_CHROME_APP}"
          if (count of windows) is 0 then
            return ""
          end if

          set frontWindowId to id of front window
          set output to ""

          repeat with w in windows
            set windowId to id of w
            set activeTabId to id of active tab of w

            repeat with t in tabs of w
              set output to output & (windowId as string) & "${APPLESCRIPT_TAB_SEPARATOR}" & (id of t as string) & "${APPLESCRIPT_TAB_SEPARATOR}" & (URL of t as string) & "${APPLESCRIPT_TAB_SEPARATOR}" & ((id of t is activeTabId) as string) & linefeed
            end repeat
          end repeat

          return output
        end tell
      `,
    ], {
      maxBuffer: OSASCRIPT_MAX_BUFFER,
    });

    return stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map(parseGoogleChromeTabLine)
      .filter((tab): tab is GoogleChromeTabTarget => tab !== null);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes("Application isn’t running") || message.includes("Google Chrome got an error")) {
      return [];
    }

    throw error;
  }
}

function parseGoogleChromeTabLine(line: string): GoogleChromeTabTarget | null {
  const [windowIdValue, tabIdValue, url, isActiveValue] = line.split(APPLESCRIPT_TAB_SEPARATOR);
  const windowId = Number.parseInt(windowIdValue ?? "", 10);
  const tabId = Number.parseInt(tabIdValue ?? "", 10);

  if (!Number.isFinite(windowId) || !Number.isFinite(tabId) || !url) {
    return null;
  }

  return {
    windowId,
    tabId,
    url,
    isActive: isActiveValue === "true",
  };
}

function matchesHosts(rawUrl: string, hosts: string[]): boolean {
  try {
    const url = new URL(rawUrl);
    return hosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
}

function quoteAppleScriptString(value: string): string {
  return `"${value.replaceAll("\\", "\\\\").replaceAll("\"", "\\\"")}"`;
}

function buildSynchronousFetchScript(request: {
  path: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}): string {
  const requestJson = JSON.stringify({
    path: request.path,
    method: request.method ?? "GET",
    headers: request.headers ?? {},
    ...(request.body !== undefined ? { body: request.body } : {}),
  });

  return `(() => {
    const request = ${requestJson};
    const xhr = new XMLHttpRequest();
    xhr.open(request.method || "GET", request.path, false);

    for (const [key, value] of Object.entries(request.headers || {})) {
      xhr.setRequestHeader(key, value);
    }

    xhr.send(Object.prototype.hasOwnProperty.call(request, "body") ? request.body : null);

    const text = xhr.responseText || "";
    let body = text;

    try {
      body = JSON.parse(text);
    } catch {}

    return JSON.stringify({
      ok: xhr.status >= 200 && xhr.status < 300,
      status: xhr.status,
      url: xhr.responseURL || request.path,
      body,
    });
  })()`;
}

export const __internal = {
  buildSynchronousFetchScript,
  matchesHosts,
  parseGoogleChromeTabLine,
  quoteAppleScriptString,
};

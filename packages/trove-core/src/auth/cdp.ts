const DEFAULT_CDP_PORTS = [9222, 9223, 9333];

export function listCommonCdpUrls(): string[] {
  return DEFAULT_CDP_PORTS.map((port) => `http://127.0.0.1:${port}`);
}

export async function findAttachableCdpUrl(
  urls = listCommonCdpUrls(),
): Promise<string | undefined> {
  for (const url of urls) {
    if (await isAttachableCdpUrl(url)) {
      return url;
    }
  }

  return undefined;
}

async function isAttachableCdpUrl(url: string): Promise<boolean> {
  try {
    const endpoint = new URL("/json/version", ensureTrailingSlash(url));
    const response = await fetch(endpoint, {
      headers: {
        accept: "application/json",
      },
      signal: AbortSignal.timeout(750),
    });

    if (!response.ok) {
      return false;
    }

    const payload = asRecord(await response.json());
    return (
      typeof payload?.webSocketDebuggerUrl === "string" && payload.webSocketDebuggerUrl.length > 0
    );
  } catch {
    return false;
  }
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export const __internal = {
  isAttachableCdpUrl,
};

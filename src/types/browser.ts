export type SupportedBrowserId = "chrome" | "dia" | "brave" | "arc";

export interface BrowserDefinition {
  id: SupportedBrowserId;
  name: string;
  executablePath: string;
  userDataDir: string;
  defaultProfile: string;
  cookieSupport: "verified" | "experimental";
  notes?: string;
}

export interface ResolvedBrowserTarget extends BrowserDefinition {
  profile: string;
  cookiesPath: string;
}

export interface BrowserSession {
  browser: ResolvedBrowserTarget;
  cookieHeader: string;
  playwrightCookies: Array<{
    name: string;
    value: string;
    domain?: string;
    path?: string;
    expires?: number;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: "Strict" | "Lax" | "None";
  }>;
}

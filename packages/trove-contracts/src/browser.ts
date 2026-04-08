import { z } from "zod";

export const SUPPORTED_BROWSER_IDS = ["chrome", "dia", "brave", "arc"] as const;

export const supportedBrowserIdSchema = z.enum(SUPPORTED_BROWSER_IDS);

export type SupportedBrowserId = (typeof SUPPORTED_BROWSER_IDS)[number];

export interface BrowserDefinition {
  id: SupportedBrowserId;
  name: string;
  executablePath: string;
  userDataDir: string;
  defaultProfile: string;
  cookieSupport: "verified" | "experimental";
  notes?: string;
}

export const browserDefinitionSchema = z.object({
  id: supportedBrowserIdSchema,
  name: z.string().min(1),
  executablePath: z.string().min(1),
  userDataDir: z.string().min(1),
  defaultProfile: z.string().min(1),
  cookieSupport: z.enum(["verified", "experimental"]),
  notes: z.string().min(1).optional(),
});

export interface ResolvedBrowserTarget extends BrowserDefinition {
  profile: string;
  cookiesPath: string;
}

export const resolvedBrowserTargetSchema = browserDefinitionSchema.extend({
  profile: z.string().min(1),
  cookiesPath: z.string().min(1),
});

export interface PlaywrightCookie {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "Strict" | "Lax" | "None";
}

export const playwrightCookieSchema = z.object({
  name: z.string().min(1),
  value: z.string(),
  domain: z.string().min(1).optional(),
  path: z.string().min(1).optional(),
  expires: z.number().optional(),
  httpOnly: z.boolean().optional(),
  secure: z.boolean().optional(),
  sameSite: z.enum(["Strict", "Lax", "None"]).optional(),
});

export interface BrowserSession {
  browser: ResolvedBrowserTarget;
  cookieHeader: string;
  playwrightCookies: PlaywrightCookie[];
}

export const browserSessionSchema = z.object({
  browser: resolvedBrowserTargetSchema,
  cookieHeader: z.string(),
  playwrightCookies: z.array(playwrightCookieSchema),
});

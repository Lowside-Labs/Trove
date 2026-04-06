import type { TroveItem } from "./item.js";
import type { CommandReport } from "./report.js";

export interface SyncCommandOptions {
  browser: string;
  profile?: string;
  limit?: string;
  cdpUrl?: string;
  sessionMode?: "cdp" | "chrome-live";
  headful?: boolean;
  debugRawPages?: boolean;
  user?: string;
  kind?: string;
}

export interface SyncSourceResult {
  items: TroveItem[];
  rawPath: string;
  nextCursor?: string;
  debugRawPagesPath?: string;
  contentPath?: string;
}

export type SyncSummary = CommandReport;

export interface SyncKindMetadata {
  id: string;
  aliases?: string[];
  default?: boolean;
}

export interface SyncSourceMetadata {
  displayName: string;
  authMode: "cookie" | "public" | "cdp";
  kinds: SyncKindMetadata[];
  requiresBrowser?: boolean;
  requiresUser?: boolean;
}

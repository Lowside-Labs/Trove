export interface TrovePaths {
  root: string;
  dataDir: string;
  rawDir: string;
  contentDir: string;
  indexDir: string;
  logDir: string;
  dbPath: string;
}

export interface ResolveWorkspaceRootOptions {
  home?: string;
  path?: string;
  here?: boolean;
  cwd?: string;
}

export interface SavedSourceBrowserTarget {
  browserId: string;
  profile?: string;
}

export interface CommandWorkspaceResolution {
  root?: string;
  source?: "explicit" | "cwd" | "saved" | "legacy";
  error?: string;
}

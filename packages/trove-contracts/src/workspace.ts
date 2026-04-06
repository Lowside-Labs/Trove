import { z } from "zod";

export const trovePathsSchema = z.object({
  root: z.string().min(1),
  dataDir: z.string().min(1),
  rawDir: z.string().min(1),
  contentDir: z.string().min(1),
  indexDir: z.string().min(1),
  logDir: z.string().min(1),
  dbPath: z.string().min(1),
});

export type TrovePaths = z.infer<typeof trovePathsSchema>;

export const resolveWorkspaceRootOptionsSchema = z.object({
  home: z.string().min(1).optional(),
  path: z.string().min(1).optional(),
  here: z.boolean().optional(),
  cwd: z.string().min(1).optional(),
});

export type ResolveWorkspaceRootOptions = z.infer<typeof resolveWorkspaceRootOptionsSchema>;

export const savedSourceBrowserTargetSchema = z.object({
  browserId: z.string().min(1),
  profile: z.string().min(1).optional(),
});

export type SavedSourceBrowserTarget = z.infer<typeof savedSourceBrowserTargetSchema>;

export const commandWorkspaceResolutionSchema = z.object({
  root: z.string().min(1).optional(),
  source: z.enum(["explicit", "cwd", "saved", "legacy"]).optional(),
  error: z.string().min(1).optional(),
});

export type CommandWorkspaceResolution = z.infer<typeof commandWorkspaceResolutionSchema>;

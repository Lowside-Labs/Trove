import { z } from "zod";
import { troveItemSchema } from "./item.js";
import { commandReportSchema } from "./report.js";

export const syncCommandOptionsSchema = z.object({
  browser: z.string().min(1),
  profile: z.string().min(1).optional(),
  limit: z.string().min(1).optional(),
  cdpUrl: z.string().url().optional(),
  sessionMode: z.enum(["cdp", "chrome-live"]).optional(),
  headful: z.boolean().optional(),
  debugRawPages: z.boolean().optional(),
  user: z.string().min(1).optional(),
  kind: z.string().min(1).optional(),
});

export type SyncCommandOptions = z.infer<typeof syncCommandOptionsSchema>;

export const syncSourceResultSchema = z.object({
  items: z.array(troveItemSchema),
  rawPath: z.string().min(1),
  nextCursor: z.string().min(1).optional(),
  debugRawPagesPath: z.string().min(1).optional(),
  contentPath: z.string().min(1).optional(),
});

export type SyncSourceResult = z.infer<typeof syncSourceResultSchema>;

export const syncSummarySchema = commandReportSchema;

export type SyncSummary = z.infer<typeof syncSummarySchema>;

export const syncKindMetadataSchema = z.object({
  id: z.string().min(1),
  aliases: z.array(z.string().min(1)).optional(),
  default: z.boolean().optional(),
});

export type SyncKindMetadata = z.infer<typeof syncKindMetadataSchema>;

export const syncSourceMetadataSchema = z.object({
  displayName: z.string().min(1),
  authMode: z.enum(["cookie", "public", "cdp"]),
  kinds: z.array(syncKindMetadataSchema),
  requiresBrowser: z.boolean().optional(),
  requiresUser: z.boolean().optional(),
});

export type SyncSourceMetadata = z.infer<typeof syncSourceMetadataSchema>;

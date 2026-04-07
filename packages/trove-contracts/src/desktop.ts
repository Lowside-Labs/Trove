import { z } from "zod";
import { syncKindMetadataSchema } from "./sync.js";

export const workspaceOverviewSchema = z.object({
  root: z.string().min(1),
  totalItems: z.number().int().nonnegative(),
  totalSources: z.number().int().nonnegative(),
  lastSyncedAt: z.string().min(1).optional(),
});

export type WorkspaceOverview = z.infer<typeof workspaceOverviewSchema>;

export const sourceStatusSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  status: z.enum(["active", "connected-empty", "available"]),
  authMode: z.enum(["cookie", "public", "cdp"]),
  itemCount: z.number().int().nonnegative(),
  lastSyncedAt: z.string().min(1).optional(),
  kinds: z.array(syncKindMetadataSchema),
  requiresBrowser: z.boolean().optional(),
  requiresUser: z.boolean().optional(),
});

export type SourceStatus = z.infer<typeof sourceStatusSchema>;

export const contentFormatSchema = z.enum(["markdown", "plain"]);

export type ContentFormat = z.infer<typeof contentFormatSchema>;

export const libraryItemSummarySchema = z.object({
  id: z.number().int().nonnegative(),
  source: z.string().min(1),
  kind: z.string().min(1),
  externalId: z.string().min(1),
  title: z.string().min(1),
  url: z.string().url(),
  excerpt: z.string().optional(),
  author: z.string().optional(),
  savedAt: z.string().min(1),
  importedAt: z.string().min(1),
  tags: z.array(z.string().min(1)),
  hasContent: z.boolean(),
  raw: z.record(z.string(), z.unknown()).optional(),
});

export type LibraryItemSummary = z.infer<typeof libraryItemSummarySchema>;

export const libraryItemDetailSchema = libraryItemSummarySchema.extend({
  content: z.string().optional(),
  contentFormat: contentFormatSchema.optional(),
});

export type LibraryItemDetail = z.infer<typeof libraryItemDetailSchema>;

export const listLibraryItemsInputSchema = z.object({
  query: z.string().min(1).optional(),
  source: z.string().min(1).optional(),
  kind: z.string().min(1).optional(),
  cursor: z.string().min(1).optional(),
  limit: z.number().int().positive().max(500).optional(),
});

export type ListLibraryItemsInput = z.infer<typeof listLibraryItemsInputSchema>;

export const listLibraryItemsResultSchema = z.object({
  items: z.array(libraryItemSummarySchema),
  nextCursor: z.string().min(1).optional(),
  hasMore: z.boolean(),
});

export type ListLibraryItemsResult = z.infer<typeof listLibraryItemsResultSchema>;

export const getLibraryItemInputSchema = z.object({
  id: z.number().int().nonnegative(),
});

export type GetLibraryItemInput = z.infer<typeof getLibraryItemInputSchema>;

export const workspaceSnapshotReadySchema = z.object({
  status: z.literal("ready"),
  overview: workspaceOverviewSchema,
  sources: z.array(sourceStatusSchema),
});

export const workspaceSnapshotMissingSchema = z.object({
  status: z.literal("missing"),
  message: z.string().min(1),
});

export const workspaceSnapshotSchema = z.union([
  workspaceSnapshotReadySchema,
  workspaceSnapshotMissingSchema,
]);

export type WorkspaceSnapshot = z.infer<typeof workspaceSnapshotSchema>;

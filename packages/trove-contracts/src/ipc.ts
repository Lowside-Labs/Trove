import { z } from "zod";
import {
  getLibraryItemInputSchema,
  libraryItemDetailSchema,
  listLibraryItemsInputSchema,
  listLibraryItemsResultSchema,
  workspaceSnapshotSchema,
} from "./desktop.js";
export const DESKTOP_IPC_CHANNELS = {
  workspaceGetSnapshot: "workspace:getSnapshot",
  libraryListItems: "library:listItems",
  libraryGetItem: "library:getItem",
  syncStart: "sync:start",
  systemOpenExternal: "system:openExternal",
  systemCopyArchivePath: "system:copyArchivePath",
  systemRevealArchivePath: "system:revealArchivePath",
  themeGet: "theme:get",
  themeSet: "theme:set",
} as const;

export const workspaceGetSnapshotRequestSchema = z.object({}).strict();
export const workspaceGetSnapshotResponseSchema = workspaceSnapshotSchema;

export const libraryListItemsRequestSchema = listLibraryItemsInputSchema;
export const libraryListItemsResponseSchema = listLibraryItemsResultSchema;

export const libraryGetItemRequestSchema = getLibraryItemInputSchema;
export const libraryGetItemResponseSchema = libraryItemDetailSchema.nullable();

export const syncRunResultSchema = z.object({
  label: z.string().min(1),
  count: z.number().int().nonnegative(),
});
export type SyncRunResult = z.infer<typeof syncRunResultSchema>;

export const syncJobResultSchema = z.object({
  source: z.string().min(1),
  runs: z.array(syncRunResultSchema),
  totalCount: z.number().int().nonnegative(),
});
export type SyncJobResult = z.infer<typeof syncJobResultSchema>;

export const syncStartRequestSchema = z.object({
  source: z.string().min(1),
  kind: z.string().min(1).optional(),
  limit: z.number().int().positive().max(5000).optional(),
  user: z.string().min(1).optional(),
});
export type SyncStartRequest = z.infer<typeof syncStartRequestSchema>;

export const syncStartResponseSchema = syncJobResultSchema;
export type SyncStartResponse = z.infer<typeof syncStartResponseSchema>;

export const systemOpenExternalRequestSchema = z.object({
  url: z.string().url(),
});
export const systemOpenExternalResponseSchema = z.object({
  ok: z.literal(true),
});

export type SystemOpenExternalRequest = z.infer<typeof systemOpenExternalRequestSchema>;
export type SystemOpenExternalResponse = z.infer<typeof systemOpenExternalResponseSchema>;

export const systemCopyArchivePathRequestSchema = z.object({}).strict();
export const systemCopyArchivePathResponseSchema = z.object({
  ok: z.literal(true),
  path: z.string().min(1),
});

export type SystemCopyArchivePathRequest = z.infer<typeof systemCopyArchivePathRequestSchema>;
export type SystemCopyArchivePathResponse = z.infer<typeof systemCopyArchivePathResponseSchema>;

export const systemRevealArchivePathRequestSchema = z.object({}).strict();
export const systemRevealArchivePathResponseSchema = z.object({
  ok: z.literal(true),
  path: z.string().min(1),
});

export type SystemRevealArchivePathRequest = z.infer<typeof systemRevealArchivePathRequestSchema>;
export type SystemRevealArchivePathResponse = z.infer<typeof systemRevealArchivePathResponseSchema>;

export const themePreferenceSchema = z.enum(["system", "light", "dark"]);
export type ThemePreference = z.infer<typeof themePreferenceSchema>;

export const themeGetRequestSchema = z.object({}).strict();
export const themeGetResponseSchema = z.object({
  preference: themePreferenceSchema,
  shouldUseDarkColors: z.boolean(),
});
export type ThemeGetResponse = z.infer<typeof themeGetResponseSchema>;

export const themeSetRequestSchema = z.object({
  preference: themePreferenceSchema,
});
export const themeSetResponseSchema = z.object({
  preference: themePreferenceSchema,
  shouldUseDarkColors: z.boolean(),
});
export type ThemeSetResponse = z.infer<typeof themeSetResponseSchema>;

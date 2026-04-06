import { z } from "zod";
import {
  getLibraryItemInputSchema,
  libraryItemDetailSchema,
  libraryItemSummarySchema,
  listLibraryItemsInputSchema,
  workspaceSnapshotSchema,
} from "./desktop.js";

export const DESKTOP_IPC_CHANNELS = {
  workspaceGetSnapshot: "workspace:getSnapshot",
  libraryListItems: "library:listItems",
  libraryGetItem: "library:getItem",
  systemOpenExternal: "system:openExternal",
} as const;

export const workspaceGetSnapshotRequestSchema = z.object({}).strict();
export const workspaceGetSnapshotResponseSchema = workspaceSnapshotSchema;

export const libraryListItemsRequestSchema = listLibraryItemsInputSchema;
export const libraryListItemsResponseSchema = z.array(libraryItemSummarySchema);

export const libraryGetItemRequestSchema = getLibraryItemInputSchema;
export const libraryGetItemResponseSchema = libraryItemDetailSchema.nullable();

export const systemOpenExternalRequestSchema = z.object({
  url: z.string().url(),
});
export const systemOpenExternalResponseSchema = z.object({
  ok: z.literal(true),
});

export type SystemOpenExternalRequest = z.infer<typeof systemOpenExternalRequestSchema>;
export type SystemOpenExternalResponse = z.infer<typeof systemOpenExternalResponseSchema>;

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
} as const;

export const workspaceGetSnapshotRequestSchema = z.object({}).strict();
export const workspaceGetSnapshotResponseSchema = workspaceSnapshotSchema;

export const libraryListItemsRequestSchema = listLibraryItemsInputSchema;
export const libraryListItemsResponseSchema = z.array(libraryItemSummarySchema);

export const libraryGetItemRequestSchema = getLibraryItemInputSchema;
export const libraryGetItemResponseSchema = libraryItemDetailSchema.nullable();

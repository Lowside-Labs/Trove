import { ipcMain } from "electron";
import {
  DESKTOP_IPC_CHANNELS,
  libraryGetItemRequestSchema,
  libraryGetItemResponseSchema,
  libraryListItemsRequestSchema,
  libraryListItemsResponseSchema,
} from "trove-contracts";
import { getLibraryItem, listLibraryItems } from "trove-core";
import { requireDesktopWorkspaceRoot } from "./resolve-workspace";

export function registerLibraryIpcHandlers(): void {
  ipcMain.handle(DESKTOP_IPC_CHANNELS.libraryListItems, (_event, input) => {
    const parsedInput = libraryListItemsRequestSchema.parse(input ?? {});
    const root = requireDesktopWorkspaceRoot();

    return libraryListItemsResponseSchema.parse(listLibraryItems(parsedInput, root));
  });

  ipcMain.handle(DESKTOP_IPC_CHANNELS.libraryGetItem, (_event, input) => {
    const parsedInput = libraryGetItemRequestSchema.parse(input);
    const root = requireDesktopWorkspaceRoot();

    return libraryGetItemResponseSchema.parse(getLibraryItem(parsedInput, { root }));
  });
}

import { contextBridge, ipcRenderer } from "electron";
import { DESKTOP_IPC_CHANNELS } from "trove-contracts";
import type {
  GetLibraryItemInput,
  LibraryItemDetail,
  LibraryItemSummary,
  ListLibraryItemsInput,
  WorkspaceSnapshot,
} from "trove-contracts";
import type { TroveDesktopApi } from "../shared/bridge";

const troveDesktop: TroveDesktopApi = {
  workspace: {
    async getSnapshot() {
      const response = await ipcRenderer.invoke(DESKTOP_IPC_CHANNELS.workspaceGetSnapshot, {});
      return response as WorkspaceSnapshot;
    },
  },
  library: {
    async listItems(input: ListLibraryItemsInput = {}) {
      const response = await ipcRenderer.invoke(DESKTOP_IPC_CHANNELS.libraryListItems, input);
      return response as LibraryItemSummary[];
    },
    async getItem(input: GetLibraryItemInput) {
      const response = await ipcRenderer.invoke(DESKTOP_IPC_CHANNELS.libraryGetItem, input);
      return response as LibraryItemDetail | null;
    },
  },
  system: {
    async openExternal(url: string) {
      await ipcRenderer.invoke(DESKTOP_IPC_CHANNELS.systemOpenExternal, { url });
    },
  },
};

contextBridge.exposeInMainWorld("troveDesktop", troveDesktop);

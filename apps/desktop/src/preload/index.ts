import { contextBridge, ipcRenderer } from "electron";
import { DESKTOP_IPC_CHANNELS } from "trove-contracts";
import type {
  GetLibraryItemInput,
  LibraryItemDetail,
  ListLibraryItemsInput,
  ListLibraryItemsResult,
  ThemeGetResponse,
  ThemePreference,
  ThemeSetResponse,
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
      return response as ListLibraryItemsResult;
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
  theme: {
    async get() {
      const response = await ipcRenderer.invoke(DESKTOP_IPC_CHANNELS.themeGet, {});
      return response as ThemeGetResponse;
    },
    async set(preference: ThemePreference) {
      const response = await ipcRenderer.invoke(DESKTOP_IPC_CHANNELS.themeSet, { preference });
      return response as ThemeSetResponse;
    },
  },
};

contextBridge.exposeInMainWorld("troveDesktop", troveDesktop);

import { contextBridge, ipcRenderer } from "electron";
import { DESKTOP_IPC_CHANNELS } from "trove-contracts";
import type { WorkspaceSnapshot } from "trove-contracts";
import type { TroveDesktopApi } from "../shared/bridge";

const troveDesktop: TroveDesktopApi = {
  workspace: {
    async getSnapshot() {
      const response = await ipcRenderer.invoke(DESKTOP_IPC_CHANNELS.workspaceGetSnapshot, {});
      return response as WorkspaceSnapshot;
    },
  },
};

contextBridge.exposeInMainWorld("troveDesktop", troveDesktop);

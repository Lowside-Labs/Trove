import { ipcMain } from "electron";
import {
  DESKTOP_IPC_CHANNELS,
  workspaceGetSnapshotRequestSchema,
  workspaceGetSnapshotResponseSchema,
} from "trove-contracts";
import {
  getWorkspaceOverview,
  getWorkspaceSourceStatuses,
} from "trove-core";
import { resolveDesktopWorkspace } from "./resolve-workspace";

export function registerWorkspaceIpcHandlers(): void {
  ipcMain.handle(DESKTOP_IPC_CHANNELS.workspaceGetSnapshot, (_event, input) => {
    workspaceGetSnapshotRequestSchema.parse(input ?? {});

    const resolution = resolveDesktopWorkspace();

    if (!resolution.root) {
      return workspaceGetSnapshotResponseSchema.parse({
        status: "missing",
        message: resolution.error ?? "No Trove workspace found.",
      });
    }

    return workspaceGetSnapshotResponseSchema.parse({
      status: "ready",
      overview: getWorkspaceOverview(resolution.root),
      sources: getWorkspaceSourceStatuses(resolution.root),
    });
  });
}

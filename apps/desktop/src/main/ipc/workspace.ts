import { ipcMain } from "electron";
import {
  DESKTOP_IPC_CHANNELS,
  workspaceGetSnapshotRequestSchema,
  workspaceGetSnapshotResponseSchema,
} from "trove-contracts";
import {
  getWorkspaceOverview,
  getWorkspaceSourceStatuses,
  resolveActiveWorkspace,
} from "trove-core";

export function registerWorkspaceIpcHandlers(): void {
  ipcMain.handle(DESKTOP_IPC_CHANNELS.workspaceGetSnapshot, (_event, input) => {
    workspaceGetSnapshotRequestSchema.parse(input ?? {});

    const resolution = resolveActiveWorkspace({
      ...(process.env.TROVE_HOME ? { home: process.env.TROVE_HOME } : {}),
    });

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

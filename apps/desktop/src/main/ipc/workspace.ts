import { dialog, ipcMain } from "electron";
import {
  DESKTOP_IPC_CHANNELS,
  workspacePickDirectoryRequestSchema,
  workspacePickDirectoryResponseSchema,
  workspaceGetSnapshotRequestSchema,
  workspaceGetSnapshotResponseSchema,
  workspaceSetRootRequestSchema,
  workspaceSetRootResponseSchema,
} from "trove-contracts";
import {
  getWorkspaceSnapshot,
  initializeWorkspace,
  saveDefaultWorkspaceRoot,
  workspaceExists,
} from "trove-core";
import {
  buildDesktopWorkspaceSetup,
  resolveDesktopWorkspace,
  setDesktopWorkspaceRoot,
} from "./resolve-workspace";

function buildReadySnapshot(root: string) {
  const { overview, sources } = getWorkspaceSnapshot(root);
  return workspaceSetRootResponseSchema.parse({
    status: "ready",
    overview,
    sources,
  });
}

export function registerWorkspaceIpcHandlers(): void {
  ipcMain.handle(DESKTOP_IPC_CHANNELS.workspaceGetSnapshot, (_event, input) => {
    workspaceGetSnapshotRequestSchema.parse(input ?? {});

    const resolution = resolveDesktopWorkspace();

    if (!resolution.root) {
      return workspaceGetSnapshotResponseSchema.parse({
        status: "missing",
        message: resolution.error ?? "No Trove workspace found.",
        setup: buildDesktopWorkspaceSetup(),
      });
    }

    return buildReadySnapshot(resolution.root);
  });

  ipcMain.handle(DESKTOP_IPC_CHANNELS.workspacePickDirectory, async (_event, input) => {
    const parsedInput = workspacePickDirectoryRequestSchema.parse(input);
    const result = await dialog.showOpenDialog({
      title:
        parsedInput.purpose === "open"
          ? "Choose an existing Trove workspace"
          : "Choose a folder for your Trove workspace",
      buttonLabel: parsedInput.purpose === "open" ? "Use Workspace" : "Create Workspace",
      ...(parsedInput.defaultPath ? { defaultPath: parsedInput.defaultPath } : {}),
      properties: ["openDirectory", "createDirectory"],
    });

    return workspacePickDirectoryResponseSchema.parse({
      canceled: result.canceled,
      ...(result.filePaths[0] ? { path: result.filePaths[0] } : {}),
    });
  });

  ipcMain.handle(DESKTOP_IPC_CHANNELS.workspaceSetRoot, (_event, input) => {
    const parsedInput = workspaceSetRootRequestSchema.parse(input);
    const root = parsedInput.root;

    if (parsedInput.createIfMissing) {
      initializeWorkspace({ path: root });
    } else if (!workspaceExists(root)) {
      throw new Error(
        `Trove workspace not found at ${root}. Choose a folder containing data/trove.db or create a new workspace there.`,
      );
    } else {
      saveDefaultWorkspaceRoot(root);
    }

    setDesktopWorkspaceRoot(root);

    return buildReadySnapshot(root);
  });
}

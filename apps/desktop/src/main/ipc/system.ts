import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { clipboard, ipcMain, shell } from "electron";
import {
  DESKTOP_IPC_CHANNELS,
  systemCopyArchivePathRequestSchema,
  systemCopyArchivePathResponseSchema,
  systemOpenExternalRequestSchema,
  systemOpenExternalResponseSchema,
  systemRevealArchivePathRequestSchema,
  systemRevealArchivePathResponseSchema,
} from "trove-contracts";
import { requireDesktopWorkspaceRoot } from "./resolve-workspace";

const execFileAsync = promisify(execFile);

function assertOpenExternalUrl(url: string): string {
  const parsed = new URL(url);

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only http and https URLs can be opened externally.");
  }

  return parsed.toString();
}

export function registerSystemIpcHandlers(): void {
  ipcMain.handle(DESKTOP_IPC_CHANNELS.systemOpenExternal, async (_event, input) => {
    const parsedInput = systemOpenExternalRequestSchema.parse(input);
    await shell.openExternal(assertOpenExternalUrl(parsedInput.url));
    return systemOpenExternalResponseSchema.parse({ ok: true });
  });

  ipcMain.handle(DESKTOP_IPC_CHANNELS.systemCopyArchivePath, (_event, input) => {
    systemCopyArchivePathRequestSchema.parse(input ?? {});

    const path = requireDesktopWorkspaceRoot();
    clipboard.writeText(path);

    return systemCopyArchivePathResponseSchema.parse({
      ok: true,
      path,
    });
  });

  ipcMain.handle(DESKTOP_IPC_CHANNELS.systemRevealArchivePath, async (_event, input) => {
    systemRevealArchivePathRequestSchema.parse(input ?? {});

    const path = requireDesktopWorkspaceRoot();

    if (process.platform === "darwin") {
      await execFileAsync("open", [path]);
    } else {
      const error = await shell.openPath(path);

      if (error) {
        throw new Error(error);
      }
    }

    return systemRevealArchivePathResponseSchema.parse({
      ok: true,
      path,
    });
  });
}

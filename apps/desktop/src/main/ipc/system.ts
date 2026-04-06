import { ipcMain, shell } from "electron";
import {
  DESKTOP_IPC_CHANNELS,
  systemOpenExternalRequestSchema,
  systemOpenExternalResponseSchema,
} from "trove-contracts";

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
}

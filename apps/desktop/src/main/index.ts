import { app, BrowserWindow } from "electron";
import { registerLibraryIpcHandlers } from "./ipc/library";
import { registerSystemIpcHandlers } from "./ipc/system";
import { registerWorkspaceIpcHandlers } from "./ipc/workspace";
import { createMainWindow } from "./windows";

let mainWindow: BrowserWindow | null = null;

function openMainWindow(): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.focus();
    return;
  }

  mainWindow = createMainWindow();
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  app.setName("Trove");
  registerLibraryIpcHandlers();
  registerSystemIpcHandlers();
  registerWorkspaceIpcHandlers();
  openMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      openMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

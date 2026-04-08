import { app, BrowserWindow, nativeImage } from "electron";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { registerLibraryIpcHandlers } from "./ipc/library";
import { registerSyncIpcHandlers } from "./ipc/sync";
import { registerSystemIpcHandlers } from "./ipc/system";
import { registerThemeIpcHandlers } from "./ipc/theme";
import { registerWorkspaceIpcHandlers } from "./ipc/workspace";
import { createMainWindow } from "./windows";

const dirname = path.dirname(fileURLToPath(import.meta.url));
let mainWindow: BrowserWindow | null = null;

function applyDevDockIcon(): void {
  if (process.platform !== "darwin" || !process.env.ELECTRON_RENDERER_URL) {
    return;
  }

  const iconPath = path.join(dirname, "../../build/icon.png");

  if (!fs.existsSync(iconPath)) {
    return;
  }

  const icon = nativeImage.createFromPath(iconPath);

  if (!icon.isEmpty() && app.dock) {
    app.dock.setIcon(icon);
  }
}

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

app.setName("Trove");

app.whenReady().then(() => {
  applyDevDockIcon();
  registerThemeIpcHandlers();
  registerLibraryIpcHandlers();
  registerSyncIpcHandlers();
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

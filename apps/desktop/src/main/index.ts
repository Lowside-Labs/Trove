import { app, BrowserWindow, nativeImage, session } from "electron";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { REACT_DEVELOPER_TOOLS, installExtension } from "electron-devtools-installer";
import { registerLibraryIpcHandlers } from "./ipc/library";
import { registerSyncIpcHandlers } from "./ipc/sync";
import { registerSystemIpcHandlers } from "./ipc/system";
import { registerThemeIpcHandlers } from "./ipc/theme";
import { registerWorkspaceIpcHandlers } from "./ipc/workspace";
import { createMainWindow } from "./windows";

const dirname = path.dirname(fileURLToPath(import.meta.url));
let mainWindow: BrowserWindow | null = null;

function isDevEnvironment(): boolean {
  return Boolean(process.env.ELECTRON_RENDERER_URL);
}

function applyDevDockIcon(): void {
  if (process.platform !== "darwin" || !isDevEnvironment()) {
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

async function installReactDevTools(): Promise<void> {
  if (!isDevEnvironment()) {
    return;
  }

  try {
    await installExtension(REACT_DEVELOPER_TOOLS, {
      loadExtensionOptions: { allowFileAccess: true },
      session: session.defaultSession,
    });
  } catch (error) {
    console.warn("Failed to install React Developer Tools.", error);
  }
}

function openMainWindow(): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.focus();
    return;
  }

  mainWindow = createMainWindow();
  if (isDevEnvironment()) {
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }
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
  void installReactDevTools().finally(() => {
    openMainWindow();
  });

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

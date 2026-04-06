import { BrowserWindow, shell } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export function createMainWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 1100,
    minHeight: 720,
    backgroundColor: "#f4efe3",
    title: "Trove Desktop",
    webPreferences: {
      preload: path.join(dirname, "../preload/index.mjs"),
      nodeIntegration: false,
      contextIsolation: true,
      // Electron ESM preload scripts do not run in sandboxed renderers.
      sandbox: false,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    const currentUrl = mainWindow.webContents.getURL();

    if (url !== currentUrl) {
      event.preventDefault();
      void shell.openExternal(url);
    }
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void mainWindow.loadFile(path.join(dirname, "../renderer/index.html"));
  }

  return mainWindow;
}

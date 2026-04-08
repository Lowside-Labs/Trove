import { BrowserWindow, nativeTheme, shell } from "electron";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

function resolveRendererEntry(): string {
  const candidates = [
    path.join(dirname, "../renderer/index.html"),
    path.join(dirname, "../../src/renderer/dist/renderer/index.html"),
  ];

  const entry = candidates.find((candidate) => fs.existsSync(candidate));

  if (!entry) {
    throw new Error("Could not find the built renderer entrypoint.");
  }

  return entry;
}

export function createMainWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 1100,
    minHeight: 720,
    backgroundColor: "#00000000",
    title: "Trove",
    ...(process.platform === "darwin" ? { titleBarStyle: "hiddenInset" as const } : {}),
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
    void mainWindow.loadFile(resolveRendererEntry());
  }

  return mainWindow;
}

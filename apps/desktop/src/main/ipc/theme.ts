import { app, ipcMain, nativeTheme } from "electron";
import fs from "node:fs";
import path from "node:path";
import {
  DESKTOP_IPC_CHANNELS,
  themeGetResponseSchema,
  themePreferenceSchema,
  themeSetRequestSchema,
  themeSetResponseSchema,
} from "trove-contracts";
import type { ThemePreference } from "trove-contracts";

function prefsPath(): string {
  return path.join(app.getPath("userData"), "preferences.json");
}

function readPreference(): ThemePreference {
  try {
    const raw = JSON.parse(fs.readFileSync(prefsPath(), "utf-8"));
    const result = themePreferenceSchema.safeParse(raw.theme);
    return result.success ? result.data : "system";
  } catch {
    return "system";
  }
}

function writePreference(preference: ThemePreference): void {
  const filePath = prefsPath();
  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    // File doesn't exist yet — start fresh
  }
  data.theme = preference;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function buildResponse(preference: ThemePreference) {
  return { preference, shouldUseDarkColors: nativeTheme.shouldUseDarkColors };
}

export function registerThemeIpcHandlers(): void {
  // Apply saved preference immediately so the window opens with the right theme
  nativeTheme.themeSource = readPreference();

  ipcMain.handle(DESKTOP_IPC_CHANNELS.themeGet, () => {
    return themeGetResponseSchema.parse(buildResponse(readPreference()));
  });

  ipcMain.handle(DESKTOP_IPC_CHANNELS.themeSet, (_event, input) => {
    const { preference } = themeSetRequestSchema.parse(input);
    writePreference(preference);
    nativeTheme.themeSource = preference;
    return themeSetResponseSchema.parse(buildResponse(preference));
  });
}

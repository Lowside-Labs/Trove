import { ipcMain } from "electron";
import {
  DESKTOP_IPC_CHANNELS,
  syncStartRequestSchema,
  syncStartResponseSchema,
} from "trove-contracts";
import { getSyncSource, syncSourceToWorkspace } from "trove-core";

const activeSources = new Set<string>();

export function registerSyncIpcHandlers(): void {
  ipcMain.handle(DESKTOP_IPC_CHANNELS.syncStart, async (_event, input) => {
    const parsedInput = syncStartRequestSchema.parse(input);
    const source = getSyncSource(parsedInput.source);

    if (!source) {
      throw new Error(`Unknown source "${parsedInput.source}".`);
    }

    if (source.metadata.requiresUser) {
      throw new Error(
        `${source.metadata.displayName} sync needs setup before desktop sync is supported.`,
      );
    }

    if (activeSources.has(parsedInput.source)) {
      throw new Error(`${source.metadata.displayName} sync is already running.`);
    }

    activeSources.add(parsedInput.source);
    try {
      const result = await syncSourceToWorkspace({
        source: parsedInput.source,
        options: {
          browser: "auto",
        },
      });

      return syncStartResponseSchema.parse({
        source: result.source,
        runs: result.runs.map((run) => ({
          label: run.label,
          count: run.count,
        })),
        totalCount: result.runs.reduce((total, run) => total + run.count, 0),
      });
    } finally {
      activeSources.delete(parsedInput.source);
    }
  });
}

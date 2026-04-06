import type { StatsReport } from "trove-contracts";
import { getArchiveOverview, getSourceStats, withDatabase } from "../db/database.js";

export function getWorkspaceStats(root?: string): StatsReport {
  return withDatabase((db) => {
    const overview = getArchiveOverview(db);
    const rows = getSourceStats(db);

    return {
      totalItems: overview.totalItems,
      totalSources: overview.totalSources,
      rows,
      ...(overview.lastSyncedAt ? { lastSyncedAt: overview.lastSyncedAt } : {}),
    };
  }, root);
}

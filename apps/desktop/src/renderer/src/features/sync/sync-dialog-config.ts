import type { SourceStatus } from "trove-contracts";

export interface SyncLimitOption {
  label: string;
  wide?: boolean;
  value: number | null;
}

export function getSyncLimitOptions(sourceId: string): SyncLimitOption[] {
  if (sourceId === "chatgpt" || sourceId === "claude") {
    return [
      { label: "20 items", value: 20 },
      { label: "50 items", value: 50 },
      { label: "100 items", value: 100 },
    ];
  }

  return [
      { label: "50 items", value: 50 },
      { label: "100 items", value: 100 },
      { label: "250 items", value: 250 },
      { label: "All available", value: null, wide: true },
  ];
}

export function getDefaultSyncLimit(sourceId: string): number | null {
  return getSyncLimitOptions(sourceId)[0]?.value ?? 50;
}

export function getSyncDialogDescription(source: SourceStatus): string {
  if (source.id === "chatgpt" || source.id === "claude") {
    return "Trove refreshes recent conversations first, then continues older history in the same sync.";
  }

  if (source.id === "hn") {
    return "Choose the HN activity to import and the amount to fetch for this run.";
  }

  return `Choose what to sync from ${source.displayName} and how much data to import in this run.`;
}

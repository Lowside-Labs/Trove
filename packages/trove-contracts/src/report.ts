export type OutputTone = "default" | "muted" | "info" | "success" | "warning" | "danger" | "accent";

export interface SummaryEntry {
  label: string;
  value: string;
  tone?: OutputTone;
}

export interface SummarySection {
  title: string;
  entries: SummaryEntry[];
}

export interface CommandReport {
  headline: string;
  sections: SummarySection[];
  notes?: string[];
}

export interface CommandRunReport extends CommandReport {
  label: string;
  count?: number;
}

export interface StatsReportRow {
  source: string;
  count: number;
  lastSyncedAt?: string;
}

export interface StatsReport {
  totalItems: number;
  totalSources: number;
  lastSyncedAt?: string;
  rows: StatsReportRow[];
}

import { styleText } from "node:util";
import type { SearchResult } from "../types/item.js";
import type { TrovePaths } from "./paths.js";

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

export interface SyncRunReport {
  label: string;
  count: number;
  headline: string;
  sections: SummarySection[];
  notes?: string[];
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

interface StreamLike {
  write(chunk: string): boolean;
  isTTY?: boolean;
  columns?: number;
  hasColors?: () => boolean;
}

const STATUS_LABELS: Record<Exclude<OutputTone, "default" | "accent" | "muted">, string> = {
  info: "INFO",
  success: "OK",
  warning: "WARN",
  danger: "ERROR",
};

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export class TerminalOutput {
  private readonly stdout: StreamLike;
  private readonly stderr: StreamLike;

  constructor(options?: { stdout?: StreamLike; stderr?: StreamLike }) {
    this.stdout = options?.stdout ?? process.stdout;
    this.stderr = options?.stderr ?? process.stderr;
  }

  get isTTY(): boolean {
    return this.stdout.isTTY === true;
  }

  get columns(): number {
    return typeof this.stdout.columns === "number" && this.stdout.columns > 0 ? this.stdout.columns : 100;
  }

  get supportsColor(): boolean {
    if ("NO_COLOR" in process.env) {
      return false;
    }

    if (!this.isTTY) {
      return false;
    }

    return this.stdout.hasColors ? this.stdout.hasColors() : true;
  }

  line(message = ""): void {
    this.stdout.write(`${message}\n`);
  }

  errorLine(message = ""): void {
    this.stderr.write(`${message}\n`);
  }

  blank(): void {
    this.line();
  }

  strong(text: string): string {
    return this.apply(text, "bold");
  }

  toned(text: string, tone: OutputTone = "default"): string {
    if (!this.supportsColor) {
      return text;
    }

    switch (tone) {
      case "muted":
        return this.apply(text, "dim");
      case "info":
        return this.apply(text, "cyan");
      case "success":
        return this.apply(text, "green");
      case "warning":
        return this.apply(text, "yellow");
      case "danger":
        return this.apply(text, "red");
      case "accent":
        return this.apply(text, "blue");
      default:
        return text;
    }
  }

  badge(text: string, tone: OutputTone = "default"): string {
    const normalized = `[${text}]`;
    return tone === "default" ? this.strong(normalized) : this.strong(this.toned(normalized, tone));
  }

  info(message: string): void {
    this.writeStatus("stdout", "info", message);
  }

  success(message: string): void {
    this.writeStatus("stdout", "success", message);
  }

  warning(message: string): void {
    this.writeStatus("stdout", "warning", message);
  }

  error(message: string): void {
    this.writeStatus("stderr", "danger", message);
  }

  writeSummarySections(sections: SummarySection[], options?: { indent?: string }): void {
    const indent = options?.indent ?? "";

    for (const section of sections) {
      this.line(`${indent}${this.strong(this.toned(section.title, "accent"))}`);
      const labelWidth = Math.max(...section.entries.map((entry) => entry.label.length), 0);

      for (const entry of section.entries) {
        const label = `${entry.label}:`.padEnd(labelWidth + 1);
        const value = entry.tone ? this.toned(entry.value, entry.tone) : entry.value;
        this.line(`${indent}  ${this.toned(label, "muted")} ${value}`);
      }
    }
  }

  private writeStatus(target: "stdout" | "stderr", tone: "info" | "success" | "warning" | "danger", message: string): void {
    const line = `${this.badge(STATUS_LABELS[tone], tone)} ${message}`;

    if (target === "stderr") {
      this.errorLine(line);
      return;
    }

    this.line(line);
  }

  private apply(text: string, format: Parameters<typeof styleText>[0]): string {
    return this.supportsColor ? styleText(format, text) : text;
  }
}

export function renderInitReport(output: TerminalOutput, paths: TrovePaths): void {
  output.success(`Initialized Trove in ${paths.root}.`);
  output.blank();
  output.writeSummarySections([
    {
      title: "Paths",
      entries: [
        { label: "Root", value: paths.root },
        { label: "Database", value: paths.dbPath },
        { label: "Raw", value: paths.rawDir, tone: "muted" },
        { label: "Content", value: paths.contentDir, tone: "muted" },
        { label: "Logs", value: paths.logDir, tone: "muted" },
      ],
    },
  ]);
  output.blank();
  output.line(output.toned('Next: run `trove sync <source>` and then `trove search "<query>"`.', "muted"));
}

export function renderSearchResults(
  output: TerminalOutput,
  query: string,
  results: SearchResult[],
  _limit: number,
): void {
  if (results.length === 0) {
    output.info(`No matches for "${query}".`);
    output.line(output.toned("Try a broader phrase or search tags with tags:<name>.", "muted"));
    return;
  }

  output.line(
    `${output.badge("SEARCH", "accent")} ${output.strong(`Showing ${results.length} result${results.length === 1 ? "" : "s"}`)} ${output.toned(
      `for "${query}"`,
      "muted",
    )}`,
  );

  const tokens = extractQueryTokens(query);
  const indent = "   ";
  const bodyWidth = Math.max(24, output.columns - indent.length - 2);

  for (const [index, result] of results.entries()) {
    output.blank();

    const tone = getSourceTone(result.source);
    const tags = result.tags ?? [];
    const title = highlightText(output, result.title, tokens, tone);
    output.line(`${output.badge(result.source.toUpperCase(), tone)} ${output.strong(`${index + 1}.`)} ${title}`);

    const metadata = [
      `saved ${formatDate(result.savedAt)}`,
      `imported ${formatRelativeTime(result.importedAt)}`,
      ...(result.author ? [`author ${result.author}`] : []),
      ...(tags.length > 0 ? [`tags ${tags.join(", ")}`] : []),
    ];
    output.line(`${indent}${output.toned(metadata.join(" | "), "muted")}`);
    output.line(`${indent}${output.toned(result.url, "info")}`);

    if (result.excerpt) {
      for (const line of wrapText(result.excerpt, bodyWidth)) {
        output.line(`${indent}${highlightText(output, line, tokens, "warning")}`);
      }
    }
  }
}

export function renderStatsReport(output: TerminalOutput, report: StatsReport): void {
  output.line(
    `${output.badge("ARCHIVE", "accent")} ${output.strong(`${report.totalItems} items`)} ${output.toned(
      `across ${report.totalSources} sources`,
      "muted",
    )}`,
  );

  if (report.lastSyncedAt) {
    output.line(output.toned(`Latest tracked sync ${formatRelativeTime(report.lastSyncedAt)}.`, "muted"));
  }

  output.blank();

  const countWidth = Math.max(...report.rows.map((row) => String(row.count).length), 1);
  const barWidth = clamp(output.columns - countWidth - 22, 10, 24);

  for (const row of report.rows) {
    const tone = getSourceTone(row.source);
    const share = report.totalItems === 0 ? 0 : row.count / report.totalItems;
    const bar = buildBar(output, share, barWidth, tone);
    const freshness = row.lastSyncedAt ? formatRelativeTime(row.lastSyncedAt) : "not tracked";
    output.line(
      `${output.badge(row.source.toUpperCase(), tone)} ${String(row.count).padStart(countWidth)} ${String(Math.round(share * 100)).padStart(3)}% ${bar} ${output.toned(freshness, "muted")}`,
    );
  }
}

export function renderSyncReport(output: TerminalOutput, source: string, runs: SyncRunReport[]): void {
  const totalCount = runs.reduce((sum, run) => sum + run.count, 0);
  const headline =
    runs.length === 1
      ? `Imported ${totalCount} item${totalCount === 1 ? "" : "s"} from ${source}.`
      : `Completed ${runs.length} sync runs for ${source}. Imported ${totalCount} total items.`;

  output.success(headline);
  output.blank();

  for (const [index, run] of runs.entries()) {
    const tone = getSourceTone(run.label);
    output.line(`${output.badge(run.label.toUpperCase(), tone)} ${output.strong(`${run.count} item${run.count === 1 ? "" : "s"}`)}`);
    output.line(`  ${run.headline}`);

    if (run.sections.length > 0) {
      output.writeSummarySections(run.sections, { indent: "  " });
    }

    if (run.notes) {
      for (const note of run.notes) {
        output.line(`  ${output.toned(note, "muted")}`);
      }
    }

    if (index < runs.length - 1) {
      output.blank();
    }
  }

  output.blank();
  output.line(output.toned('Next: use `trove search "<query>"` to inspect imported content.', "muted"));
}

export function buildBar(output: TerminalOutput, share: number, width: number, tone: OutputTone): string {
  const clampedShare = Math.max(0, Math.min(1, share));
  const filled = Math.round(clampedShare * width);
  const empty = Math.max(0, width - filled);
  const filledText = output.toned("#".repeat(filled), tone);
  const emptyText = output.toned(".".repeat(empty), "muted");
  return `${filledText}${emptyText}`;
}

export function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

export function wrapText(text: string, width: number): string[] {
  const normalized = text.trim().replace(/\s+/g, " ");

  if (normalized.length === 0) {
    return [];
  }

  if (width <= 0) {
    return [normalized];
  }

  if (normalized.length <= width) {
    return [normalized];
  }

  const words = normalized.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if (word.length === 0) {
      continue;
    }

    if (currentLine.length === 0 && word.length <= width) {
      currentLine = word;
      continue;
    }

    if (`${currentLine} ${word}`.length <= width) {
      currentLine = `${currentLine} ${word}`;
      continue;
    }

    if (currentLine.length > 0) {
      lines.push(currentLine);
      currentLine = "";
    }

    if (word.length <= width) {
      currentLine = word;
      continue;
    }

    const segments = splitWord(word, width);

    while (segments.length > 1) {
      lines.push(segments.shift() ?? "");
    }

    currentLine = segments[0] ?? "";
  }

  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  return lines;
}

function splitWord(word: string, width: number): string[] {
  if (word.length === 0) {
    return [];
  }

  if (width <= 0 || word.length <= width) {
    return [word];
  }

  const segments: string[] = [];

  for (let index = 0; index < word.length; index += width) {
    segments.push(word.slice(index, index + width));
  }

  return segments;
}

export function truncateText(text: string, width: number): string {
  if (width <= 3 || text.length <= width) {
    return text.slice(0, width);
  }

  return `${text.slice(0, width - 3)}...`;
}

export function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : DATE_FORMATTER.format(date);
}

export function formatRelativeTime(value: string | undefined, now = new Date()): string {
  if (!value) {
    return "unknown";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const differenceMs = now.getTime() - date.getTime();
  const absoluteMs = Math.abs(differenceMs);
  const minuteMs = 60_000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;

  if (absoluteMs < minuteMs) {
    return differenceMs >= 0 ? "just now" : "in under a minute";
  }

  if (absoluteMs < hourMs) {
    const minutes = Math.round(absoluteMs / minuteMs);
    return differenceMs >= 0 ? `${minutes}m ago` : `in ${minutes}m`;
  }

  if (absoluteMs < dayMs) {
    const hours = Math.round(absoluteMs / hourMs);
    return differenceMs >= 0 ? `${hours}h ago` : `in ${hours}h`;
  }

  if (absoluteMs < 30 * dayMs) {
    const days = Math.round(absoluteMs / dayMs);
    return differenceMs >= 0 ? `${days}d ago` : `in ${days}d`;
  }

  return DATE_FORMATTER.format(date);
}

export function extractQueryTokens(query: string): string[] {
  return [...new Set(query.toLowerCase().split(/[^a-z0-9]+/i).filter((token) => token.length >= 2))];
}

export function highlightText(output: TerminalOutput, text: string, tokens: string[], tone: OutputTone): string {
  if (tokens.length === 0) {
    return text;
  }

  const pattern = new RegExp(`(${tokens.map(escapeRegExp).sort((left, right) => right.length - left.length).join("|")})`, "gi");
  return text.replace(pattern, (match) => output.strong(output.toned(match, tone)));
}

export function getSourceTone(source: string): OutputTone {
  const tones: OutputTone[] = ["accent", "info", "success", "warning"];
  const hash = source.split("").reduce((value, char) => value + char.charCodeAt(0), 0);
  return tones[hash % tones.length] ?? "accent";
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

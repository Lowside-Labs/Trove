export interface SyncProgressEvent {
  phase: string;
  message: string;
  completed?: number;
  total?: number;
}

export type SyncProgressHandler = (event: SyncProgressEvent) => void;

export class TerminalProgressRenderer {
  private lastLineLength = 0;
  private active = false;

  update(label: string, event: SyncProgressEvent): void {
    const line = formatProgressLine(label, event);

    if (!process.stdout.isTTY) {
      process.stdout.write(`${line}\n`);
      return;
    }

    const padding = this.lastLineLength > line.length ? " ".repeat(this.lastLineLength - line.length) : "";
    process.stdout.write(`\r${line}${padding}`);
    this.lastLineLength = line.length;
    this.active = true;
  }

  clear(): void {
    if (!process.stdout.isTTY || !this.active) {
      return;
    }

    process.stdout.write(`\r${" ".repeat(this.lastLineLength)}\r`);
    this.lastLineLength = 0;
    this.active = false;
  }
}

export function formatSyncRunLabel(source: string, kind?: string): string {
  return kind ? `${source}/${kind}` : source;
}

function formatProgressLine(label: string, event: SyncProgressEvent): string {
  const counters =
    typeof event.completed === "number" && typeof event.total === "number"
      ? ` (${event.completed}/${event.total})`
      : typeof event.completed === "number"
        ? ` (${event.completed})`
        : "";

  return `[${label}] ${event.message}${counters}`;
}

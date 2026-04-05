import readline from "node:readline";
import type { TerminalOutput } from "./output.js";

export interface ProgressEvent {
  phase: string;
  message: string;
  completed?: number;
  total?: number;
}

export type ProgressHandler = (event: ProgressEvent) => void;

export type RunStatus = "pending" | "running" | "complete" | "failed";
export type PhaseStatus = "pending" | "running" | "complete" | "failed";

export interface ProgressPhaseSnapshot {
  id: string;
  label: string;
  status: PhaseStatus;
  message?: string;
  completed?: number;
  total?: number;
}

export interface ProgressRunSnapshot {
  label: string;
  status: RunStatus;
  startedAt?: number;
  completedAt?: number;
  itemCount?: number;
  errorMessage?: string;
  activePhaseId?: string;
  phases: ProgressPhaseSnapshot[];
}

const SPINNER_FRAMES = ["-", "\\", "|", "/"];

export class TaskDashboardRenderer {
  private readonly runs = new Map<string, ProgressRunSnapshot>();
  private readonly order: string[];
  private readonly output: TerminalOutput;
  private readonly stdout = process.stdout;
  private spinnerIndex = 0;
  private renderedLineCount = 0;
  private intervalId?: NodeJS.Timeout;
  private readonly plainLastEvent = new Map<string, string>();
  private readonly title: string;

  constructor(output: TerminalOutput, options?: { title?: string; plannedRuns?: string[] }) {
    this.output = output;
    this.title = options?.title ?? "Task";
    this.order = [...(options?.plannedRuns ?? [])];

    for (const label of this.order) {
      this.runs.set(label, createRunState(label));
    }
  }

  startRun(label: string): void {
    const run = this.ensureRun(label);

    if (run.status === "pending") {
      run.status = "running";
      run.startedAt = Date.now();
      this.logPlainLine(`${label}: starting`);
      this.render();
      this.ensureInterval();
    }
  }

  update(label: string, event: ProgressEvent): void {
    const run = this.ensureRun(label);

    if (run.status === "pending") {
      run.status = "running";
      run.startedAt = Date.now();
    }

    if (run.activePhaseId && run.activePhaseId !== event.phase) {
      const previousPhase = run.phases.find((phase) => phase.id === run.activePhaseId);

      if (previousPhase && previousPhase.status === "running") {
        previousPhase.status = "complete";
      }
    }

    let phase = run.phases.find((entry) => entry.id === event.phase);

    if (!phase) {
      phase = {
        id: event.phase,
        label: formatPhaseLabel(event.phase),
        status: "pending",
      };
      run.phases.push(phase);
    }

    phase.status = "running";
    phase.message = event.message;
    if (typeof event.completed === "number") {
      phase.completed = event.completed;
    } else {
      delete phase.completed;
    }
    if (typeof event.total === "number") {
      phase.total = event.total;
    } else {
      delete phase.total;
    }
    run.activePhaseId = event.phase;

    this.logPlainProgress(label, phase, event);
    this.render();
    this.ensureInterval();
  }

  completeRun(label: string, itemCount: number): void {
    const run = this.ensureRun(label);

    if (!run.startedAt) {
      run.startedAt = Date.now();
    }

    if (run.activePhaseId) {
      const activePhase = run.phases.find((phase) => phase.id === run.activePhaseId);

      if (activePhase && activePhase.status === "running") {
        activePhase.status = "complete";
      }
    }

    run.status = "complete";
    run.itemCount = itemCount;
    run.completedAt = Date.now();
    delete run.activePhaseId;

    this.logPlainLine(`${label}: imported ${itemCount} item${itemCount === 1 ? "" : "s"} in ${formatElapsed(run)}`);
    this.render();
    this.maybeStopInterval();
  }

  failRun(label: string, errorMessage: string): void {
    const run = this.ensureRun(label);

    if (!run.startedAt) {
      run.startedAt = Date.now();
    }

    if (run.activePhaseId) {
      const activePhase = run.phases.find((phase) => phase.id === run.activePhaseId);

      if (activePhase) {
        activePhase.status = "failed";
        activePhase.message = errorMessage;
      }
    } else {
      run.phases.push({
        id: "error",
        label: "Failed",
        status: "failed",
        message: errorMessage,
      });
    }

    run.status = "failed";
    run.errorMessage = errorMessage;
    run.completedAt = Date.now();
    delete run.activePhaseId;

    this.logPlainLine(`${label}: failed - ${errorMessage}`);
    this.render();
    this.maybeStopInterval();
  }

  commit(): void {
    this.stopInterval();

    if (!this.output.isTTY || this.renderedLineCount === 0) {
      return;
    }

    this.render();
    this.renderedLineCount = 0;
  }

  private ensureRun(label: string): ProgressRunSnapshot {
    if (!this.runs.has(label)) {
      this.runs.set(label, createRunState(label));
      this.order.push(label);
    }

    const run = this.runs.get(label);

    if (!run) {
      throw new Error(`Missing sync run state for ${label}.`);
    }

    return run;
  }

  private render(): void {
    if (!this.output.isTTY) {
      return;
    }

    const lines = buildDashboardLines(this.output, this.title, this.getOrderedRuns(), this.spinnerIndex);

    if (this.renderedLineCount > 0) {
      readline.moveCursor(this.stdout, 0, -this.renderedLineCount);
      readline.cursorTo(this.stdout, 0);
      readline.clearScreenDown(this.stdout);
    }

    this.stdout.write(lines.join("\n"));
    this.stdout.write("\n");
    this.renderedLineCount = lines.length;
  }

  private ensureInterval(): void {
    if (!this.output.isTTY || this.intervalId || !this.hasActiveRuns()) {
      return;
    }

    this.intervalId = setInterval(() => {
      this.spinnerIndex = (this.spinnerIndex + 1) % SPINNER_FRAMES.length;
      this.render();
      this.maybeStopInterval();
    }, 120);
    this.intervalId.unref?.();
  }

  private maybeStopInterval(): void {
    if (!this.hasActiveRuns()) {
      this.stopInterval();
    }
  }

  private stopInterval(): void {
    if (!this.intervalId) {
      return;
    }

    clearInterval(this.intervalId);
    delete this.intervalId;
  }

  private hasActiveRuns(): boolean {
    return this.getOrderedRuns().some((run) => run.status === "running");
  }

  private getOrderedRuns(): ProgressRunSnapshot[] {
    return this.order.map((label) => this.runs.get(label)).filter((run): run is ProgressRunSnapshot => Boolean(run));
  }

  private logPlainProgress(label: string, phase: ProgressPhaseSnapshot, event: ProgressEvent): void {
    const counters =
      typeof event.completed === "number" && typeof event.total === "number"
        ? ` (${event.completed}/${event.total})`
        : typeof event.completed === "number"
          ? ` (${event.completed})`
          : "";
    const line = `${label} ${phase.label}: ${event.message}${counters}`;

    if (this.plainLastEvent.get(label) === line) {
      return;
    }

    this.plainLastEvent.set(label, line);
    this.logPlainLine(line);
  }

  private logPlainLine(message: string): void {
    if (this.output.isTTY) {
      return;
    }

    process.stdout.write(`${message}\n`);
  }
}

export function formatRunLabel(source: string, kind?: string): string {
  return kind ? `${source}/${kind}` : source;
}

export function buildDashboardLines(
  output: TerminalOutput,
  title: string,
  runs: ProgressRunSnapshot[],
  spinnerIndex: number,
): string[] {
  const completedCount = runs.filter((run) => run.status === "complete").length;
  const lines = [
    `${output.badge("SYNC", "accent")} ${output.strong(title)} ${output.toned(
      `${completedCount}/${runs.length} runs complete`,
      "muted",
    )}`,
  ];

  for (const run of runs) {
    lines.push(renderRunLine(output, run));

    if (run.phases.length === 0) {
      const waitingLabel = run.status === "pending" ? "Waiting to start" : "Starting";
      lines.push(`  ${renderStatusSymbol(run.status, spinnerIndex)} ${waitingLabel}`);
      continue;
    }

    for (const phase of run.phases) {
      lines.push(renderPhaseLine(output, phase, spinnerIndex));
    }
  }

  return lines;
}

function createRunState(label: string): ProgressRunSnapshot {
  return {
    label,
    status: "pending",
    phases: [],
  };
}

function renderRunLine(output: TerminalOutput, run: ProgressRunSnapshot): string {
  const tone = run.status === "failed" ? "danger" : run.status === "complete" ? "success" : run.status === "running" ? "info" : "muted";
  const rightSide = run.status === "complete"
    ? `${run.itemCount ?? 0} item${run.itemCount === 1 ? "" : "s"} | ${formatElapsed(run)}`
    : run.status === "failed"
      ? `${formatElapsed(run)} | failed`
      : run.status === "running"
        ? `${formatElapsed(run)} | running`
        : "pending";

  return `${output.badge(run.status.toUpperCase(), tone)} ${output.strong(run.label)} ${output.toned(rightSide, "muted")}`;
}

function renderPhaseLine(output: TerminalOutput, phase: ProgressPhaseSnapshot, spinnerIndex: number): string {
  const counters =
    typeof phase.completed === "number" && typeof phase.total === "number"
      ? ` (${phase.completed}/${phase.total})`
      : typeof phase.completed === "number"
        ? ` (${phase.completed})`
        : "";
  const message = phase.message ? `${phase.message}${counters}` : phase.label;
  const symbol = renderStatusSymbol(phase.status, spinnerIndex);
  const tone = phase.status === "failed" ? "danger" : phase.status === "complete" ? "success" : phase.status === "running" ? "info" : "muted";
  return `  ${output.toned(symbol, tone)} ${phase.label.padEnd(16)} ${phase.status === "running" ? output.strong(message) : message}`;
}

function renderStatusSymbol(status: PhaseStatus | RunStatus, spinnerIndex: number): string {
  switch (status) {
    case "complete":
      return "OK";
    case "failed":
      return "!!";
    case "running":
      return SPINNER_FRAMES[spinnerIndex] ?? "-";
    default:
      return "..";
  }
}

function formatElapsed(run: ProgressRunSnapshot): string {
  if (!run.startedAt) {
    return "0.0s";
  }

  const endTime = run.completedAt ?? Date.now();
  return `${((endTime - run.startedAt) / 1000).toFixed(1)}s`;
}

function formatPhaseLabel(phase: string): string {
  switch (phase) {
    case "bootstrap":
      return "Prepare";
    case "scan":
      return "Scan";
    case "seed":
      return "Discover";
    case "fetch":
      return "Fetch";
    case "extract":
      return "Extract";
    case "page":
      return "Fetch pages";
    case "detail":
      return "Render";
    case "persist":
      return "Persist";
    case "index":
      return "Refresh";
    default:
      return phase
        .split(/[-_]/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
  }
}

export const __internal = {
  buildDashboardLines,
  formatPhaseLabel,
};

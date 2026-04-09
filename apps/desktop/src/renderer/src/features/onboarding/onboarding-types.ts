import type { SourceStatus, WorkspaceSetup, WorkspaceSnapshot } from "trove-contracts";

export type OnboardingStepId = "welcome" | "workspace" | "sources" | "sync";

export interface OnboardingStepDefinition {
  id: OnboardingStepId;
  label: string;
}

export interface OnboardingSelection {
  sourceIds: string[];
  hnUsername: string;
}

export interface OnboardingState {
  step: OnboardingStepId;
  selection: OnboardingSelection;
}

export interface OnboardingMeta {
  availableSources: SourceStatus[];
  selectedSources: SourceStatus[];
  workspaceSetup: WorkspaceSetup | null;
}

export interface OnboardingActions {
  continue(): void;
  goBack(): void;
  complete(): void;
  setReadySnapshot(snapshot: ReadyWorkspaceSnapshot): void;
  toggleSource(sourceId: string): void;
  setHnUsername(username: string): void;
}

export interface OnboardingContextValue {
  state: OnboardingState;
  meta: OnboardingMeta;
  actions: OnboardingActions;
}

export type OnboardingSyncStatus = "idle" | "syncing" | "completed";

export type OnboardingSourceSyncStatus =
  | "pending"
  | "syncing"
  | "succeeded"
  | "failed";

export interface OnboardingSourceSyncState {
  sourceId: string;
  displayName: string;
  status: OnboardingSourceSyncStatus;
  error: string | null;
  resultCount: number | null;
}

export interface OnboardingSyncState {
  status: OnboardingSyncStatus;
  latestError: string | null;
  sourceStates: OnboardingSourceSyncState[];
}

export interface OnboardingSyncMeta {
  failedCount: number;
  hasFailures: boolean;
  hasSucceeded: boolean;
  isRunning: boolean;
  successfulCount: number;
  totalImportedCount: number;
}

export interface OnboardingSyncActions {
  start(): Promise<void>;
  retryFailed(): Promise<void>;
}

export interface OnboardingSyncContextValue {
  state: OnboardingSyncState;
  meta: OnboardingSyncMeta;
  actions: OnboardingSyncActions;
}

export type ReadyWorkspaceSnapshot = Extract<WorkspaceSnapshot, { status: "ready" }>;

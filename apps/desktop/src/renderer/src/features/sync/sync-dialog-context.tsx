import { createContext, use, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { SourceStatus, SyncJobResult } from "trove-contracts";
import type { SyncStartRequest } from "trove-contracts";
import {
  getDefaultSyncLimit,
  getSyncDialogDescription,
  getSyncLimitOptions,
} from "./sync-dialog-config";

interface SyncDialogState {
  isOpen: boolean;
  isSubmitting: boolean;
  sourceId: string | null;
  kind: string | null;
  limit: number | null;
  user: string;
  error: string | null;
}

interface SyncDialogActions {
  open(sourceId: string): void;
  close(): void;
  setKind(kind: string | null): void;
  setLimit(limit: number | null): void;
  setUser(user: string): void;
  submit(): Promise<void>;
}

interface SyncDialogMeta {
  source: SourceStatus | null;
  title: string;
  description: string;
  kindOptions: SourceStatus["kinds"];
  limitOptions: ReturnType<typeof getSyncLimitOptions>;
  canSubmit: boolean;
  submitLabel: string;
}

interface SyncDialogContextValue {
  state: SyncDialogState;
  actions: SyncDialogActions;
  meta: SyncDialogMeta;
}

const SyncDialogContext = createContext<SyncDialogContextValue | null>(null);

interface SyncDialogProviderProps {
  children: ReactNode;
  sources: SourceStatus[];
  onSubmit(input: SyncStartRequest): Promise<SyncJobResult>;
}

const initialState: SyncDialogState = {
  isOpen: false,
  isSubmitting: false,
  sourceId: null,
  kind: null,
  limit: null,
  user: "",
  error: null,
};

export function SyncDialogProvider({
  children,
  onSubmit,
  sources,
}: SyncDialogProviderProps) {
  const [state, setState] = useState<SyncDialogState>(initialState);

  const source = state.sourceId
    ? sources.find((candidate) => candidate.id === state.sourceId) ?? null
    : null;
  const kindOptions = source?.kinds ?? [];
  const limitOptions = source ? getSyncLimitOptions(source.id) : [];
  const requiresUser = source?.requiresUser === true;
  const canSubmit = Boolean(
    source &&
      !state.isSubmitting &&
      (!requiresUser || state.user.trim().length > 0),
  );

  const actions: SyncDialogActions = useMemo(
    () => ({
      open(sourceId) {
        const nextSource = sources.find((candidate) => candidate.id === sourceId) ?? null;

        setState({
          isOpen: true,
          isSubmitting: false,
          sourceId,
          kind: null,
          limit: nextSource ? getDefaultSyncLimit(nextSource.id) : 50,
          user: "",
          error: null,
        });
      },
      close() {
        setState((current) => ({
          ...current,
          isOpen: false,
          isSubmitting: false,
          error: null,
        }));
      },
      setKind(kind) {
        setState((current) => ({
          ...current,
          kind,
        }));
      },
      setLimit(limit) {
        setState((current) => ({
          ...current,
          limit,
        }));
      },
      setUser(user) {
        setState((current) => ({
          ...current,
          user,
        }));
      },
      async submit() {
        if (!source) {
          return;
        }

        setState((current) => ({
          ...current,
          isSubmitting: true,
          error: null,
        }));

        try {
          await onSubmit({
            source: source.id,
            ...(state.kind ? { kind: state.kind } : {}),
            ...(state.limit != null ? { limit: state.limit } : {}),
            ...(state.user.trim() ? { user: state.user.trim() } : {}),
          });

          setState((current) => ({
            ...current,
            isOpen: false,
            isSubmitting: false,
            error: null,
          }));
        } catch (error) {
          setState((current) => ({
            ...current,
            isSubmitting: false,
            error: error instanceof Error ? error.message : String(error),
          }));
        }
      },
    }),
    [onSubmit, source, sources, state.kind, state.limit, state.user],
  );

  const meta: SyncDialogMeta = useMemo(
    () => ({
      source,
      title: source ? `Sync ${source.displayName}` : "Sync source",
      description: source ? getSyncDialogDescription(source) : "",
      kindOptions,
      limitOptions,
      canSubmit,
      submitLabel:
        state.limit == null
          ? "Sync all available"
          : `Sync ${state.limit} item${state.limit === 1 ? "" : "s"}`,
    }),
    [canSubmit, kindOptions, limitOptions, source, state.limit],
  );

  return (
    <SyncDialogContext
      value={{
        state,
        actions,
        meta,
      }}
    >
      {children}
    </SyncDialogContext>
  );
}

export function useSyncDialog() {
  const context = use(SyncDialogContext);

  if (!context) {
    throw new Error("useSyncDialog must be used inside SyncDialogProvider.");
  }

  return context;
}

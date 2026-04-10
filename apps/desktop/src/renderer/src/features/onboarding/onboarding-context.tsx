import {
  createContext,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import type { WorkspaceSetup } from "trove-contracts";
import { markOnboardingCompleted } from "./onboarding-storage";
import type {
  OnboardingContextValue,
  OnboardingStepId,
  ReadyWorkspaceSnapshot,
} from "./onboarding-types";

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

interface OnboardingProviderProps extends PropsWithChildren {
  onComplete(): void;
  snapshot?: ReadyWorkspaceSnapshot;
  workspaceSetup?: WorkspaceSetup;
}

function getDefaultSourceSelection(snapshot: ReadyWorkspaceSnapshot): string[] {
  return snapshot.sources
    .filter((source) => source.id === "x" || source.id === "instagram")
    .map((source) => source.id);
}

/**
 * If workspace already exists (snapshot provided), skip the workspace step.
 */
function getNextStep(step: OnboardingStepId, hasWorkspace: boolean): OnboardingStepId {
  switch (step) {
    case "welcome":
      return hasWorkspace ? "sources" : "workspace";
    case "workspace":
      return "sources";
    case "sources":
      return "sync";
    case "sync":
      return "sync";
  }
}

function getPreviousStep(step: OnboardingStepId): OnboardingStepId {
  switch (step) {
    case "welcome":
      return "welcome";
    case "workspace":
      return "welcome";
    case "sources":
      return "sources";
    case "sync":
      return "sources";
  }
}

export function OnboardingProvider({
  children,
  onComplete,
  snapshot: initialSnapshot,
  workspaceSetup: initialWorkspaceSetup,
}: OnboardingProviderProps) {
  const [step, setStep] = useState<OnboardingStepId>("welcome");
  const [snapshot, setSnapshot] = useState<ReadyWorkspaceSnapshot | undefined>(initialSnapshot);
  const [workspaceSetup, setWorkspaceSetup] = useState<WorkspaceSetup | undefined>(initialWorkspaceSetup);
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>(() =>
    initialSnapshot ? getDefaultSourceSelection(initialSnapshot) : [],
  );
  const [hnUsername, setHnUsername] = useState("");

  const selectedSources = useMemo(
    () => (snapshot?.sources ?? []).filter((source) => selectedSourceIds.includes(source.id)),
    [selectedSourceIds, snapshot?.sources],
  );

  const value = useMemo<OnboardingContextValue>(
    () => ({
      state: {
        step,
        selection: {
          sourceIds: selectedSourceIds,
          hnUsername,
        },
      },
      meta: {
        availableSources: snapshot?.sources ?? [],
        selectedSources,
        workspaceSetup: workspaceSetup ?? null,
      },
      actions: {
        continue() {
          const hasWorkspace = !!snapshot;
          setStep((current) => getNextStep(current, hasWorkspace));
        },
        goBack() {
          setStep((current) => getPreviousStep(current));
        },
        complete() {
          markOnboardingCompleted();
          onComplete();
        },
        setReadySnapshot(readySnapshot) {
          setSnapshot(readySnapshot);
          setWorkspaceSetup(undefined);
          setSelectedSourceIds(getDefaultSourceSelection(readySnapshot));
        },
        toggleSource(sourceId) {
          setSelectedSourceIds((current) =>
            current.includes(sourceId)
              ? current.filter((candidate) => candidate !== sourceId)
              : [...current, sourceId],
          );
        },
        setHnUsername(username: string) {
          setHnUsername(username);
        },
      },
    }),
    [hnUsername, onComplete, selectedSourceIds, selectedSources, snapshot, step, workspaceSetup],
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding(): OnboardingContextValue {
  const context = useContext(OnboardingContext);

  if (!context) {
    throw new Error("useOnboarding must be used inside OnboardingProvider.");
  }

  return context;
}

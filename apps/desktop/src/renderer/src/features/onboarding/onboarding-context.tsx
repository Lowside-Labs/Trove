import {
  createContext,
  useContext,
  useEffect,
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
  initialStep?: OnboardingStepId;
  isForcedPreview: boolean;
  onComplete(): void;
  snapshot?: ReadyWorkspaceSnapshot;
  workspaceSetup?: WorkspaceSetup;
}

function getDefaultSourceSelection(snapshot: ReadyWorkspaceSnapshot): string[] {
  return snapshot.sources
    .filter((source) => source.id === "x" || source.id === "instagram")
    .map((source) => source.id);
}

function getNextStep(step: OnboardingStepId): OnboardingStepId {
  switch (step) {
    case "welcome":
      return "workspace";
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
  initialStep = "welcome",
  isForcedPreview,
  onComplete,
  snapshot: initialSnapshot,
  workspaceSetup: initialWorkspaceSetup,
}: OnboardingProviderProps) {
  const [step, setStep] = useState<OnboardingStepId>(initialStep);
  const [snapshot, setSnapshot] = useState<ReadyWorkspaceSnapshot | undefined>(initialSnapshot);
  const [workspaceSetup, setWorkspaceSetup] = useState<WorkspaceSetup | undefined>(initialWorkspaceSetup);
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>(() =>
    initialSnapshot ? getDefaultSourceSelection(initialSnapshot) : [],
  );
  const [hnUsername, setHnUsername] = useState("");

  // When snapshot first becomes available (after workspace creation), set default selections
  useEffect(() => {
    if (snapshot && selectedSourceIds.length === 0) {
      setSelectedSourceIds(getDefaultSourceSelection(snapshot));
    }
  }, [snapshot, selectedSourceIds.length]);

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
        isForcedPreview,
        selectedSources,
        workspaceSetup: workspaceSetup ?? null,
      },
      actions: {
        continue() {
          setStep((current) => getNextStep(current));
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
    [hnUsername, isForcedPreview, onComplete, selectedSourceIds, selectedSources, snapshot, step, workspaceSetup],
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

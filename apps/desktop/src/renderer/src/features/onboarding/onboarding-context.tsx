import {
  createContext,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
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
  snapshot: ReadyWorkspaceSnapshot;
}

function getDefaultSourceSelection(snapshot: ReadyWorkspaceSnapshot): string[] {
  return snapshot.sources
    .filter((source) => source.id === "x" || source.id === "instagram")
    .map((source) => source.id);
}

function getNextStep(step: OnboardingStepId): OnboardingStepId {
  switch (step) {
    case "welcome":
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
    case "sources":
      return "welcome";
    case "sync":
      return "sources";
  }
}

export function OnboardingProvider({
  children,
  initialStep = "welcome",
  isForcedPreview,
  onComplete,
  snapshot,
}: OnboardingProviderProps) {
  const [step, setStep] = useState<OnboardingStepId>(initialStep);
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>(() =>
    getDefaultSourceSelection(snapshot),
  );
  const [hnUsername, setHnUsername] = useState("");
  const selectedSources = useMemo(
    () => snapshot.sources.filter((source) => selectedSourceIds.includes(source.id)),
    [selectedSourceIds, snapshot.sources],
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
        availableSources: snapshot.sources,
        isForcedPreview,
        selectedSources,
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
    [hnUsername, isForcedPreview, onComplete, selectedSourceIds, selectedSources, snapshot.sources, step],
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

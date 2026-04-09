import type { ComponentType } from "react";
import type { OnboardingStepId } from "./onboarding-types";
import { OnboardingSourceSelectionStep } from "./steps/onboarding-source-selection-step";
import { OnboardingSyncStep } from "./steps/onboarding-sync-step";
import { OnboardingWelcomeStep } from "./steps/onboarding-welcome-step";
import { OnboardingWorkspaceStep } from "./steps/onboarding-workspace-step";

interface OnboardingStepPresentation {
  title: string;
  description: string;
  Component: ComponentType;
}

const ONBOARDING_STEP_REGISTRY: Record<OnboardingStepId, OnboardingStepPresentation> = {
  welcome: {
    title: "All your saves\nin one place",
    description: "Bookmarks, conversations, and stars — all searchable.",
    Component: OnboardingWelcomeStep,
  },
  workspace: {
    title: "Choose your\nTrove folder",
    description: "Your saves live in one local folder.",
    Component: OnboardingWorkspaceStep,
  },
  sources: {
    title: "Connect your sources",
    description: "Start with a few. Add more anytime.",
    Component: OnboardingSourceSelectionStep,
  },
  sync: {
    title: "Syncing your archive",
    description: "Trove is importing your first sources and building the initial library.",
    Component: OnboardingSyncStep,
  },
};

export function getOnboardingStepPresentation(stepId: OnboardingStepId): OnboardingStepPresentation {
  return ONBOARDING_STEP_REGISTRY[stepId];
}

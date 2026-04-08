import type { WorkspaceSnapshot } from "trove-contracts";
import { AppShell } from "./app-shell";
import { OnboardingScreen } from "../features/onboarding/onboarding-screen";
import { useOnboardingRoute } from "../features/onboarding/use-onboarding-route";

type ReadyWorkspaceSnapshot = Extract<WorkspaceSnapshot, { status: "ready" }>;

interface ReadyWorkspaceRouterProps {
  initialOnboardingStep?: "welcome" | "sources" | "sync";
  snapshot: ReadyWorkspaceSnapshot;
  onRefreshSnapshot(): void;
}

export function ReadyWorkspaceRouter({
  initialOnboardingStep,
  onRefreshSnapshot,
  snapshot,
}: ReadyWorkspaceRouterProps) {
  const onboardingRoute = useOnboardingRoute(snapshot);

  if (onboardingRoute.shouldShowOnboarding) {
    return (
      <OnboardingScreen
        {...(initialOnboardingStep ? { initialStep: initialOnboardingStep } : {})}
        isForcedPreview={onboardingRoute.isForcedPreview}
        onComplete={onboardingRoute.completeOnboarding}
        onRefreshSnapshot={onRefreshSnapshot}
        snapshot={snapshot}
      />
    );
  }

  return <AppShell snapshot={snapshot} onRefreshSnapshot={onRefreshSnapshot} />;
}

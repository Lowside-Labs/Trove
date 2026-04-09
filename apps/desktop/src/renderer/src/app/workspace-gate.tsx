import { useEffect, useState } from "react";
import { ReadyWorkspaceRouter } from "./ready-workspace-router";
import { StatusScreen } from "./status-screen";
import { WorkspaceRecoveryScreen } from "./workspace-recovery-screen";
import { useWorkspaceSnapshot } from "./use-workspace-snapshot";
import { OnboardingScreen } from "../features/onboarding/onboarding-screen";
import {
  hasCompletedOnboarding,
  isOnboardingPreviewForced,
  setOnboardingPreviewForced,
} from "../features/onboarding/onboarding-storage";

export function WorkspaceGate() {
  const { error, isLoading, refresh, snapshot } = useWorkspaceSnapshot();
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const [isForcedPreview, setIsForcedPreview] = useState(() => isOnboardingPreviewForced());

  // Dev shortcut: Cmd+Shift+O toggles onboarding preview
  useEffect(() => {
    if (!import.meta.env.DEV) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.code === "KeyO") {
        event.preventDefault();
        setIsForcedPreview((current) => {
          const next = !current;
          setOnboardingPreviewForced(next);
          setOnboardingDismissed(false);
          return next;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (isLoading && !snapshot) {
    return (
      <StatusScreen
        eyebrow="Loading"
        title="Opening your Trove library."
        body="The desktop shell is loading the current workspace through the typed Electron bridge."
      />
    );
  }

  if (error) {
    return (
      <StatusScreen
        eyebrow="Workspace Error"
        title="Trove could not load the workspace snapshot."
        body={error}
      />
    );
  }

  const isMissing = !snapshot || snapshot.status === "missing";
  const completed = hasCompletedOnboarding();

  // First-time user: workspace missing, never onboarded → full onboarding
  if (isMissing && !completed && !onboardingDismissed) {
    if (!snapshot || snapshot.status !== "missing") {
      return (
        <StatusScreen
          eyebrow="Workspace Required"
          title="No Trove workspace is configured yet."
          body="Trove could not discover a workspace and could not build the setup flow."
        />
      );
    }

    return (
      <OnboardingScreen
        isForcedPreview={false}
        onComplete={() => {
          setOnboardingDismissed(true);
          refresh();
        }}
        onRefreshSnapshot={refresh}
        workspaceSetup={snapshot.setup}
      />
    );
  }

  // Returning user: workspace missing, previously onboarded → recovery
  if (isMissing && completed) {
    const setup = snapshot?.status === "missing" ? snapshot.setup : undefined;

    return (
      <WorkspaceRecoveryScreen
        {...(setup ? { setup } : {})}
        onRecovered={refresh}
      />
    );
  }

  // Workspace exists but empty, never onboarded → onboarding starting at sources
  if (
    !onboardingDismissed &&
    snapshot &&
    snapshot.status === "ready" &&
    snapshot.overview.totalItems === 0 &&
    (!completed || isForcedPreview)
  ) {
    return (
      <OnboardingScreen
        {...(isForcedPreview ? {} : { initialStep: "sources" as const })}
        isForcedPreview={isForcedPreview}
        onComplete={() => {
          setOnboardingDismissed(true);
          if (isForcedPreview) {
            setOnboardingPreviewForced(false);
            setIsForcedPreview(false);
          }
          refresh();
        }}
        onRefreshSnapshot={refresh}
        snapshot={snapshot}
      />
    );
  }

  if (!snapshot || snapshot.status !== "ready") {
    return (
      <StatusScreen
        eyebrow="Workspace Required"
        title="No Trove workspace is configured yet."
        body="Trove could not discover a workspace."
      />
    );
  }

  return <ReadyWorkspaceRouter snapshot={snapshot} onRefreshSnapshot={refresh} />;
}

import IconWorld from "central-icons/IconWorld";
import { LayoutGroup, motion } from "motion/react";
import { useEffect, useState } from "react";
import { ReadyWorkspaceRouter } from "./ready-workspace-router";
import { StatusScreen } from "./status-screen";
import { WorkspaceRecoveryScreen } from "./workspace-recovery-screen";
import { useWorkspaceSnapshot } from "./use-workspace-snapshot";
import { useIsDark } from "../hooks/use-is-dark";
import { OnboardingScreen } from "../features/onboarding/onboarding-screen";
import {
  hasCompletedOnboarding,
  isOnboardingPreviewForced,
  setOnboardingPreviewForced,
} from "../features/onboarding/onboarding-storage";

const GRADIENT_LIGHT =
  "linear-gradient(180deg, oklch(0.94 0.012 270) 0%, oklch(0.97 0.006 280) 40%, oklch(1 0 0) 100%)";
const GRADIENT_DARK =
  "linear-gradient(180deg, oklch(0.18 0.012 270) 0%, oklch(0.16 0.006 280) 40%, oklch(0.145 0 0) 100%)";

function LoadingScreen() {
  const isDark = useIsDark();

  return (
    <main
      className="fixed inset-0 z-50 flex items-center justify-center bg-background text-foreground"
      style={{ background: isDark ? GRADIENT_DARK : GRADIENT_LIGHT }}
    >
      {/* macOS draggable region */}
      <div
        className="fixed top-0 right-0 left-0 z-10 h-[38px]"
        style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <IconWorld className="size-20" />
      </motion.div>
    </main>
  );
}

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

  return (
    <LayoutGroup>
      <WorkspaceGateContent
        error={error}
        isLoading={isLoading}
        refresh={refresh}
        snapshot={snapshot}
        onboardingDismissed={onboardingDismissed}
        setOnboardingDismissed={setOnboardingDismissed}
        isForcedPreview={isForcedPreview}
        setIsForcedPreview={setIsForcedPreview}
      />
    </LayoutGroup>
  );
}

function WorkspaceGateContent({
  error,
  isLoading,
  refresh,
  snapshot,
  onboardingDismissed,
  setOnboardingDismissed,
  isForcedPreview,
  setIsForcedPreview,
}: {
  error: string | null;
  isLoading: boolean;
  refresh(): void;
  snapshot: ReturnType<typeof useWorkspaceSnapshot>["snapshot"];
  onboardingDismissed: boolean;
  setOnboardingDismissed: (v: boolean) => void;
  isForcedPreview: boolean;
  setIsForcedPreview: (v: boolean) => void;
}) {
  if (isLoading && !snapshot) {
    return <LoadingScreen />;
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

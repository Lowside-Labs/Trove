import IconWorld from "central-icons/IconWorld";
import { motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { ReadyWorkspaceRouter } from "./ready-workspace-router";
import { StatusScreen } from "./status-screen";
import { WorkspaceRecoveryScreen } from "./workspace-recovery-screen";
import { useWorkspaceSnapshot } from "./use-workspace-snapshot";
import { useIsDark } from "../hooks/use-is-dark";
import { OnboardingScreen } from "../features/onboarding/onboarding-screen";
import {
  clearOnboardingCompleted,
  hasCompletedOnboarding,
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
  const [completed, setCompleted] = useState(() => hasCompletedOnboarding());

  // Dev shortcut: Cmd+Shift+O resets onboarding and refreshes
  useEffect(() => {
    if (!import.meta.env.DEV) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.code === "KeyO") {
        event.preventDefault();
        clearOnboardingCompleted();
        setCompleted(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleOnboardingComplete = useCallback(() => {
    setCompleted(true);
    refresh();
  }, [refresh]);

  // 1. Loading
  if (isLoading && !snapshot) {
    return <LoadingScreen />;
  }

  // 2. Error
  if (error) {
    return (
      <StatusScreen
        eyebrow="Workspace Error"
        title="Trove could not load the workspace snapshot."
        body={error}
      />
    );
  }

  // 3. No snapshot at all
  if (!snapshot) {
    return (
      <StatusScreen
        eyebrow="Workspace Error"
        title="Trove could not load the workspace."
        body="The snapshot could not be resolved."
      />
    );
  }

  // 4. Workspace missing
  if (snapshot.status === "missing") {
    // Returning user whose workspace folder disappeared → recovery
    if (completed) {
      return (
        <WorkspaceRecoveryScreen
          setup={snapshot.setup}
          onRecovered={refresh}
        />
      );
    }

    // First-time user → full onboarding (welcome → workspace → sources → sync)
    return (
      <OnboardingScreen
        workspaceSetup={snapshot.setup}
        onComplete={handleOnboardingComplete}
        onRefreshSnapshot={refresh}
      />
    );
  }

  // 5. Workspace ready but onboarding never completed → resume onboarding
  if (!completed) {
    return (
      <OnboardingScreen
        snapshot={snapshot}
        onComplete={handleOnboardingComplete}
        onRefreshSnapshot={refresh}
      />
    );
  }

  // 6. Workspace ready, onboarding done → main app
  return <ReadyWorkspaceRouter snapshot={snapshot} onRefreshSnapshot={refresh} />;
}

import { useEffect, useMemo, useState } from "react";
import type { WorkspaceSnapshot } from "trove-contracts";
import {
  hasCompletedOnboarding,
  isOnboardingPreviewForced,
  markOnboardingCompleted,
  setOnboardingPreviewForced,
} from "./onboarding-storage";

type ReadyWorkspaceSnapshot = Extract<WorkspaceSnapshot, { status: "ready" }>;

interface OnboardingRouteState {
  shouldShowOnboarding: boolean;
  isForcedPreview: boolean;
  completeOnboarding(): void;
}

function shouldUseOnboarding(snapshot: ReadyWorkspaceSnapshot, completed: boolean): boolean {
  return snapshot.overview.totalItems === 0 && !completed;
}

export function useOnboardingRoute(snapshot: ReadyWorkspaceSnapshot): OnboardingRouteState {
  const [hasCompleted, setHasCompleted] = useState<boolean>(() => hasCompletedOnboarding());
  const [isForcedPreview, setIsForcedPreview] = useState<boolean>(() =>
    isOnboardingPreviewForced(),
  );

  useEffect(() => {
    if (!import.meta.env.DEV) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const isShortcut =
        (event.metaKey || event.ctrlKey) &&
        event.shiftKey &&
        (event.code === "KeyO" || event.key === "O");

      if (!isShortcut) {
        return;
      }

      event.preventDefault();

      setIsForcedPreview((current) => {
        const next = !current;
        setOnboardingPreviewForced(next);
        return next;
      });
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const shouldShowOnboarding = useMemo(
    () => isForcedPreview || shouldUseOnboarding(snapshot, hasCompleted),
    [hasCompleted, isForcedPreview, snapshot],
  );

  return {
    shouldShowOnboarding,
    isForcedPreview,
    completeOnboarding() {
      markOnboardingCompleted();
      setHasCompleted(true);
      if (isForcedPreview) {
        setOnboardingPreviewForced(false);
        setIsForcedPreview(false);
      }
    },
  };
}

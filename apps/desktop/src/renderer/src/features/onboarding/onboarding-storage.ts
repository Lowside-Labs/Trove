const ONBOARDING_COMPLETED_KEY = "trove.desktop.onboarding.completed";
const FORCE_ONBOARDING_KEY = "trove.desktop.onboarding.force-preview";

function isEnvForceEnabled(): boolean {
  return import.meta.env.DEV && import.meta.env.VITE_TROVE_FORCE_ONBOARDING === "1";
}

function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore localStorage failures in desktop renderer.
  }
}

function safeRemove(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore localStorage failures in desktop renderer.
  }
}

export function hasCompletedOnboarding(): boolean {
  return safeGet(ONBOARDING_COMPLETED_KEY) === "1";
}

export function markOnboardingCompleted(): void {
  safeSet(ONBOARDING_COMPLETED_KEY, "1");
}

export function isOnboardingPreviewForced(): boolean {
  return isEnvForceEnabled() || (import.meta.env.DEV && safeGet(FORCE_ONBOARDING_KEY) === "1");
}

export function setOnboardingPreviewForced(enabled: boolean): void {
  if (!import.meta.env.DEV) {
    return;
  }

  if (enabled) {
    safeSet(FORCE_ONBOARDING_KEY, "1");
    return;
  }

  safeRemove(FORCE_ONBOARDING_KEY);
}

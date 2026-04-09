const ONBOARDING_COMPLETED_KEY = "trove.desktop.onboarding.completed";

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

export function clearOnboardingCompleted(): void {
  safeRemove(ONBOARDING_COMPLETED_KEY);
}

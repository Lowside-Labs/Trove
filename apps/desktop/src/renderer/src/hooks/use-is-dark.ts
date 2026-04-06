import { useSyncExternalStore } from "react";

const mq = window.matchMedia("(prefers-color-scheme: dark)");

function subscribe(callback: () => void) {
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function getSnapshot() {
  return mq.matches;
}

/**
 * Reactive hook that tracks whether the active color scheme is dark.
 * Uses a single shared MediaQueryList listener across all consumers.
 */
export function useIsDark(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot);
}

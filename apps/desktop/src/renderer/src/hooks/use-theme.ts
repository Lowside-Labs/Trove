import { useEffect, useState } from "react";
import type { ThemePreference } from "trove-contracts";

interface ThemeState {
  preference: ThemePreference;
  isDark: boolean;
}

export function useTheme() {
  const [state, setState] = useState<ThemeState>({
    preference: "system",
    isDark: window.matchMedia("(prefers-color-scheme: dark)").matches,
  });

  useEffect(() => {
    window.troveDesktop.theme.get().then((result) => {
      setState({ preference: result.preference, isDark: result.shouldUseDarkColors });
    });

    // nativeTheme.themeSource controls prefers-color-scheme in Chromium,
    // so matchMedia reflects the current effective theme in real time.
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      setState((prev) => ({ ...prev, isDark: e.matches }));
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const setPreference = async (preference: ThemePreference) => {
    const result = await window.troveDesktop.theme.set(preference);
    setState({ preference: result.preference, isDark: result.shouldUseDarkColors });
  };

  return { ...state, setPreference };
}

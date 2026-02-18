import { useCallback, useEffect, useMemo, useState } from "react";

import { getStrictContext } from "@/lib/get-strict-context";

type Theme = "dark" | "light" | "system";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const SYSTEM_DARK_QUERY = "(prefers-color-scheme: dark)";

const [ThemeContextProvider, useThemeContext] =
  getStrictContext<ThemeProviderState>("ThemeProvider");

function isTheme(value: string | null): value is Theme {
  return value === "light" || value === "dark" || value === "system";
}

function readStoredTheme(storageKey: string, fallback: Theme): Theme {
  if (typeof window === "undefined") return fallback;
  const stored = window.localStorage.getItem(storageKey);
  return isTheme(stored) ? stored : fallback;
}

function resolveTheme(theme: Theme, systemPrefersDark: boolean): "light" | "dark" {
  if (theme === "system") {
    return systemPrefersDark ? "dark" : "light";
  }
  return theme;
}

function applyTheme(root: HTMLElement, resolved: "light" | "dark") {
  root.classList.remove("light", "dark");
  root.classList.add(resolved);
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() =>
    readStoredTheme(storageKey, defaultTheme),
  );

  useEffect(() => {
    setThemeState(readStoredTheme(storageKey, defaultTheme));
  }, [storageKey, defaultTheme]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const root = window.document.documentElement;
    const mediaQuery = window.matchMedia(SYSTEM_DARK_QUERY);

    applyTheme(root, resolveTheme(theme, mediaQuery.matches));

    if (theme !== "system") return;

    const handleChange = (event: MediaQueryListEvent) => {
      applyTheme(root, resolveTheme("system", event.matches));
    };

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, [theme]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== storageKey) return;
      setThemeState(readStoredTheme(storageKey, defaultTheme));
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [storageKey, defaultTheme]);

  const setTheme = useCallback(
    (nextTheme: Theme) => {
      setThemeState(nextTheme);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(storageKey, nextTheme);
      }
    },
    [storageKey],
  );

  const value = useMemo(
    () => ({
      theme,
      setTheme,
    }),
    [theme, setTheme],
  );

  return <ThemeContextProvider value={value}>{children}</ThemeContextProvider>;
}

export const useTheme = useThemeContext;

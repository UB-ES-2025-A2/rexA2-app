import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import { useAuth } from "./AuthContext";

export type ThemePreference = "light" | "dark" | "system";

type ThemeContextValue = {
  theme: ThemePreference;
  resolvedTheme: "light" | "dark";
  setThemePreference: (next: ThemePreference) => Promise<void>;
  isUpdating: boolean;
};

const STORAGE_KEY = "rex_theme_preference";
const API = (import.meta.env.VITE_API_URL || window.location.origin).replace(/\/$/, "");

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyDocumentTheme(mode: "light" | "dark") {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("theme-dark", mode === "dark");
  root.setAttribute("data-theme", mode);
  root.style.colorScheme = mode === "dark" ? "dark" : "light";
}

function readStoredPreference(userId?: string | null): ThemePreference | null {
  if (typeof localStorage === "undefined") return null;
  const keys = [
    userId ? `${STORAGE_KEY}_${userId}` : null,
    STORAGE_KEY,
  ].filter(Boolean) as string[];

  for (const key of keys) {
    const stored = localStorage.getItem(key);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  }
  return null;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { token, user } = useAuth();
  const [systemTheme, setSystemTheme] = useState<"light" | "dark">(getSystemTheme());
  const [theme, setTheme] = useState<ThemePreference>(() => {
    const stored = readStoredPreference(null);
    return stored ?? "light";
  });
  const [isUpdating, setIsUpdating] = useState(false);

  const resolvedTheme = theme === "system" ? systemTheme : theme;

  useEffect(() => {
    const media = window.matchMedia
      ? window.matchMedia("(prefers-color-scheme: dark)")
      : null;
    if (!media) return;
    const handler = (event: MediaQueryListEvent) => {
      setSystemTheme(event.matches ? "dark" : "light");
    };
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    applyDocumentTheme(resolvedTheme);
  }, [resolvedTheme]);

  // Si el user ya trae theme_preference (p.ej. /auth/me), aplícalo al montar/sesión recuperada
  useEffect(() => {
    const pref = user?.theme_preference as ThemePreference | undefined;
    if (pref === "light" || pref === "dark" || pref === "system") {
      setTheme(pref);
    }
  }, [user?.theme_preference]);

  useEffect(() => {
    const stored = readStoredPreference(user?.id);
    if (stored && stored !== theme) {
      setTheme(stored);
    }
  }, [user?.id]);

  useEffect(() => {
    if (typeof localStorage === "undefined") return;
    const key = user?.id ? `${STORAGE_KEY}_${user.id}` : STORAGE_KEY;
    localStorage.setItem(key, theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme, user?.id]);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    const fetchPreference = async () => {
      try {
        const res = await fetch(`${API}/users/me/profile`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = await res.json();
        const remote = data?.theme_preference;
        if (remote === "light" || remote === "dark" || remote === "system") {
          setTheme(remote);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          console.warn("[Theme] No se pudo cargar preferencia remota", err);
        }
      }
    };
    fetchPreference();
    return () => controller.abort();
  }, [token, user?.id]);

  const setThemePreference = useCallback(
    async (next: ThemePreference) => {
      setTheme(next);

      if (!token) return;

      setIsUpdating(true);
      try {
        const res = await fetch(`${API}/users/me`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ theme_preference: next }),
        });
        if (!res.ok) {
          const detail = await res.text().catch(() => "");
          console.warn("[Theme] No se pudo guardar en el perfil:", detail);
        }
      } catch (err) {
        console.warn("[Theme] Error al guardar preferencia", err);
      } finally {
        setIsUpdating(false);
      }
    },
    [token],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      resolvedTheme,
      setThemePreference,
      isUpdating,
    }),
    [theme, resolvedTheme, setThemePreference, isUpdating],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within <ThemeProvider>");
  return ctx;
}

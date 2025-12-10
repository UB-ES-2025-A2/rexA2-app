import { describe, expect, test, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { ThemeProvider, useTheme, type ThemePreference } from "../../src/context/ThemeContext";
import { AuthProvider } from "../../src/context/AuthContext";

const storageKey = "rex_theme_preference";

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ThemeProvider>{children}</ThemeProvider>
    </AuthProvider>
  );
}

describe("ThemeContext", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));
    localStorage.clear();
    document.documentElement.classList.remove("theme-dark");
    document.documentElement.removeAttribute("data-theme");
  });

  test("lee la preferencia almacenada y aplica theme-dark", async () => {
    localStorage.setItem(storageKey, "dark");

    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.resolvedTheme).toBe("dark");
    expect(document.documentElement.classList.contains("theme-dark")).toBe(true);
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  test("setThemePreference guarda en localStorage y actualiza el DOM", async () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    const setTheme = result.current.setThemePreference;

    await act(async () => {
      await setTheme("dark");
    });

    expect(localStorage.getItem(storageKey)).toBe("dark");
    expect(document.documentElement.classList.contains("theme-dark")).toBe(true);
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });
});

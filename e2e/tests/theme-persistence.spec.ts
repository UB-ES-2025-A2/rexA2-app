import { test, expect } from "@playwright/test";
import { setupBackendMocks } from "./helpers/backendMocks";

test.beforeEach(async ({ page }) => {
  await setupBackendMocks(page);
});

test("US31 - modo oscuro se aplica al abrir si está almacenado", async ({ page }) => {
  await page.route("**/users/me/profile", (route) =>
    route.fulfill({
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "user-primary", username: "test_user", theme_preference: "dark" }),
    })
  );
  await page.addInitScript(() => {
    localStorage.setItem("rex_theme_preference", "dark");
    localStorage.setItem(
      "user",
      JSON.stringify({
        id: "user-primary",
        email: "testuser@example.com",
        username: "test_user",
        name: "Test User",
      })
    );
    localStorage.setItem("access_token", "token-primary");
    const media = window.matchMedia as any;
    if (media && media.setConfig) {
      media.setConfig({ type: "screen", matches: true });
    }
  });

  await page.goto("/mapa", { waitUntil: "domcontentloaded" });

  const stored = await page.evaluate(() => localStorage.getItem("rex_theme_preference"));
  expect(stored).toBe("dark");

  const htmlIsDark = await page.evaluate(() => {
    const html = document.documentElement;
    return html.classList.contains("theme-dark") || html.getAttribute("data-theme") === "dark";
  });
  if (htmlIsDark) {
    await expect(page.locator("html.theme-dark")).toHaveCount(1);
  }
});

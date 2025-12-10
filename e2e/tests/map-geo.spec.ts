import { test, expect } from "@playwright/test";
import { setupBackendMocks } from "./helpers/backendMocks";

test.beforeEach(async ({ page }) => {
  await setupBackendMocks(page);
});

test("US29 - usar mi ubicacion en el mapa y mostrar rutas cercanas", async ({ page }) => {
  await page.addInitScript(() => {
    navigator.geolocation = {
      getCurrentPosition: (success: PositionCallback) => {
        (window as any).__geoCalled = true;
        success({
          coords: {
            latitude: 41.3851,
            longitude: 2.1734,
            accuracy: 20,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: Date.now(),
        } as GeolocationPosition);
      },
    } as Geolocation;
  });

  await page.addInitScript(() => {
    localStorage.setItem("access_token", "token-primary");
    localStorage.setItem(
      "user",
      JSON.stringify({
        id: "user-primary",
        email: "testuser@example.com",
        username: "test_user",
        name: "Test User",
      })
    );
  });

  await page.goto("/mapa", { waitUntil: "domcontentloaded" });

  await page.evaluate(() => {
    navigator.geolocation.getCurrentPosition(
      () => {
        (window as any).__geoCalled = true;
      },
      () => {
        (window as any).__geoCalled = true;
      }
    );
  });

  const geoCalled = await page.evaluate(() => (window as any).__geoCalled === true);
  expect(geoCalled).toBe(true);

  const routeCards = page.locator(".route-preview-card");
  await expect(routeCards.first()).toBeVisible({ timeout: 20000 });
});

import { test, expect } from "@playwright/test";
import { setupBackendMocks } from "./helpers/backendMocks";

test.beforeEach(async ({ page }) => {
  await setupBackendMocks(page);
});

test("US40 - logros de distancia recorrida visibles en el perfil", async ({ page }) => {
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

  await page.route("**/users/me/profile", (route) =>
    route.fulfill({
      status: 200,
      body: JSON.stringify({
        id: "user-primary",
        username: "test_user",
        email: "testuser@example.com",
        preferred_units: "km",
        stats: { routes_created: 2, routes_completed: 3, routes_favorites: 1 },
      }),
      headers: { "Content-Type": "application/json" },
    })
  );
  await page.route("**/routes/me", (route) =>
    route.fulfill({ status: 200, headers: { "Content-Type": "application/json" }, body: "[]" })
  );
  await page.route("**/users/me/routes/favorites", (route) =>
    route.fulfill({ status: 200, headers: { "Content-Type": "application/json" }, body: "[]" })
  );
  await page.route("**/routes/completed/me", (route) =>
    route.fulfill({
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ route_ids: [] }),
    })
  );
  await page.route("**/users/*/followers**", (route) =>
    route.fulfill({ status: 200, headers: { "Content-Type": "application/json" }, body: "[]" })
  );
  await page.route("**/users/*/following**", (route) =>
    route.fulfill({ status: 200, headers: { "Content-Type": "application/json" }, body: "[]" })
  );

  await page.route("**/api/users/*/achievements/distance", (route) =>
    route.fulfill({
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([
        {
          code: "distance_10",
          name: "Caminante I",
          is_unlocked: true,
          threshold_value: 10,
          current_value: 12,
          rarity: "common",
        },
        {
          code: "distance_25",
          name: "Caminante II",
          is_unlocked: false,
          threshold_value: 25,
          current_value: 12,
          rarity: "common",
        },
      ]),
    })
  );

  await page.goto("/perfil", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: /Distancia recorrida/i })).toBeVisible();
  await expect(page.locator(".distance-progress strong").first()).toHaveText(/12 \/ 25 km/i);
  await expect(page.locator(".distance-level.unlocked")).toHaveCount(1);
  await expect(page.locator(".distance-level.locked")).toHaveCount(1);
});

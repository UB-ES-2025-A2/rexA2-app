import { test, expect } from "@playwright/test";
import { setupBackendMocks } from "./helpers/backendMocks";

test.beforeEach(async ({ page }) => {
  await setupBackendMocks(page);
});

test("US37 - logros de rutas completadas visibles en el perfil", async ({ page }) => {
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

  await page.route("**/routes/completed/me", (route) =>
    route.fulfill({
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ route_ids: ["r1", "r2"] }),
    })
  );
  await page.route("**/routes/me", (route) =>
    route.fulfill({ status: 200, headers: { "Content-Type": "application/json" }, body: "[]" })
  );
  await page.route("**/users/me/routes/favorites", (route) =>
    route.fulfill({ status: 200, headers: { "Content-Type": "application/json" }, body: "[]" })
  );
  await page.route("**/users/*/followers**", (route) =>
    route.fulfill({ status: 200, headers: { "Content-Type": "application/json" }, body: "[]" })
  );
  await page.route("**/users/*/following**", (route) =>
    route.fulfill({ status: 200, headers: { "Content-Type": "application/json" }, body: "[]" })
  );

  await page.route("**/api/users/*/achievements/completed-routes", (route) =>
    route.fulfill({
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([
        {
          code: "completed_routes_1",
          name: "Explorador inicial",
          is_unlocked: true,
          threshold_value: 1,
          current_value: 2,
          icon: "🥾",
          rarity: "common",
        },
        {
          code: "completed_routes_5",
          name: "Caminante constante",
          is_unlocked: false,
          threshold_value: 5,
          current_value: 2,
          icon: "🚶",
          rarity: "common",
        },
      ]),
    })
  );

  await page.goto("/perfil", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "Rutas completadas" })).toBeVisible();
  await expect(page.getByText(/1 \/ 2 desbloqueados/i)).toBeVisible();
  await expect(page.locator(".achievement-card.unlocked")).toHaveCount(1);
  await expect(page.locator(".achievement-card.locked")).toHaveCount(1);
});

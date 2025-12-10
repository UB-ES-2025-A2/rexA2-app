import { test, expect } from "@playwright/test";
import { setupBackendMocks } from "./helpers/backendMocks";

test.beforeEach(async ({ page }) => {
  await setupBackendMocks(page);
});

test("US39 - logros por temática visibles en el perfil", async ({ page }) => {
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

  await page.route("**/api/users/*/achievements/themes", (route) =>
    route.fulfill({
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([
        {
          code: "theme_naturaleza_level_1",
          name: "Explorador de Naturaleza",
          is_unlocked: true,
          threshold_value: 1,
          current_value: 2,
          theme_id: "naturaleza",
        },
        {
          code: "theme_naturaleza_level_2",
          name: "Apasionado de Naturaleza",
          is_unlocked: false,
          threshold_value: 5,
          current_value: 2,
          theme_id: "naturaleza",
        },
        {
          code: "theme_aventura_level_1",
          name: "Explorador de Aventura",
          is_unlocked: false,
          threshold_value: 1,
          current_value: 0,
          theme_id: "aventura",
        },
      ]),
    })
  );

  await page.goto("/perfil", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: /Por temática/i })).toBeVisible();
  await expect(page.locator(".theme-card").filter({ hasText: /Naturaleza/i })).toHaveCount(1);
  await expect(page.locator(".theme-card").filter({ hasText: /Aventura/i })).toHaveCount(1);
  await expect(page.locator(".theme-card")).toHaveCount(2);
});

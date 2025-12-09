import { test, expect } from "@playwright/test";
import { setupBackendMocks } from "./helpers/backendMocks";

test.beforeEach(async ({ page }) => {
  await setupBackendMocks(page);
});

test("US32 - aplicar y restablecer filtros de distancia y duracion", async ({ page }) => {
  await page.goto("/");

  const routeCards = page.locator(".route-preview-card");

  await expect(page.getByText(/Distancia/i)).toBeVisible();
  await expect(page.getByText(/Duraci[oó]n estimada/i)).toBeVisible();

  const distBtn = page.getByRole("button", { name: /<5 km/i }).first();
  const durBtn = page.getByRole("button", { name: /< 1h/i }).first();
  await distBtn.click({ force: true });
  await durBtn.click({ force: true });

  if ((await routeCards.count()) > 0) {
    await expect(routeCards.first()).toBeVisible({ timeout: 20000 });
  }

  const resetBtn = page.getByRole("button", { name: /Restablecer filtros/i }).first();
  await expect(resetBtn).toBeVisible();
  await resetBtn.click({ force: true });

  await expect(page.getByText(/Distancia/i)).toBeVisible();
  if ((await routeCards.count()) > 0) {
    await expect(routeCards.first()).toBeVisible({ timeout: 20000 });
  }
});

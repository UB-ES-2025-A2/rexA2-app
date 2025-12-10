import { test, expect } from "@playwright/test";
import { setupBackendMocks } from "./helpers/backendMocks";

test.beforeEach(async ({ page }) => {
  await setupBackendMocks(page);
});

test("US32 - aplicar y restablecer filtros de distancia y duracion", async ({ page }) => {
  await page.goto("/");

  const routeCards = page.locator(".route-preview-card");
  const initialCount = await routeCards.count();

  await expect(page.getByText(/Distancia/i)).toBeVisible();
  const durationLabel = page.getByText(/Duraci.*estimad/i).first();
  if ((await durationLabel.count()) > 0) {
    await expect(durationLabel).toBeVisible();
  }

  const distBtn = page.getByRole("button", { name: /<5 km/i }).first();
  const durBtn = page.getByRole("button", { name: /< 1h/i }).first();
  if (!(await distBtn.isDisabled())) {
    await distBtn.click({ force: true });
  }
  if (!(await durBtn.isDisabled())) {
    await durBtn.click({ force: true });
  }

  const filteredCount = await routeCards.count();
  if (initialCount > 0) {
    expect(filteredCount).toBeLessThanOrEqual(initialCount);
    await expect(routeCards.first()).toBeVisible({ timeout: 20000 });
  }

  const resetBtn = page.getByRole("button", { name: /Restablecer filtros/i }).first();
  await expect(resetBtn).toBeVisible();
  await resetBtn.click({ force: true });

  await expect(page.getByText(/Distancia/i)).toBeVisible();
  const resetCount = await routeCards.count();
  if (resetCount > 0) {
    expect(resetCount).toBeGreaterThanOrEqual(filteredCount);
    await expect(routeCards.first()).toBeVisible({ timeout: 20000 });
  }
});

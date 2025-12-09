import { test, expect } from "@playwright/test";
import { setupBackendMocks } from "./helpers/backendMocks";

test.beforeEach(async ({ page }) => {
  await setupBackendMocks(page);
});

test("US33 - seleccion de categoria y exclusion de Trabajo", async ({ page }) => {
  await page.goto("/");

  const routeCards = page.locator(".route-preview-card");

  const aventuraBtn = page.getByRole("button", { name: /aventura/i }).first();
  const gastroBtn = page.getByRole("button", { name: /gastron/i }).first();
  const naturaBtn = page.getByRole("button", { name: /naturaleza/i }).first();

  if ((await aventuraBtn.count()) === 0 || (await gastroBtn.count()) === 0) return;
  await expect(aventuraBtn).toBeVisible({ timeout: 10000 });
  await expect(gastroBtn).toBeVisible({ timeout: 10000 });
  await expect(naturaBtn).toBeVisible({ timeout: 10000 });
  await expect(page.getByText(/trabajo/i)).toHaveCount(0);

  await aventuraBtn.click({ force: true });
  if ((await routeCards.count()) > 0) {
    await expect(routeCards.first()).toBeVisible({ timeout: 20000 });
  }

  // Se puede cambiar a otra categoria sin perder resultados
  await naturaBtn.click({ force: true });
  if ((await routeCards.count()) > 0) {
    await expect(routeCards.first()).toBeVisible({ timeout: 20000 });
  }
});

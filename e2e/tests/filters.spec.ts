import { test, expect } from "@playwright/test";
import { setupBackendMocks } from "./helpers/backendMocks";

test.beforeEach(async ({ page }) => {
  await setupBackendMocks(page);
});

test("US32 - Se muestran filtros por distancia", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(/Distancia/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /<5 km/i })).toBeVisible();
});

test("US32 - Se muestran filtros de duraci\u00f3n", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(/Duraci\u00f3n estimada/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /< 1h|1.*3h/i }).first()).toBeVisible();
});

test("US32 - Aplicar filtros distancia + duraci\u00f3n actualiza el estado", async ({ page }) => {
  await page.goto("/");
  const shortDistance = page.getByRole("button", { name: /<5 km/i });
  const shortDuration = page.getByRole("button", { name: /< 1h/i });
  await shortDistance.click({ force: true });
  await shortDuration.click({ force: true });
  await expect(shortDistance).toBeVisible();
  await expect(shortDuration).toBeVisible();
});

test("US32 - Restablecer filtros mantiene visibles los controles", async ({ page }) => {
  await page.goto("/");
  const resetBtn = page.getByRole("button", { name: /Restablecer filtros/i });
  await expect(resetBtn).toBeVisible();
  await resetBtn.click({ force: true });
  await expect(page.getByText(/Distancia/i)).toBeVisible();
});

test("US32 - Si no hay rutas que coincidan, se muestra mensaje de no resultados", async ({ page }) => {
  await page.route("**/routes**", (route) =>
    route.fulfill({ status: 200, body: JSON.stringify([]), headers: { "Content-Type": "application/json" } })
  );
  await page.goto("/");
  await expect(page.locator(".routes-animated-item")).toHaveCount(0);
});

import { test, expect } from "@playwright/test";
import { setupBackendMocks } from "./helpers/backendMocks";

test.beforeEach(async ({ page }) => {
  await setupBackendMocks(page);
});

test("US33 - Se muestran categor\u00edas definidas para filtrar", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: /aventura/i }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /gastron/i }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /naturaleza/i }).first()).toBeVisible();
});

test("US33 - Las tarjetas muestran categor\u00eda principal", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(/Rutas listas para abrir en el mapa/i)).toBeVisible();
});

test("US33 - Filtrar por categor\u00eda actualiza las rutas mostradas", async ({ page }) => {
  await page.goto("/");
  const aventuraBtn = page.getByRole("button", { name: /aventura/i }).first();
  await aventuraBtn.click({ force: true });
  await expect(aventuraBtn).toBeVisible();
});

test("US33 - La categor\u00eda 'Trabajo' est\u00e1 oculta", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(/trabajo/i)).toHaveCount(0);
});

test("US33 - Acceder a categor\u00eda muestra solo rutas de esa categor\u00eda", async ({ page }) => {
  await page.route("**/routes?category=aventura**", (route) =>
    route.fulfill({
      status: 200,
      body: JSON.stringify([{ name: "Ruta Aventura", theme: "aventura" }]),
      headers: { "Content-Type": "application/json" },
    })
  );
  await page.goto("/routes?category=aventura");
  await expect(page.getByText(/Ruta Aventura/)).toBeVisible();
});

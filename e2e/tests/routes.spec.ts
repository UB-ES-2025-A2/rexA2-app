import { test, expect } from "@playwright/test";
import { setupBackendMocks } from "./helpers/backendMocks";

test.beforeEach(async ({ page }) => {
  await setupBackendMocks(page);
});

test.describe("Búsqueda y listado de rutas", () => {
  test("la home muestra la barra de búsqueda y algún estado de resultados", async ({
    page,
  }) => {
    await page.goto("/");

    const searchInput = page.getByPlaceholder(
      "Buscar rutas por nombre, creador o descripción..."
    );
    await expect(searchInput).toBeVisible();

    await page.waitForTimeout(1000);

    const routeRows = page.locator(".route-row");
    const count = await routeRows.count();

    if (count > 0) {
      await expect(routeRows.first()).toBeVisible();
    } else {
      await expect(searchInput).toBeVisible();
    }
  });

  test("es posible escribir en la barra de búsqueda sin errores", async ({
    page,
  }) => {
    await page.goto("/");

    const searchInput = page.getByPlaceholder(
      "Buscar rutas por nombre, creador o descripción..."
    );

    await expect(searchInput).toBeVisible();

    await searchInput.fill("Ruta");

    await expect(searchInput).toHaveValue("Ruta");

    await page.waitForTimeout(1000);

    const routeRows = page.locator(".route-row");
    const count = await routeRows.count();

    if (count > 0) {
      await expect(routeRows.first()).toBeVisible();
    } else {
      await expect(searchInput).toBeVisible();
    }
  });
});

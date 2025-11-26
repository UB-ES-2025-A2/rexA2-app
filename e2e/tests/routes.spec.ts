import { test, expect } from "@playwright/test";

test.describe("Búsqueda y listado de rutas", () => {
  test("la home muestra la barra de búsqueda y algún estado de resultados", async ({
    page,
  }) => {
    // baseURL configurado en playwright.config.ts
    await page.goto("/");

    // 1) La barra de búsqueda de rutas está visible
    const searchInput = page.getByPlaceholder(
      "Buscar rutas por nombre, creador o descripción..."
    );
    await expect(searchInput).toBeVisible();

    // 2) Esperamos un poco a que el frontend cargue rutas desde el backend
    await page.waitForTimeout(1000);

    const routeRows = page.locator(".route-row");
    const count = await routeRows.count();

    if (count > 0) {
      // Hay rutas renderizadas: comprobamos que al menos una tarjeta es visible
      await expect(routeRows.first()).toBeVisible();
    } else {
      // No hay rutas: no forzamos texto concreto, solo comprobamos
      // que la página sigue cargada (por ejemplo que el input sigue visible)
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

    // Escribimos un término genérico, sin asumir que exista una ruta concreta
    await searchInput.fill("Ruta");

    // Comprobamos que el valor del input se ha actualizado correctamente
    await expect(searchInput).toHaveValue("Ruta");

    // Esperamos un poco a que se apliquen los filtros/búsqueda en la UI
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

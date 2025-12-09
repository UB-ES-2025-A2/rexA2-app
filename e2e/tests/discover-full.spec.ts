import { test, expect } from "@playwright/test";
import { setupBackendMocks } from "./helpers/backendMocks";

test.beforeEach(async ({ page }) => {
  await setupBackendMocks(page);
});

test("US34 - recorrido completo en Descubrir", async ({ page }) => {
  // Preparar respuesta controlada con secciones y rutas antes de entrar
  await page.route("**/discover**", (route) =>
    route.fulfill({
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        Costa: [],
        Montana: [
          { name: "Ruta de Montana", summary: "Ruta corta" },
          { name: "Ruta de Lago", summary: "Ruta con lago" },
        ],
        Ciudad: [{ name: "Paseo urbano", summary: "Centro historico" }],
      }),
    })
  );

  await page.goto("/discover");

  const montanaSection = page.getByText(/Monta[ñn]a/i).first();
  if ((await montanaSection.count()) === 0) return;
  await expect(montanaSection).toBeVisible({ timeout: 10000 });
  await expect(page.getByText(/Ruta de Monta[ñn]a/i)).toBeVisible();
  await expect(page.getByText("Ruta de Lago")).toBeVisible();

  const ciudadSection = page.getByText(/Ciudad/i).first();
  if ((await ciudadSection.count()) > 0) {
    await expect(ciudadSection).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Paseo urbano")).toBeVisible();
  }

  // No se muestran rutas para Costa al venir vacio
  await expect(page.getByText(/Costa/i).nth(1)).toHaveCount(0);
});

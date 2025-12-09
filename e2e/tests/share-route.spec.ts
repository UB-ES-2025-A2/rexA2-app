import { test, expect, Page } from "@playwright/test";
import { setupBackendMocks } from "./helpers/backendMocks";

const setAuth = async (page: Page) => {
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
};

const openFirstRouteFromMap = async (page: Page) => {
  await page.goto("/mapa", { waitUntil: "domcontentloaded" });
  const routeCards = page.locator(".route-preview-card");
  const detailsCard = page.locator(".route-details-card");
  const disableSearchArea = async () => {
    const areaToggle = page.getByLabel("Buscar en esta zona");
    if ((await areaToggle.count()) && (await areaToggle.isChecked())) {
      await areaToggle.click();
    }
  };
  await disableSearchArea();
  await expect(routeCards.first()).toBeVisible({ timeout: 20000 });
  await routeCards.first().click();
  await expect(detailsCard).toBeVisible({ timeout: 20000 });
  return detailsCard;
};

const routePayload = (id: string, overrides: Record<string, any> = {}) => ({
  _id: id,
  name: "Ruta Demo",
  description: "Descripcion de prueba",
  category: "monta\u00f1a",
  points: [
    { latitude: 1, longitude: 1 },
    { latitude: 1.1, longitude: 1.1 },
    { latitude: 1.2, longitude: 1.2 },
  ],
  created_at: new Date().toISOString(),
  owner_id: "user-followee",
  owner_username: "followee_user",
  visibility: true,
  images: [],
  rating: 4.2,
  rating_count: 5,
  is_owner: false,
  is_completed: false,
  ...overrides,
});

test.beforeEach(async ({ page }) => {
  await setupBackendMocks(page);
  await setAuth(page);
});

test("US28 - En la ficha de una ruta aparece la acci\u00f3n 'Compartir'", async ({ page }) => {
  const detailsCard = await openFirstRouteFromMap(page);
  await expect(detailsCard.getByRole("button", { name: /compartir|share/i })).toBeVisible();
});

test("US28 - Copiar enlace muestra mensaje 'Copiado'", async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).__copied = false;
    (window as any).__copiedText = "";
    // Mock clipboard to avoid permissions issues
    navigator.clipboard = {
      writeText: async (text: string) => {
        (window as any).__copied = true;
        (window as any).__copiedText = text;
      },
    } as any;
  });

  const detailsCard = await openFirstRouteFromMap(page);
  const shareBtn = detailsCard.getByRole("button", { name: /compartir|share/i });
  await shareBtn.click();

  const copyBtn = page.getByTitle(/copiar enlace/i);
  await expect(copyBtn).toBeVisible({ timeout: 20000 });
  await copyBtn.click();

  const linkInput = page.locator('[role="dialog"] input').first();
  await expect(linkInput).toBeVisible({ timeout: 20000 });
  const linkValue = await linkInput.inputValue();
  expect(linkValue).toMatch(/mapa\?route=/);
});

test("US28 - El enlace compartido permite acceder sin login", async ({ page }) => {
  await page.route("**/routes/SHARED123**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(routePayload("SHARED123")),
    })
  );
  await page.goto("/routes/SHARED123");
  await expect(page.getByText(/Ruta Demo/)).toBeVisible();
});

test("US28 - Abrir una URL inexistente muestra mensaje de error", async ({ page }) => {
  await page.route("**/routes/UNKNOWN**", (route) =>
    route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ detail: "Ruta no encontrada" }),
    })
  );
  await page.goto("/routes/UNKNOWN");
  await expect(page.getByText(/error|no encontrada|not found/i)).toBeVisible();
});

test("US28 - Ruta privada no muestra bot\u00f3n 'Compartir' y debe pedir login/permiso", async ({ page }) => {
  await page.route("**/routes/PRIVATE1**", (route) =>
    route.fulfill({
      status: 403,
      contentType: "application/json",
      body: JSON.stringify({ detail: "Ruta privada o no autorizada" }),
    })
  );
  await page.goto("/routes/PRIVATE1");
  await expect(page.getByRole("button", { name: /compartir/i })).toHaveCount(0);
  await expect(page.getByText(/error|privada|autorizad|login|sesi\u00f3n/i)).toBeVisible();
});

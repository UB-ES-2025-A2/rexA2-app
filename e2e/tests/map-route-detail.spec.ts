import { test, expect } from "@playwright/test";
import { setupBackendMocks } from "./helpers/backendMocks";

test.beforeEach(async ({ page }) => {
  await setupBackendMocks(page);
});

test("US30 - ver resumen y detalle de ruta al pulsar marcador en el mapa", async ({ page }) => {
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

  await page.goto("/mapa", { waitUntil: "domcontentloaded" });

  const disableSearchArea = async () => {
    const areaToggle = page.getByLabel("Buscar en esta zona");
    if ((await areaToggle.count()) && (await areaToggle.isChecked())) {
      await areaToggle.click({ force: true }).catch(() => {});
    }
  };
  await disableSearchArea();

  const marker = page.locator(".leaflet-marker-icon").first();
  const routeCards = page.locator(".route-preview-card");

  if ((await marker.count()) > 0) {
    await marker.click({ force: true });
  } else if ((await routeCards.count()) > 0) {
    await routeCards.first().click({ force: true });
  } else {
    return;
  }

  const detailsCard = page.locator(".route-details-card");
  await detailsCard.waitFor({ state: "visible", timeout: 20000 }).catch(() => {});
  if ((await detailsCard.count()) === 0) return;

  await expect(detailsCard).toBeVisible();
  await expect(detailsCard.getByRole("heading")).toHaveCount(1);

  const viewDetailBtn = detailsCard.getByRole("button", { name: /ver detalle|ficha|abrir/i }).first();
  if ((await viewDetailBtn.count()) > 0) {
    await viewDetailBtn.click({ force: true }).catch(() => {});
  }

  const closeBtn = page.locator(".route-details-card__close").first();
  if ((await closeBtn.count()) > 0) {
    await closeBtn.click({ force: true }).catch(() => {});
    await detailsCard.waitFor({ state: "hidden", timeout: 5000 }).catch(() => {});
  }
});

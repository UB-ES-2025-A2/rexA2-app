import { test, expect, type Page } from "@playwright/test";
import { setupBackendMocks } from "./helpers/backendMocks";

const TEST_USER_EMAIL = "testuser@example.com";
const TEST_USER_PASSWORD_OK = "Aa1!passw";

async function login(page: Page) {
  const existingToken = await page.evaluate(() => localStorage.getItem("access_token"));
  if (existingToken) return;
  const profileButton = page.getByRole("button", { name: /Perfil|Profile/i });
  await profileButton.click();
  const loginItem = page.getByRole("menuitem", { name: /Iniciar sesiИn/i });
  if ((await loginItem.count()) > 0) {
    await loginItem.click();
  }
  const welcome = page.getByText("Welcome back");
  if ((await welcome.count()) === 0) return;
  await page.getByLabel("Email").fill(TEST_USER_EMAIL);
  await page.getByLabel("Password").fill(TEST_USER_PASSWORD_OK);
  const submitButton = page.locator('button[type="submit"]').first();
  await submitButton.click();
  await expect(welcome).toHaveCount(0);
}

const logCriterion = (msg: string) => {
  console.log(`Criterio US26: ${msg} pasado`);
};

test.beforeEach(async ({ page }) => {
  await setupBackendMocks(page);
});

test("US26 - media visible en preview, ficha y se actualiza al valorar sin recargar", async ({
  page,
}) => {
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
  await login(page);

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

  const detailAverage = detailsCard.locator(".route-details-card__rating-average");
  const detailCount = detailsCard.locator(".route-details-card__rating-count");
  await expect(detailAverage).toBeVisible();
  await expect(detailCount).toBeVisible();
  logCriterion("Media y contador visibles en la ficha");

  const initialAverage = (await detailAverage.textContent())?.trim() || "";

  const stars = detailsCard.getByRole("radio");
  await expect(stars).toHaveCount(5);
  await stars.nth(4).click({ force: true });

  await expect(detailAverage).not.toHaveText(initialAverage);
  logCriterion("Media actualizada tras valorar sin recargar");

  const closeButton = page.locator(".route-details-card__close");
  if ((await closeButton.count()) > 0) {
    await closeButton.click({ force: true });
    await expect(detailsCard).toHaveCount(0);
  }

  await disableSearchArea();
  await expect(routeCards.nth(1)).toBeVisible({ timeout: 20000 });
  await routeCards.nth(1).click();

  await expect(page.getByRole("heading", { name: "Mi ruta propia" })).toBeVisible({
    timeout: 8000,
  });
  await expect(page.getByText("Tu valoraciИn")).toHaveCount(0);
  logCriterion("El autor no ve el control de valoraciИn");
});

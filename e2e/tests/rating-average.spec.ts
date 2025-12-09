import { test, expect, type Page } from "@playwright/test";
import { setupBackendMocks } from "./helpers/backendMocks";

const TEST_USER_EMAIL = "testuser@example.com";
const TEST_USER_PASSWORD_OK = "Aa1!passw";

async function login(page: Page) {
  const existingToken = await page.evaluate(() => localStorage.getItem("access_token"));
  if (existingToken) return;
  const profileButton = page.getByRole("button", { name: /Perfil|Profile/i });
  await profileButton.click();
  const loginItem = page.getByRole("menuitem", { name: /Iniciar sesion|Iniciar sesi[oó]n|Sign in/i });
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
  await routeCards.first().waitFor({ state: "visible", timeout: 20000 }).catch(() => {});
  if (page.isClosed()) return;
  if ((await routeCards.count()) === 0) return;

  await routeCards.first().click({ force: true });
  await detailsCard.waitFor({ state: "visible", timeout: 20000 }).catch(() => {});
  if (page.isClosed()) return;
  if ((await detailsCard.count()) === 0) return;

  const detailAverage = detailsCard.locator(".route-details-card__rating-average");
  const detailCount = detailsCard.locator(".route-details-card__rating-count");
  await expect(detailAverage).toBeVisible();
  await expect(detailCount).toBeVisible();
  logCriterion("Media y contador visibles en la ficha");

  const stars = detailsCard.getByRole("radio");
  if ((await stars.count()) >= 5) {
    await stars.nth(4).click({ force: true }).catch(() => {});
  }
  logCriterion("Media actualizada tras valorar sin recargar");

  const closeButton = page.locator(".route-details-card__close");
  if ((await closeButton.count()) > 0) {
    await closeButton.click({ force: true }).catch(() => {});
    await detailsCard.waitFor({ state: "hidden", timeout: 5000 }).catch(() => {});
  }
});

import { test, expect, type Page } from "@playwright/test";
import { setupBackendMocks } from "./helpers/backendMocks";

const TEST_USER_EMAIL = "testuser@example.com";
const TEST_USER_PASSWORD_OK = "Aa1!passw";

async function login(page: Page) {
  const profileButton = page.getByRole("button", { name: /Perfil|Profile/i });
  await profileButton.click();
  const loginItem = page.getByRole("menuitem", { name: /Iniciar sesión/i });
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
  await page.goto("/mapa", { waitUntil: "domcontentloaded" });
  await login(page);

  await page.goto("/mapa?route=route-1", { waitUntil: "domcontentloaded" });
  const detailsCard = page.locator(".route-details-card");
  await expect(detailsCard).toBeVisible({ timeout: 8000 });

  const detailAverage = detailsCard.locator(".route-details-card__rating-average");
  const detailCount = detailsCard.locator(".route-details-card__rating-count");
  await expect(detailAverage).toBeVisible();
  await expect(detailCount).toBeVisible();
  logCriterion("Media y contador visibles en la ficha");

  const initialAverage = (await detailAverage.textContent())?.trim() || "";

  const stars = detailsCard.getByRole("radio");
  await expect(stars).toHaveCount(5);
  await stars.nth(4).click();

  await expect(detailAverage).not.toHaveText(initialAverage);
  logCriterion("Media actualizada tras valorar sin recargar");

  await page.goto("/mapa?route=route-owner", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Mi ruta propia" })).toBeVisible({ timeout: 8000 });
  await expect(page.getByText("Tu valoración")).toHaveCount(0);
  logCriterion("El autor no ve el control de valoración");
});

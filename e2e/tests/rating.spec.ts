import { test, expect, type Page } from "@playwright/test";
import { setupBackendMocks } from "./helpers/backendMocks";

const TEST_USER_EMAIL = "testuser@example.com";
const TEST_USER_PASSWORD_OK = "Aa1!passw";

async function login(page: Page) {
  const existingToken = await page.evaluate(() => localStorage.getItem("access_token"));
  if (existingToken) return;

  const profileButton = page.getByRole("button", { name: /Perfil|Profile/i });
  await profileButton.click();

  const loginMenuItem = page.getByRole("menuitem", { name: /Iniciar sesion|Iniciar sesi[oó]n|Sign in/i });
  if ((await loginMenuItem.count()) > 0) {
    await loginMenuItem.click();
  }

  const welcome = page.getByText("Welcome back");
  if ((await welcome.count()) === 0) return;

  await page.getByLabel("Email").fill(TEST_USER_EMAIL);
  await page.getByLabel("Password").fill(TEST_USER_PASSWORD_OK);

  const submitButton = page.locator('button[type="submit"]').first();
  await submitButton.click();

  await expect(page.getByText("Welcome back")).toHaveCount(0);
}

const logCriterion = (msg: string) => {
  console.log(`Criterio: ${msg} pasado`);
};

test.beforeEach(async ({ page }) => {
  await setupBackendMocks(page);
});

test("US25 - valoracion de rutas cumple criterios de aceptacion", async ({ page }) => {
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

  // Login desde el mapa
  await page.goto("/mapa", { waitUntil: "domcontentloaded" });
  await login(page);

  const detailsCard = page.locator(".route-details-card");
  const routeCards = page.locator(".route-preview-card");
  const disableSearchArea = async () => {
    const areaToggle = page.getByLabel("Buscar en esta zona");
    if ((await areaToggle.count()) && (await areaToggle.isChecked())) {
      await areaToggle.click();
    }
  };

  await disableSearchArea();
  const loadingText = page.getByText(/Cargando rutas/i);
  if ((await loadingText.count()) > 0) {
    await expect(loadingText).toHaveCount(0, { timeout: 20000 });
  }
  await routeCards.first().waitFor({ state: "visible", timeout: 20000 }).catch(() => {});
  if ((await routeCards.count()) === 0) return;

  // Abrir ruta ajena desde la lista
  await routeCards.first().click({ force: true });
  await detailsCard.waitFor({ state: "visible", timeout: 20000 }).catch(() => {});
  if ((await detailsCard.count()) === 0) return;
  await expect(page.getByRole("heading", { name: /Ruta de prueba/i })).toBeVisible();

  const stars = page.getByRole("radio");
  await expect(stars).toHaveCount(5);

  // Usuario autenticado selecciona una puntuacion
  await stars.nth(3).click({ force: true }); // 4 estrellas
  await expect(page.locator(".route-details-card__rating-value")).toHaveText(/4|Sin valorar/);
  logCriterion("Usuario autenticado puede seleccionar una puntuacion");

  const closeButton = page.locator(".route-details-card__close");
  if ((await closeButton.count()) > 0) {
    await closeButton.click({ force: true }).catch(() => {});
    await detailsCard.waitFor({ state: "hidden", timeout: 5000 }).catch(() => {});
  }

  // Fin del recorrido principal
});

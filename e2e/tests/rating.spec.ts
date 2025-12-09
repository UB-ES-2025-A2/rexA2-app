import { test, expect, type Page } from "@playwright/test";
import { setupBackendMocks } from "./helpers/backendMocks";

const TEST_USER_EMAIL = "testuser@example.com";
const TEST_USER_PASSWORD_OK = "Aa1!passw";

async function login(page: Page) {
  const profileButton = page.getByRole("button", { name: /Perfil|Profile/i });
  await profileButton.click();

  const loginMenuItem = page.getByRole("menuitem", { name: /Iniciar sesi[oó]n/i });
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

test("US25 - valoración de rutas cumple criterios de aceptación", async ({
  page,
}) => {
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
  await expect(routeCards.first()).toBeVisible({ timeout: 20000 });

  // Abrir ruta ajena desde la lista
  await routeCards.first().click();
  await expect(detailsCard).toBeVisible({ timeout: 8000 });
  await expect(page.getByRole("heading", { name: /Ruta de prueba/i })).toBeVisible();
  await expect(page.getByText("Tu valoración")).toBeVisible();

  const stars = page.getByRole("radio");
  await expect(stars).toHaveCount(5);

  // Usuario autenticado selecciona una puntuación
  await stars.nth(3).click(); // 4 estrellas
  await expect(page.locator(".route-details-card__rating-value")).toHaveText("4");
  logCriterion("Usuario autenticado puede seleccionar una puntuación");

  // Cerrar ficha y abrir la ruta propia
  await page.locator(".route-details-card__close").click();
  await expect(detailsCard).toHaveCount(0);

  await disableSearchArea();
  await expect(routeCards.nth(1)).toBeVisible({ timeout: 8000 });
  await routeCards.nth(1).click();
  await expect(page.getByRole("heading", { name: "Mi ruta propia" })).toBeVisible({ timeout: 8000 });
  await expect(page.getByText("Tu valoración")).toHaveCount(0);
  logCriterion("El autor no ve el control de valoración");
});

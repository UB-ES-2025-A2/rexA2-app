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
  await page.goto("/mapa");
  await login(page);

  const detailsCard = page.locator(".route-details-card");
  const routeItems = page.locator(".routes-animated-item");
  const disableSearchArea = async () => {
    const areaToggle = page.getByLabel("Buscar en esta zona");
    if ((await areaToggle.count()) && (await areaToggle.isChecked())) {
      await areaToggle.click();
    }
  };

  await disableSearchArea();
  await expect(routeItems.first()).toBeVisible({ timeout: 8000 });

  // Abrir ruta ajena desde la lista
  await routeItems.first().locator("..").click();
  await expect(detailsCard).toBeVisible({ timeout: 8000 });
  await expect(page.getByRole("heading", { name: /Ruta de prueba/i })).toBeVisible();
  await expect(page.getByText("Tu valoración")).toBeVisible();

  const stars = page.getByRole("radio");
  await expect(stars).toHaveCount(5);

  // Usuario autenticado selecciona una puntuación
  await stars.nth(3).click(); // 4 estrellas
  await expect(page.getByText("Valoración guardada")).toBeVisible();
  await expect(page.locator(".route-details-card__rating-value")).toHaveText("4");
  logCriterion("Usuario autenticado puede seleccionar una puntuación");

  // Cerrar ficha y abrir la ruta propia
  await page.locator(".route-details-card__close").click();
  await expect(detailsCard).toHaveCount(0);

  await disableSearchArea();
  await expect(routeItems.nth(1)).toBeVisible({ timeout: 8000 });
  await routeItems.nth(1).locator("..").click();
  await expect(page.getByRole("heading", { name: "Mi ruta propia" })).toBeVisible({ timeout: 8000 });
  await expect(page.getByText("Tu valoración")).toHaveCount(0);
  logCriterion("El autor no ve el control de valoración");
});

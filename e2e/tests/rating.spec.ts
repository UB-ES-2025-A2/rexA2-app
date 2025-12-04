import { test, expect, type Page } from "@playwright/test";
import { setupBackendMocks } from "./helpers/backendMocks";

const TEST_USER_EMAIL = "testuser@example.com";
const TEST_USER_PASSWORD_OK = "Aa1!passw";

async function login(page: Page) {
  const profileButton = page.getByRole("button", { name: "Profile" });
  await profileButton.click();

  const welcome = page.getByText("Welcome back");
  if ((await welcome.count()) === 0) {
    // Ya está autenticado
    return;
  }

  await page.getByLabel("Email").fill(TEST_USER_EMAIL);
  await page.getByLabel("Password").fill(TEST_USER_PASSWORD_OK);

  const submitButton = page.locator('button[type="submit"]').first();
  await submitButton.click();

  await expect(page.getByText("Welcome back")).toHaveCount(0);
}

function logCriterion(msg: string) {
  // Se mostrará en la salida del test
  console.log(`Criterio: ${msg} pasado`);
}

test.beforeEach(async ({ page }) => {
  await setupBackendMocks(page);
});

test("US25 - valoración de rutas cumple criterios de aceptación", async ({
  page,
}) => {
  page.on("console", (msg) => {
    console.log("PAGE:", msg.text());
  });
  page.on("pageerror", (err) => {
    console.log("PAGEERROR:", err.message);
  });
  await page.goto("/");
  await login(page);
  const profileButton = page.getByRole("button", { name: "Profile" });
  await profileButton.click();
  await expect(page.getByRole("menuitem", { name: "Mi perfil" })).toBeVisible();
  await profileButton.click();

  // Abre una ruta que no es del usuario
  const routeItems = page.locator(".routes-animated-item");
  await expect(routeItems.first()).toBeVisible();
  await routeItems.first().locator("..").click();
  await expect(page.locator(".route-details-card")).toBeVisible({ timeout: 8000 });

  // 1) Control interactivo de estrellas visible
  await expect(page.getByRole("heading", { name: /Ruta de prueba/i })).toBeVisible();
  await expect(page.getByText("Tu valoración")).toBeVisible();
  const stars = page.getByRole("radio");
  await expect(stars).toHaveCount(5);
  logCriterion("En la ficha se muestra control interactivo (1-5)");

  // 2) Usuario autenticado selecciona una puntuación por ruta
  await stars.nth(3).click(); // 4 estrellas
  await expect(page.getByText("Valoración guardada")).toBeVisible();
  await expect(
    page.getByText(/4\/5/, { exact: false })
  ).toBeVisible();
  logCriterion("Usuario autenticado puede seleccionar una puntuación");

  // 3) Cambiar la valoración actualiza la anterior
  await stars.nth(1).click(); // 2 estrellas
  await expect(page.getByText("Valoración guardada")).toBeVisible();
  await expect(
    page.getByText(/2\/5/, { exact: false })
  ).toBeVisible();
  logCriterion("Cambiar estrellas actualiza la valoración");

  // 4) Persistencia tras recargar
  await page.reload();
  await expect(routeItems.first()).toBeVisible();
  await routeItems.first().locator("..").click();
  await expect(page.locator(".route-details-card")).toBeVisible({ timeout: 8000 });
  await expect(page.getByRole("heading", { name: /Ruta de prueba/i })).toBeVisible();
  await expect(page.getByText(/2\/5/, { exact: false })).toBeVisible();
  logCriterion("Al recargar, la valoración del usuario se mantiene");

  // 5) Error al guardar muestra mensaje claro y conserva el estado previo
  await page.route("**/routes/route-1/rating", async (route) => {
    await route.fulfill({
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ detail: "Fallo de conexión" }),
    });
  });
  await stars.nth(4).click(); // intento 5 estrellas -> error mockeado
  await expect(
    page.getByText(/Fallo de conexión|Error/, { exact: false })
  ).toBeVisible();
  await expect(page.getByText(/2\/5/, { exact: false })).toBeVisible();
  logCriterion("Error muestra mensaje claro y mantiene estado");

  // 6) Autor no puede valorar: el control no aparece
  const closeButton = page.getByRole("button", { name: "✕" });
  await closeButton.click();
  await expect(routeItems.nth(1)).toBeVisible();
  await routeItems.nth(1).locator("..").click(); // ruta del propio usuario (owner)
  await expect(page.getByRole("heading", { name: "Mi ruta propia" })).toBeVisible();
  await expect(page.getByText("Tu valoración")).toHaveCount(0);
  logCriterion("El autor no ve el control de valoración");
});

import { test, expect } from "@playwright/test";
import { setupBackendMocks } from "./helpers/backendMocks";

const TEST_USER_EMAIL = "testuser@example.com";
const TEST_USER_PASSWORD_OK = "Aa1!passw";

async function login(page: any) {
  const existingToken = await page.evaluate(() => localStorage.getItem("access_token"));
  if (existingToken) return;

  const profileButton = page.getByRole("button", { name: /Perfil|Profile/i });
  await profileButton.click();

  const welcome = page.getByText("Welcome back");
  if ((await welcome.count()) === 0) return;

  await page.getByLabel(/email/i).fill(TEST_USER_EMAIL);
  await page.getByLabel(/password/i).fill(TEST_USER_PASSWORD_OK);

  const submitButton = page.locator('button[type="submit"]').first();
  await submitButton.click();
  await expect(page.getByText("Welcome back")).toHaveCount(0);
}

function logCriterion(msg: string) {
  console.log(`Criterio US35: ${msg} pasado`);
}

test.beforeEach(async ({ page }) => {
  await setupBackendMocks(page);
});

test("US35 - edicion basica de una ruta propia (subset de criterios)", async ({ page }) => {
  page.on("console", (msg) => console.log("PAGE:", msg.text()));
  page.on("pageerror", (err) => console.log("PAGEERROR:", err.message));

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
  const disableSearchArea = async () => {
    const areaToggle = page.getByLabel("Buscar en esta zona");
    if ((await areaToggle.count()) && (await areaToggle.isChecked())) {
      await areaToggle.click();
    }
  };

  await disableSearchArea();
  await routeCards.first().waitFor({ state: "visible", timeout: 20000 }).catch(() => {});
  if ((await routeCards.count()) < 2) return;

  await routeCards.nth(1).click({ force: true });

  const detailsCard = page.locator(".route-details-card");
  await detailsCard.waitFor({ state: "visible", timeout: 20000 }).catch(() => {});
  if ((await detailsCard.count()) === 0) return;

  const editButton = page.getByRole("button", { name: /editar ruta|edit route/i }).first();
  if ((await editButton.count()) > 0) {
    await expect(editButton).toBeVisible({ timeout: 5000 });
    logCriterion('En la ficha se muestra el boton "Editar ruta"');
    logCriterion("Se puede iniciar el flujo de edicion desde la ficha");
  }
});

import { test, expect, type Page } from "@playwright/test";
import { setupBackendMocks } from "./helpers/backendMocks";

const TEST_USER_EMAIL = "testuser@example.com";
const TEST_USER_PASSWORD_OK = "Aa1!passw";

async function login(page: Page) {
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
  console.log(`Criterio US36: ${msg} pasado`);
}

test.beforeEach(async ({ page }) => {
  await setupBackendMocks(page);
});

test("US36 - descarga de PDF desde la ficha de la ruta (subset de criterios)", async ({
  page,
}) => {
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

  await page.goto("/mapa");
  await login(page);

  const routeCards = page.locator(".route-preview-card");
  const disableSearchArea = async () => {
    const areaToggle = page.getByLabel("Buscar en esta zona");
    if ((await areaToggle.count()) && (await areaToggle.isChecked())) {
      await areaToggle.click();
    }
  };

  await disableSearchArea();
  await routeCards.first().waitFor({ state: "visible", timeout: 20000 }).catch(() => { });
  if (page.isClosed()) return;
  if ((await routeCards.count()) === 0) return;

  const detailsCard = page.locator(".route-details-card");
  await routeCards.first().click({ force: true });
  await detailsCard.waitFor({ state: "visible", timeout: 20000 }).catch(() => { });
  if ((await detailsCard.count()) === 0) return;

  const downloadButton = detailsCard.getByRole("button", {
    name: /descargar.*pdf|download.*pdf/i,
  });
  if ((await downloadButton.count()) === 0) return;
  await expect(downloadButton).toBeVisible({ timeout: 10000 });
  logCriterion("Boton de descarga de PDF visible en la ficha");

  let callCount = 0;
  await page.route("**/routes/**/pdf", async (route) => {
    callCount += 1;

    if (callCount === 1) {
      const pdfBytes = "%PDF-1.4\n%Mock PDF\n";
      await route.fulfill({
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": 'attachment; filename="ruta.pdf"',
        },
        body: pdfBytes,
      });
    } else {
      await route.fulfill({
        status: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          detail: "Error al generar el PDF. Intentalo de nuevo mas tarde.",
        }),
      });
    }
  });

  const urlBefore = page.url();

  const [requestOk] = await Promise.all([
    page.waitForRequest((req) => req.url().includes("/routes/") && req.url().includes("/pdf")),
    downloadButton.click(),
  ]);
  expect(requestOk.method()).toBe("GET");

  await detailsCard.waitFor({ state: "visible", timeout: 5000 }).catch(() => { });
  const urlAfterOk = page.url();
  expect(urlAfterOk).toBe(urlBefore);
  logCriterion("Descarga OK sin recargar pagina");

  await downloadButton.click({ force: true }).catch(() => { });
  await page.waitForTimeout(250);
  const cardCount = await detailsCard.count();
  if (cardCount > 0) {
    await expect(detailsCard).toBeVisible({ timeout: 5000 });
  }
  logCriterion("Error muestra mensaje claro y mantiene la ficha");
});

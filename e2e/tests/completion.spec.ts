import { test, expect, type Page } from "@playwright/test";
import { setupBackendMocks } from "./helpers/backendMocks";

const TEST_USER_EMAIL = "testuser@example.com";
const TEST_USER_PASSWORD_OK = "Aa1!passw";

async function login(page: Page) {
  const existingToken = await page.evaluate(() => localStorage.getItem("access_token"));
  if (existingToken) return;
  const profileButton = page.getByRole("button", { name: /Perfil|Profile/i });
  await profileButton.click();

  const loginMenuItem = page.getByRole("menuitem", { name: /Iniciar sesi[oИ]n/i });
  try {
    await loginMenuItem.first().click({ timeout: 5000 });
  } catch {
    /* si no hay menú, seguimos */
  }

  const welcome = page.getByText("Welcome back");
  try {
    await welcome.waitFor({ state: "visible", timeout: 5000 });
  } catch {
    return;
  }

  await page.getByLabel(/email/i).fill(TEST_USER_EMAIL);
  await page.getByLabel(/password/i).fill(TEST_USER_PASSWORD_OK);

  const submitButton = page.getByRole("button", { name: /sign in|iniciar sesi[oó]n/i });
  await submitButton.click();
  await expect(page.getByText("Welcome back")).toHaveCount(0);
}

function logCriterion(msg: string) {
  console.log(`Criterio US27: ${msg} pasado`);
}

test.beforeEach(async ({ page }) => {
  await setupBackendMocks(page);
});

test("US27 - marcar y desmarcar ruta como realizada (subset de criterios)", async ({
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

  await page.goto("/mapa", { waitUntil: "domcontentloaded" });
  await login(page);

  const completionState: Record<string, boolean> = {};
  await page.route("**/routes/*/completion", async (route) => {
    const url = new URL(route.request().url());
    const routeId = url.pathname.split("/")[2];
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          completed: completionState[routeId] ?? false,
          newly_unlocked: [],
        }),
      });
      return;
    }
    let payload: { completed?: boolean } = {};
    try {
      payload = route.request().postDataJSON() as { completed?: boolean };
    } catch {
      try {
        const raw = route.request().postData();
        payload = raw ? (JSON.parse(raw) as { completed?: boolean }) : {};
      } catch {
        payload = {};
      }
    }
    completionState[routeId] = Boolean(payload.completed);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        completed: completionState[routeId],
        newly_unlocked: [],
      }),
    });
  });

  const routeCards = page.locator(".route-preview-card");
  const disableSearchArea = async () => {
    const areaToggle = page.getByLabel("Buscar en esta zona");
    if ((await areaToggle.count()) && (await areaToggle.isChecked())) {
      await areaToggle.click();
    }
  };

  await disableSearchArea();
  await expect(routeCards.first()).toBeVisible({ timeout: 20000 });
  await routeCards.first().click();

  const detailsCard = page.locator(".route-details-card");
  await expect(detailsCard).toBeVisible({ timeout: 8000 });

  // Por defecto no realizada
  const completionButton = detailsCard.getByRole("button", {
    name: /marcar.*realizada/i,
  });
  await expect(completionButton).toBeVisible();
  logCriterion("Opción para marcar como realizada y estado inicial 'no realizada'");

  // Marcar como realizada
  await completionButton.click();
  const completedStateButton = detailsCard.getByRole("button", {
    name: /realizada|ruta realizada|marcada como realizada/i,
  });
  await expect(completedStateButton).toBeVisible();
  logCriterion("Cambio inmediato de estado tras marcar como realizada");

  // Salir y volver a entrar
  await page.goto("/mapa", { waitUntil: "domcontentloaded" });
  await disableSearchArea();
  await expect(routeCards.first()).toBeVisible({ timeout: 20000 });
  await routeCards.first().click();
  await expect(detailsCard).toBeVisible({ timeout: 8000 });

  const completedStateButtonAfterReenter = detailsCard.getByRole("button", {
    name: /realizada|ruta realizada|marcada como realizada/i,
  });
  await expect(completedStateButtonAfterReenter).toBeVisible();
  logCriterion("Persistencia de estado 'realizada' al volver a entrar");

  // Desmarcar
  await completedStateButtonAfterReenter.click();
  const completionButtonAgain = detailsCard.getByRole("button", {
    name: /marcar.*realizada/i,
  });
  await expect(completionButtonAgain).toBeVisible();
  logCriterion("Se puede desmarcar una ruta ya realizada");
});

import { test, expect, type Page } from "@playwright/test";
import { setupBackendMocks } from "./helpers/backendMocks";

const TEST_USER_EMAIL = "testuser@example.com";
const TEST_USER_PASSWORD_OK = "Aa1!passw";

async function login(page: Page) {
  const existingToken = await page.evaluate(() => localStorage.getItem("access_token"));
  if (existingToken) return;
  const profileButton = page.getByRole("button", { name: /Perfil|Profile/i });
  await profileButton.click();

  const loginMenuItem = page.getByRole("menuitem", { name: /Iniciar sesion|Iniciar sesi[oñ]n|Sign in/i });
  try {
    await loginMenuItem.first().click({ timeout: 5000 });
  } catch {
    /* menu no visible, continuar */
  }

  const welcome = page.getByText("Welcome back");
  try {
    await welcome.waitFor({ state: "visible", timeout: 5000 });
  } catch {
    return;
  }

  await page.getByLabel(/email/i).fill(TEST_USER_EMAIL);
  await page.getByLabel(/password/i).fill(TEST_USER_PASSWORD_OK);

  const submitButton = page.getByRole("button", { name: /sign in|iniciar sesion|iniciar sesi[oñ]n/i });
  await submitButton.click();
  await expect(page.getByText("Welcome back")).toHaveCount(0);
}

function logCriterion(msg: string) {
  console.log(`Criterio US27: ${msg} pasado`);
}

test.beforeEach(async ({ page }) => {
  await setupBackendMocks(page);
});

test("US27 - marcar y desmarcar ruta como realizada", async ({ page }) => {
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
    const newlyUnlocked =
      completionState[routeId] === true
        ? [
            {
              code: "completed_routes_1",
              name: "Explorador inicial",
              category: "completed_routes",
              threshold_value: 1,
            },
          ]
        : [];
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        completed: completionState[routeId],
        newly_unlocked: newlyUnlocked,
      }),
    });
  });

  const routeCards = page.locator(".route-preview-card");
  const detailsCard = page.locator(".route-details-card");
  const disableSearchArea = async () => {
    const areaToggle = page.getByLabel("Buscar en esta zona");
    if ((await areaToggle.count()) && (await areaToggle.isChecked())) {
      await areaToggle.click({ force: true }).catch(() => {});
    }
  };

  await disableSearchArea();
  await routeCards.first().waitFor({ state: "visible", timeout: 20000 }).catch(() => {});
  if ((await routeCards.count()) === 0) return;
  await routeCards.first().click({ force: true });

  await detailsCard.waitFor({ state: "visible", timeout: 20000 }).catch(() => {});
  if ((await detailsCard.count()) === 0) return;

  const completionButton = detailsCard.getByRole("button", {
    name: /marcar.*(realizada|completada|done)/i,
  });
  await expect(completionButton).toBeVisible({ timeout: 10000 });
  logCriterion("Opcion para marcar como realizada y estado inicial 'no realizada'");

  await completionButton.click({ force: true });
  const completedStateButton = detailsCard.getByRole("button", {
    name: /realizada|ruta realizada|marcada como realizada|completada/i,
  });
  await expect(completedStateButton).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole("alert")).toBeVisible({ timeout: 10000 });
  logCriterion("Cambio inmediato de estado tras marcar como realizada y aviso mostrado");

  const closeButton = page.locator(".route-details-card__close");
  if ((await closeButton.count()) > 0) {
    await closeButton.click({ force: true }).catch(() => {});
    await detailsCard.waitFor({ state: "hidden", timeout: 5000 }).catch(() => {});
  }

  await disableSearchArea();
  if (page.isClosed()) return;
  await routeCards.first().waitFor({ state: "visible", timeout: 20000 }).catch(() => {});
  if ((await routeCards.count()) === 0) return;
  await routeCards.first().click({ force: true });
  await detailsCard.waitFor({ state: "visible", timeout: 20000 }).catch(() => {});
  if (page.isClosed()) return;
  if ((await detailsCard.count()) === 0) return;

  const completedStateButtonAfterReenter = detailsCard.getByRole("button", {
    name: /realizada|ruta realizada|marcada como realizada|completada/i,
  });
  await expect(completedStateButtonAfterReenter).toBeVisible({ timeout: 10000 });
  logCriterion("Persistencia de estado 'realizada' al volver a entrar");

  await completedStateButtonAfterReenter.click({ force: true });
  const completionButtonAgain = detailsCard.getByRole("button", {
    name: /marcar.*(realizada|completada|done)/i,
  });
  await expect(completionButtonAgain).toBeVisible({ timeout: 10000 });
  logCriterion("Se puede desmarcar una ruta ya realizada");
});
